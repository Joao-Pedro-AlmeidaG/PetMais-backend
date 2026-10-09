/**
 * Gerador do Modelfile do Ollama a partir de:
 *   - ia/Modelfile.template  (persona + regras no SYSTEM, parâmetros)
 *   - ia/dataset/petmais-faq.jsonl  (exemplos de pergunta/resposta)
 *
 * Tudo aqui é puro (sem I/O): o script `ia-treinar.mjs` lê/escreve os arquivos e chama o Ollama.
 */

export const MARCADOR_BASE = '{{BASE_MODEL}}';
export const MARCADOR_EXEMPLOS = '{{EXEMPLOS}}';
const MARCADOR_CATALOGO = '[CATÁLOGO ATUAL DA LOJA]';

// Nomes de modelo do Ollama: letras, números e . _ : / - (ex.: llama3.2:3b, library/gemma3:4b)
const NOME_DE_MODELO = /^[a-zA-Z0-9._:/-]+$/;

export function validarNomeDeModelo(nome, rotulo = 'modelo') {
  if (typeof nome !== 'string' || !NOME_DE_MODELO.test(nome)) {
    throw new Error(`Nome de ${rotulo} inválido: "${nome}". Use letras, números e os símbolos . _ : / -`);
  }
  return nome;
}

/** Lê o .jsonl validando cada linha: { "messages": [ {role:"user"}, {role:"assistant"}, ... ] } */
export function lerDatasetJsonl(texto) {
  const registros = [];

  texto.split(/\r?\n/).forEach((linha, indice) => {
    if (!linha.trim()) return;
    const numero = indice + 1;

    let registro;
    try {
      registro = JSON.parse(linha);
    } catch {
      throw new Error(`Dataset: a linha ${numero} não é um JSON válido.`);
    }

    const mensagens = registro?.messages;
    if (!Array.isArray(mensagens) || mensagens.length < 2 || mensagens.length % 2 !== 0) {
      throw new Error(`Dataset: a linha ${numero} precisa de "messages" com pares user/assistant.`);
    }
    mensagens.forEach((mensagem, i) => {
      const esperado = i % 2 === 0 ? 'user' : 'assistant';
      if (mensagem?.role !== esperado || typeof mensagem.content !== 'string' || mensagem.content.trim() === '') {
        throw new Error(`Dataset: linha ${numero}, mensagem ${i + 1}: esperado role "${esperado}" com texto não vazio.`);
      }
    });

    registros.push(registro);
  });

  if (registros.length === 0) throw new Error('Dataset vazio.');
  return registros;
}

/** Devolve o texto do bloco SYSTEM """...""" do template. */
export function extrairSystem(template) {
  const encontrado = /SYSTEM """\n?([\s\S]*?)\n?"""/.exec(template);
  if (!encontrado) throw new Error('O template não tem um bloco SYSTEM """...""".');
  return encontrado[1].trim();
}

const colapsarEmUmaLinha = (texto) => texto.replace(/\s+/g, ' ').trim();

/**
 * Exemplos (few-shot) para o Modelfile: só conversas de 1 pergunta e 1 resposta SEM bloco de catálogo,
 * em uma única linha cada (formato mais seguro do Modelfile). Os exemplos com catálogo ficam para o fine-tuning.
 */
export function exemplosParaModelfile(registros, maximo = 10) {
  const linhas = [];
  let usados = 0;

  for (const { messages } of registros) {
    if (usados >= maximo) break;
    if (messages.length !== 2 || messages[0].content.includes(MARCADOR_CATALOGO)) continue;

    const pergunta = colapsarEmUmaLinha(messages[0].content);
    const resposta = colapsarEmUmaLinha(messages[1].content);

    for (const texto of [pergunta, resposta]) {
      // Um valor começando com aspas seria lido como string entre aspas pelo parser do Modelfile.
      if (/^["']/.test(texto) || texto.includes('"""')) {
        throw new Error(`Exemplo incompatível com o Modelfile (começa com aspas ou contém """): ${texto.slice(0, 60)}`);
      }
    }

    linhas.push(`MESSAGE user ${pergunta}`, `MESSAGE assistant ${resposta}`);
    usados += 1;
  }
  return linhas;
}

export function gerarModelfile({ template, baseModel, registros, maxExemplos = 10 }) {
  validarNomeDeModelo(baseModel, 'modelo base');
  if (!template.includes(MARCADOR_BASE)) throw new Error(`O template não tem o marcador ${MARCADOR_BASE}.`);
  if (!template.includes(MARCADOR_EXEMPLOS)) throw new Error(`O template não tem o marcador ${MARCADOR_EXEMPLOS}.`);

  const exemplos = exemplosParaModelfile(registros, maxExemplos).join('\n');
  return `${template.replace(MARCADOR_BASE, baseModel).replace(MARCADOR_EXEMPLOS, exemplos).trimEnd()}\n`;
}

/**
 * Arquivo de treino para fine-tuning LoRA (Unsloth, LLaMA-Factory, TRL...): o mesmo dataset, mas com o
 * SYSTEM do Modelfile no início de cada conversa, para treinar exatamente como o modelo será usado.
 */
export function exportarDatasetTreino({ system, registros }) {
  return `${registros
    .map(({ messages }) => JSON.stringify({ messages: [{ role: 'system', content: system }, ...messages] }))
    .join('\n')}\n`;
}
