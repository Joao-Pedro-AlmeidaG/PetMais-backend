import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { criarClienteOllama, IaIndisponivelError } from '../src/services/ia/ollamaClient.js';

/** Servidor HTTP local que imita o Ollama. `handler(req, res, json)` decide a resposta. */
async function iniciarOllamaFalso(handler) {
  const requisicoes = [];
  const servidor = http.createServer(async (req, res) => {
    let corpo = '';
    for await (const pedaco of req) corpo += pedaco;
    const json = corpo ? JSON.parse(corpo) : null;
    requisicoes.push({ metodo: req.method, url: req.url, headers: req.headers, json });
    await handler(req, res, json);
  });
  await new Promise((resolve) => servidor.listen(0, '127.0.0.1', resolve));
  return {
    requisicoes,
    url: `http://127.0.0.1:${servidor.address().port}`,
    fechar: () => new Promise((resolve) => { servidor.closeAllConnections(); servidor.close(resolve); }),
  };
}

const responderJson = (res, status, corpo) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(typeof corpo === 'string' ? corpo : JSON.stringify(corpo));
};

const abertos = [];
const subir = async (handler) => { const s = await iniciarOllamaFalso(handler); abertos.push(s); return s; };
after(async () => { await Promise.all(abertos.map((s) => s.fechar())); });

const MENSAGENS = [{ role: 'user', content: 'Oi' }];

async function motivoDoErro(promessa) {
  try { await promessa; } catch (err) {
    assert.ok(err instanceof IaIndisponivelError, `esperava IaIndisponivelError, veio ${err?.name}: ${err?.message}`);
    return err;
  }
  assert.fail('era esperado lançar IaIndisponivelError');
}

describe('cliente Ollama: conversar', () => {
  it('envia o payload correto (stream:false, keep_alive, options) e devolve o texto', async () => {
    const ollama = await subir((_req, res) => responderJson(res, 200, {
      model: 'petmais-assistente', done: true, message: { role: 'assistant', content: 'Olá! Como posso ajudar?' },
    }));
    const cliente = criarClienteOllama({ baseUrl: ollama.url, modelo: 'petmais-assistente', timeoutMs: 5000 });

    assert.equal(await cliente.conversar(MENSAGENS), 'Olá! Como posso ajudar?');

    const [req] = ollama.requisicoes;
    assert.equal(req.metodo, 'POST');
    assert.equal(req.url, '/api/chat');
    assert.equal(req.headers['content-type'], 'application/json');
    assert.equal(req.json.model, 'petmais-assistente');
    assert.deepEqual(req.json.messages, MENSAGENS);
    assert.equal(req.json.stream, false);
    assert.equal(req.json.keep_alive, '30m');
    assert.deepEqual(req.json.options, { temperature: 0.3, num_ctx: 4096, num_predict: 300 });
  });

  it('opções do construtor e da chamada sobrescrevem os padrões', async () => {
    const ollama = await subir((_req, res) => responderJson(res, 200, { message: { content: 'ok' } }));
    const cliente = criarClienteOllama({ baseUrl: ollama.url, modelo: 'm', timeoutMs: 5000, opcoes: { num_predict: 100 } });
    await cliente.conversar(MENSAGENS, { temperature: 0 });
    assert.deepEqual(ollama.requisicoes[0].json.options, { temperature: 0, num_ctx: 4096, num_predict: 100 });
  });

  it('modelo inexistente (404) -> motivo "modelo", com a mensagem do Ollama', async () => {
    const ollama = await subir((_req, res) => responderJson(res, 404, { error: 'model "x" not found, try pulling it first' }));
    const cliente = criarClienteOllama({ baseUrl: ollama.url, modelo: 'x', timeoutMs: 5000 });
    const err = await motivoDoErro(cliente.conversar(MENSAGENS));
    assert.equal(err.motivo, 'modelo');
    assert.match(err.message, /not found/);
  });

  it('erro 500 -> motivo "servidor"', async () => {
    const ollama = await subir((_req, res) => responderJson(res, 500, { error: 'boom' }));
    const cliente = criarClienteOllama({ baseUrl: ollama.url, modelo: 'm', timeoutMs: 5000 });
    assert.equal((await motivoDoErro(cliente.conversar(MENSAGENS))).motivo, 'servidor');
  });

  it('resposta vazia -> motivo "resposta_vazia"', async () => {
    const ollama = await subir((_req, res) => responderJson(res, 200, { message: { role: 'assistant', content: '   ' } }));
    const cliente = criarClienteOllama({ baseUrl: ollama.url, modelo: 'm', timeoutMs: 5000 });
    assert.equal((await motivoDoErro(cliente.conversar(MENSAGENS))).motivo, 'resposta_vazia');
  });

  it('corpo que não é JSON -> motivo "resposta"', async () => {
    const ollama = await subir((_req, res) => responderJson(res, 200, 'isto não é json'));
    const cliente = criarClienteOllama({ baseUrl: ollama.url, modelo: 'm', timeoutMs: 5000 });
    assert.equal((await motivoDoErro(cliente.conversar(MENSAGENS))).motivo, 'resposta');
  });

  it('demora além do limite -> motivo "timeout"', async () => {
    const ollama = await subir(async (_req, res) => {
      await new Promise((r) => setTimeout(r, 600));
      if (!res.destroyed) responderJson(res, 200, { message: { content: 'tarde demais' } });
    });
    const cliente = criarClienteOllama({ baseUrl: ollama.url, modelo: 'm', timeoutMs: 100 });
    const inicio = Date.now();
    assert.equal((await motivoDoErro(cliente.conversar(MENSAGENS))).motivo, 'timeout');
    assert.ok(Date.now() - inicio < 500, 'deve desistir no limite, sem esperar o servidor');
  });

  it('Ollama desligado (conexão recusada) -> motivo "conexao"', async () => {
    const ollama = await iniciarOllamaFalso((_req, res) => res.end());
    const url = ollama.url;
    await ollama.fechar(); // agora a porta está fechada
    const cliente = criarClienteOllama({ baseUrl: url, modelo: 'm', timeoutMs: 2000 });
    const err = await motivoDoErro(cliente.conversar(MENSAGENS));
    assert.equal(err.motivo, 'conexao');
    assert.match(err.message, /ECONNREFUSED/);
  });
});

describe('cliente Ollama: status', () => {
  it('modelo instalado (com ou sem ":latest")', async () => {
    const ollama = await subir((_req, res) => responderJson(res, 200, { models: [{ name: 'llama3.2:3b' }, { name: 'petmais-assistente:latest' }] }));
    assert.deepEqual(
      await criarClienteOllama({ baseUrl: ollama.url, modelo: 'petmais-assistente', timeoutMs: 1000 }).status(),
      { disponivel: true, modeloInstalado: true }
    );
    assert.equal((await criarClienteOllama({ baseUrl: ollama.url, modelo: 'llama3.2:3b', timeoutMs: 1000 }).status()).modeloInstalado, true);
    assert.equal(ollama.requisicoes[0].url, '/api/tags');
  });

  it('Ollama no ar mas sem o modelo', async () => {
    const ollama = await subir((_req, res) => responderJson(res, 200, { models: [{ name: 'llama3.2:3b' }] }));
    assert.deepEqual(
      await criarClienteOllama({ baseUrl: ollama.url, modelo: 'petmais-assistente', timeoutMs: 1000 }).status(),
      { disponivel: true, modeloInstalado: false }
    );
  });

  it('nunca lança: servidor fora do ar ou com erro vira { disponivel: false }', async () => {
    const ollama = await subir((_req, res) => responderJson(res, 500, {}));
    assert.deepEqual(
      await criarClienteOllama({ baseUrl: ollama.url, modelo: 'm', timeoutMs: 1000 }).status(),
      { disponivel: false, motivo: 'servidor' }
    );

    const morto = await iniciarOllamaFalso((_req, res) => res.end());
    const url = morto.url;
    await morto.fechar();
    assert.deepEqual(
      await criarClienteOllama({ baseUrl: url, modelo: 'm', timeoutMs: 1000 }).status(),
      { disponivel: false, motivo: 'conexao' }
    );
  });
});
