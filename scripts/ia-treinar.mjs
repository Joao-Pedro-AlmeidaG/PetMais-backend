#!/usr/bin/env node
/**
 * "Treina" (especializa) o assistente do PetMais no Ollama:
 *   1. gera ia/Modelfile a partir de ia/Modelfile.template + ia/dataset/petmais-faq.jsonl
 *   2. baixa o modelo base (ollama pull)
 *   3. cria o modelo personalizado (ollama create petmais-assistente -f ia/Modelfile)
 *
 * Uso:  npm run ia:treinar [-- --base llama3.2:3b --nome petmais-assistente --exemplos 10]
 *       npm run ia:treinar -- --dry-run          (só gera o Modelfile, sem chamar o Ollama)
 *       npm run ia:dataset                        (exporta ia/dataset/treino-lora.jsonl para fine-tuning)
 */
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  lerDatasetJsonl, extrairSystem, gerarModelfile, exportarDatasetTreino, validarNomeDeModelo,
} from './lib/modelfile.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CAMINHOS = {
  template: path.join(RAIZ, 'ia', 'Modelfile.template'),
  dataset: path.join(RAIZ, 'ia', 'dataset', 'petmais-faq.jsonl'),
  modelfile: path.join(RAIZ, 'ia', 'Modelfile'),
  treinoLora: path.join(RAIZ, 'ia', 'dataset', 'treino-lora.jsonl'),
};

const MODELO_BASE_PADRAO = 'llama3.2:3b';

// Usa o mesmo .env do backend para o nome do modelo bater com OLLAMA_MODEL.
const envPath = path.join(RAIZ, '.env');
if (existsSync(envPath)) process.loadEnvFile(envPath);

function lerArgumentos(argv) {
  const args = { dryRun: false, exportarTreino: false, ajuda: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--exportar-treino') args.exportarTreino = true;
    else if (arg === '--ajuda' || arg === '--help' || arg === '-h') args.ajuda = true;
    else if (['--base', '--nome', '--exemplos'].includes(arg)) {
      if (argv[i + 1] === undefined) throw new Error(`O argumento ${arg} precisa de um valor.`);
      args[arg.slice(2)] = argv[(i += 1)];
    } else throw new Error(`Argumento desconhecido: ${arg} (use --ajuda).`);
  }
  return args;
}

function executar(comando, argumentos) {
  return new Promise((resolve, reject) => {
    const processo = spawn(comando, argumentos, { stdio: 'inherit', cwd: RAIZ });
    processo.on('error', reject);
    processo.on('close', resolve);
  });
}

const AJUDA = `
Uso: npm run ia:treinar [-- opções]

  --base <modelo>     Modelo base do Ollama (padrão: ${MODELO_BASE_PADRAO}, ou OLLAMA_BASE_MODEL do .env)
  --nome <nome>       Nome do modelo criado (padrão: OLLAMA_MODEL do .env, ou petmais-assistente)
  --exemplos <n>      Quantos exemplos do dataset vão no Modelfile (padrão: 10)
  --dry-run           Só gera ia/Modelfile; não chama o Ollama
  --exportar-treino   Gera ia/dataset/treino-lora.jsonl (para fine-tuning LoRA) e sai
`;

async function principal() {
  const args = lerArgumentos(process.argv.slice(2));
  if (args.ajuda) return console.log(AJUDA);

  const base = validarNomeDeModelo(args.base ?? process.env.OLLAMA_BASE_MODEL ?? MODELO_BASE_PADRAO, 'modelo base');
  const nome = validarNomeDeModelo(args.nome ?? process.env.OLLAMA_MODEL ?? 'petmais-assistente', 'modelo');
  const maxExemplos = args.exemplos === undefined ? 10 : Number.parseInt(args.exemplos, 10);
  if (!Number.isInteger(maxExemplos) || maxExemplos < 0 || maxExemplos > 50) {
    throw new Error('--exemplos deve ser um número inteiro entre 0 e 50.');
  }

  const template = await readFile(CAMINHOS.template, 'utf8');
  const registros = lerDatasetJsonl(await readFile(CAMINHOS.dataset, 'utf8'));

  if (args.exportarTreino) {
    await writeFile(CAMINHOS.treinoLora, exportarDatasetTreino({ system: extrairSystem(template), registros }), 'utf8');
    console.log(`Dataset de fine-tuning gravado em ia/dataset/treino-lora.jsonl (${registros.length} conversas, com o SYSTEM no início).`);
    return undefined;
  }

  const modelfile = gerarModelfile({ template, baseModel: base, registros, maxExemplos });
  await writeFile(CAMINHOS.modelfile, modelfile, 'utf8');
  console.log(`Modelfile gerado: ia/Modelfile (base: ${base}, ${maxExemplos} exemplos, ${registros.length} no dataset).`);

  if (args.dryRun) {
    console.log('--dry-run: o Ollama não foi chamado.');
    return undefined;
  }

  try {
    console.log(`\n> ollama pull ${base}`);
    if ((await executar('ollama', ['pull', base])) !== 0) throw new Error(`Falha ao baixar o modelo base "${base}".`);

    console.log(`\n> ollama create ${nome} -f ia/Modelfile`);
    if ((await executar('ollama', ['create', nome, '-f', CAMINHOS.modelfile])) !== 0) {
      throw new Error('O "ollama create" falhou. Veja a mensagem acima.');
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error('Comando "ollama" não encontrado. Instale em https://ollama.com/download, abra um NOVO terminal e rode de novo.');
    }
    throw err;
  }

  console.log(`\nPronto! Modelo "${nome}" criado.`);
  console.log(`  Teste no terminal:   ollama run ${nome}`);
  console.log('  Use no backend:      OLLAMA_MODEL=' + nome + ' no .env, depois npm run dev');
  console.log('  Confira o status:    GET /api/assistente/status');
  return undefined;
}

principal().catch((err) => {
  console.error(`\nErro: ${err.message}`);
  process.exit(1);
});
