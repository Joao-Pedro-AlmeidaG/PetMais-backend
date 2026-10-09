import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { criarAssistente } from '../src/services/ia/assistenteIA.js';
import { IaIndisponivelError } from '../src/services/ia/ollamaClient.js';
import { criarLimitadorDeConcorrencia } from '../src/utils/limitadorDeConcorrencia.js';
import { formatarMoeda } from '../src/domain/assistente.js';

const oid = (n) => ({ toString: () => String(n).padStart(24, '0') });
const PRODUTOS = [
  { _id: oid(1), nome: 'Ração Golden Filhotes 15kg', tipo: 'Ração', precoAtual: 189.9, precoPromocional: 159.9, descricao: 'Ração para cães filhotes', dataValidade: '2027-04-10' },
  { _id: oid(2), nome: 'Ração Premier Adulto 10kg', tipo: 'Ração', precoAtual: 149.9, precoPromocional: null, descricao: 'Para cães adultos', dataValidade: '2027-08-01' },
];

function montar({ cliente, provedor = 'ollama', maximo = 2 } = {}) {
  const logs = { warn: [], error: [] };
  const chamadasProdutos = { n: 0 };
  const assistente = criarAssistente({
    cliente,
    limitador: criarLimitadorDeConcorrencia(maximo),
    obterProdutosAtivos: async () => { chamadasProdutos.n += 1; return PRODUTOS; },
    provedor,
    logger: { warn: (...a) => logs.warn.push(a.join(' ')), error: (...a) => logs.error.push(a.join(' ')) },
  });
  return { assistente, logs, chamadasProdutos };
}

describe('assistente com IA: caminho feliz', () => {
  it('responde pela IA, limpa o markdown e envia catálogo + pergunta + histórico', async () => {
    const recebidas = [];
    const cliente = { conversar: async (mensagens) => { recebidas.push(mensagens); return '**Olá!** A *Golden* está em promoção.'; } };
    const { assistente, chamadasProdutos } = montar({ cliente });

    const r = await assistente.responder({
      mensagem: 'Tem ração para filhotes?',
      historico: [{ papel: 'usuario', texto: 'oi' }, { papel: 'assistente', texto: 'Olá!' }],
    });

    assert.deepEqual(r, { resposta: 'Olá! A Golden está em promoção.', origem: 'ia' });
    assert.equal(chamadasProdutos.n, 1);
    assert.equal(recebidas.length, 1);
    const [h1, h2, ultima] = recebidas[0];
    assert.deepEqual([h1.role, h2.role, ultima.role], ['user', 'assistant', 'user']);
    assert.ok(ultima.content.includes('Ração Golden Filhotes 15kg | Ração | R$ 159,90 (promoção; preço anterior R$ 189,90)'));
    assert.ok(ultima.content.includes('Pergunta do cliente: Tem ração para filhotes?'));
  });
});

describe('assistente com IA: fallback para as regras (o app nunca fica sem resposta)', () => {
  const respostaDePromocoes = `Estas são as promoções de hoje:\n• Ração Golden Filhotes 15kg: de ${formatarMoeda(189.9)} por ${formatarMoeda(159.9)}`;

  it('Ollama desligado -> regras, com o catálogo real e dica no log', async () => {
    const cliente = { conversar: async () => { throw new IaIndisponivelError('conexao', 'ECONNREFUSED'); } };
    const { assistente, logs } = montar({ cliente });
    const r = await assistente.responder({ mensagem: 'Quais produtos estão em promoção hoje?' });
    assert.deepEqual(r, { resposta: respostaDePromocoes, origem: 'regras' });
    assert.equal(logs.warn.length, 1);
    assert.match(logs.warn[0], /conexao/);
    assert.match(logs.warn[0], /ollama serve/);
  });

  it('modelo não criado -> regras, com dica de rodar npm run ia:treinar', async () => {
    const cliente = { conversar: async () => { throw new IaIndisponivelError('modelo', 'model not found'); } };
    const { assistente, logs } = montar({ cliente });
    assert.equal((await assistente.responder({ mensagem: 'oi' })).origem, 'regras');
    assert.match(logs.warn[0], /npm run ia:treinar/);
  });

  it('timeout -> regras', async () => {
    const cliente = { conversar: async () => { throw new IaIndisponivelError('timeout'); } };
    const { assistente } = montar({ cliente });
    assert.equal((await assistente.responder({ mensagem: 'oi' })).origem, 'regras');
  });

  it('erro inesperado -> regras e registra como erro (não como aviso)', async () => {
    const cliente = { conversar: async () => { throw new TypeError('bug'); } };
    const { assistente, logs } = montar({ cliente });
    assert.equal((await assistente.responder({ mensagem: 'oi' })).origem, 'regras');
    assert.equal(logs.error.length, 1);
    assert.equal(logs.warn.length, 0);
  });

  it('resposta que fica vazia depois da limpeza (só <think>) -> regras', async () => {
    const cliente = { conversar: async () => '<think>pensando</think>' };
    const { assistente } = montar({ cliente });
    assert.equal((await assistente.responder({ mensagem: 'oi' })).origem, 'regras');
  });

  it('IA ocupada (limite de concorrência) -> regras na hora, sem chamar o modelo de novo', async () => {
    let liberar;
    const travada = new Promise((r) => { liberar = r; });
    let chamadas = 0;
    const cliente = { conversar: async () => { chamadas += 1; await travada; return 'resposta lenta'; } };
    const { assistente, logs } = montar({ cliente, maximo: 1 });

    const primeira = assistente.responder({ mensagem: 'pergunta 1' });
    await new Promise((r) => setImmediate(r)); // deixa a primeira entrar no limitador
    const segunda = await assistente.responder({ mensagem: 'pergunta 2' });

    assert.equal(segunda.origem, 'regras');
    assert.equal(chamadas, 1);
    assert.match(logs.warn[0], /simultâneas/);

    liberar();
    assert.deepEqual(await primeira, { resposta: 'resposta lenta', origem: 'ia' });
  });

  it('ASSISTANT_PROVIDER=regras nunca chama a IA', async () => {
    let chamadas = 0;
    const cliente = { conversar: async () => { chamadas += 1; return 'x'; } };
    const { assistente } = montar({ cliente, provedor: 'regras' });
    const r = await assistente.responder({ mensagem: 'Quais produtos estão em promoção hoje?' });
    assert.equal(r.origem, 'regras');
    assert.equal(chamadas, 0);
  });

  it('regras respondem "ração para filhotes" com o preço efetivo do catálogo', async () => {
    const cliente = { conversar: async () => { throw new IaIndisponivelError('conexao'); } };
    const { assistente } = montar({ cliente });
    const r = await assistente.responder({ mensagem: 'Qual ração é indicada para filhotes?' });
    assert.ok(r.resposta.includes(`• Ração Golden Filhotes 15kg — ${formatarMoeda(159.9)}`));
  });
});
