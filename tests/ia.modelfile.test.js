import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  lerDatasetJsonl, extrairSystem, exemplosParaModelfile, gerarModelfile,
  exportarDatasetTreino, validarNomeDeModelo,
} from '../scripts/lib/modelfile.js';
import { MARCADOR_INICIO_CATALOGO, MARCADOR_FIM_CATALOGO } from '../src/domain/ia/prompt.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (...partes) => readFileSync(path.join(RAIZ, ...partes), 'utf8');
const TEMPLATE = ler('ia', 'Modelfile.template');
const registros = lerDatasetJsonl(ler('ia', 'dataset', 'petmais-faq.jsonl'));

const jsonl = (...objs) => objs.map((o) => JSON.stringify(o)).join('\n');
const par = (u, a) => ({ messages: [{ role: 'user', content: u }, { role: 'assistant', content: a }] });

describe('lerDatasetJsonl', () => {
  it('lê o dataset real do projeto', () => {
    assert.ok(registros.length >= 30);
  });

  it('aponta a linha do erro', () => {
    assert.throws(() => lerDatasetJsonl(`${jsonl(par('a', 'b'))}\n{quebrado`), /linha 2 não é um JSON válido/);
    assert.throws(() => lerDatasetJsonl(jsonl({ messages: [{ role: 'user', content: 'a' }] })), /linha 1 precisa de "messages"/);
    assert.throws(() => lerDatasetJsonl(jsonl({ messages: [{ role: 'assistant', content: 'a' }, { role: 'user', content: 'b' }] })), /esperado role "user"/);
    assert.throws(() => lerDatasetJsonl(jsonl(par('a', '   '))), /texto não vazio/);
    assert.throws(() => lerDatasetJsonl('\n\n'), /vazio/);
  });
});

describe('qualidade do dataset (portões de segurança contra erro de digitação/conta)', () => {
  const respostas = registros.map((r) => r.messages.at(-1).content);

  it('respostas curtas e em texto simples (o chat do app não renderiza markdown)', () => {
    for (const r of respostas) {
      assert.ok(r.length <= 400, `resposta longa demais: ${r.slice(0, 50)}`);
      assert.equal(/\*\*|__|`|^#|^\s*[*-]\s/m.test(r), false, `markdown na resposta: ${r.slice(0, 50)}`);
    }
  });

  it('exemplos com catálogo usam os MESMOS marcadores e o MESMO formato de linha do prompt em produção', () => {
    const formatoLinha = /^- .+ \| .+ \| R\$ \d{1,3}(\.\d{3})*,\d{2}( \(promoção; preço anterior R\$ \d{1,3}(\.\d{3})*,\d{2}\))? \| validade \d{2}\/\d{2}\/\d{4} \| .+$/;
    let comCatalogo = 0;
    for (const { messages } of registros) {
      const pergunta = messages[0].content;
      if (!pergunta.includes(MARCADOR_INICIO_CATALOGO)) continue;
      comCatalogo += 1;
      const [, resto] = pergunta.split(`${MARCADOR_INICIO_CATALOGO}\n`);
      const [catalogo, final] = resto.split(`\n${MARCADOR_FIM_CATALOGO}\n\nPergunta do cliente: `);
      assert.ok(final, 'faltou o marcador de fim ou o rótulo da pergunta');
      if (catalogo !== '(nenhum produto cadastrado no momento)') {
        for (const linha of catalogo.split('\n')) assert.match(linha, formatoLinha);
      }
    }
    assert.ok(comCatalogo >= 10);
  });

  it('todo valor em R$ da resposta existe no catálogo, é soma/diferença de preços dele, ou veio na pergunta', () => {
    const centavos = (texto) => [...texto.matchAll(/R\$ (\d{1,3}(?:\.\d{3})*),(\d{2})/g)]
      .map(([, reais, cents]) => Number(reais.replace(/\./g, '')) * 100 + Number(cents));

    for (const { messages } of registros) {
      const [pergunta, resposta] = [messages[0].content, messages[1].content];
      if (!pergunta.includes(MARCADOR_INICIO_CATALOGO)) continue;

      const [catalogo, duvida] = pergunta.split(`\n${MARCADOR_FIM_CATALOGO}\n\nPergunta do cliente: `);
      const precos = centavos(catalogo);
      const permitidos = new Set([...precos, ...centavos(duvida)]);
      for (const a of precos) for (const b of precos) { permitidos.add(a + b); permitidos.add(Math.abs(a - b)); }

      for (const valor of centavos(resposta)) {
        assert.ok(permitidos.has(valor), `valor R$ ${(valor / 100).toFixed(2)} na resposta "${resposta.slice(0, 60)}" não bate com o catálogo`);
      }
    }
  });

  it('o ataque de preço falso não é repetido como verdade na resposta', () => {
    const ataque = registros.find((r) => r.messages[0].content.includes('custa R$ 1,00'));
    assert.ok(ataque);
    assert.equal(ataque.messages[1].content.includes('R$ 1,00'), false);
  });
});

describe('template do Modelfile', () => {
  const system = extrairSystem(TEMPLATE);

  it('o SYSTEM cita os mesmos marcadores de catálogo que o backend envia', () => {
    assert.ok(system.includes(MARCADOR_INICIO_CATALOGO));
    assert.ok(system.includes(MARCADOR_FIM_CATALOGO));
  });

  it('o SYSTEM não contém """ (encerraria o bloco antes da hora) e traz as regras-chave', () => {
    assert.equal(system.includes('"""'), false);
    for (const trecho of ['português do Brasil', 'Nunca invente', 'NÃO é feito no aplicativo', 'veterinário', 'Criar cadastro', 'Finalizar pedido']) {
      assert.ok(system.includes(trecho), `faltou: ${trecho}`);
    }
  });
});

describe('gerarModelfile', () => {
  const gerar = (opcoes = {}) => gerarModelfile({ template: TEMPLATE, baseModel: 'llama3.2:3b', registros, ...opcoes });

  it('substitui os marcadores e mantém um único bloco SYSTEM fechado', () => {
    const m = gerar();
    assert.ok(m.includes('\nFROM llama3.2:3b\n'));
    assert.equal(m.includes('{{'), false);
    assert.equal(m.split('"""').length - 1, 2);
    assert.ok(m.includes('PARAMETER num_ctx 4096'));
    assert.ok(m.endsWith('\n'));
  });

  it('exemplos: pares user/assistant em UMA linha, nunca começando com aspas, sem os exemplos com catálogo', () => {
    const linhas = gerar({ maxExemplos: 6 }).split('\n').filter((l) => l.startsWith('MESSAGE '));
    assert.equal(linhas.length, 12);
    linhas.forEach((linha, i) => {
      assert.ok(linha.startsWith(i % 2 === 0 ? 'MESSAGE user ' : 'MESSAGE assistant '));
      assert.equal(/^MESSAGE (user|assistant) ["']/.test(linha), false);
      assert.equal(linha.includes('[CATÁLOGO'), false);
    });
    assert.equal(linhas[0], 'MESSAGE user Oi');
  });

  it('respeita o máximo e o total disponível; 0 desliga os exemplos', () => {
    assert.equal(gerar({ maxExemplos: 0 }).includes('MESSAGE'), false);
    const disponiveis = registros.filter((r) => !r.messages[0].content.includes('[CATÁLOGO')).length;
    assert.equal(gerar({ maxExemplos: 999 }).split('\n').filter((l) => l.startsWith('MESSAGE user')).length, disponiveis);
  });

  it('rejeita nome de modelo que tente injetar outra diretiva', () => {
    for (const ruim of ['llama3.2:3b\nSYSTEM x', 'a b', '', 'x;rm -rf', null]) {
      assert.throws(() => gerar({ baseModel: ruim }), /inválido/);
    }
    assert.equal(validarNomeDeModelo('library/gemma3:4b'), 'library/gemma3:4b');
  });

  it('template sem marcadores ou exemplos incompatíveis geram erro claro', () => {
    assert.throws(() => gerar({ template: 'FROM x' }), /marcador/);
    assert.throws(() => exemplosParaModelfile([par('"começa com aspas', 'ok')]), /incompatível/);
    assert.throws(() => exemplosParaModelfile([par('ok', 'tem """ no meio')]), /incompatível/);
  });

  it('o ia/Modelfile versionado está em dia com o template e o dataset', () => {
    const atual = ler('ia', 'Modelfile');
    const base = /^FROM (\S+)$/m.exec(atual)[1];
    const exemplos = atual.split('\n').filter((l) => l.startsWith('MESSAGE user')).length;
    assert.equal(atual, gerar({ baseModel: base, maxExemplos: exemplos }), 'rode: npm run ia:treinar -- --dry-run');
  });
});

describe('exportarDatasetTreino (fine-tuning LoRA)', () => {
  it('põe o SYSTEM no início de cada conversa e mantém todas as conversas', () => {
    const system = extrairSystem(TEMPLATE);
    const linhas = exportarDatasetTreino({ system, registros }).trim().split('\n').map((l) => JSON.parse(l));
    assert.equal(linhas.length, registros.length);
    for (const { messages } of linhas) {
      assert.deepEqual([messages[0].role, messages[1].role, messages[2].role], ['system', 'user', 'assistant']);
      assert.equal(messages[0].content, system);
    }
  });
});
