import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validar } from '../src/middlewares/validar.js';
import { criarTratadorDeErros, rotaNaoEncontrada } from '../src/middlewares/erros.js';
import { AppError, erros } from '../src/utils/AppError.js';
import { cadastroSchema } from '../src/schemas/auth.js';
import { listarProdutosQuery } from '../src/schemas/produtos.js';
import { idNaRota } from '../src/schemas/comum.js';

/** Executa um middleware e devolve o que foi passado ao next(). */
function rodar(middleware, req) {
  let chamadas = [];
  middleware(req, {}, (...args) => chamadas.push(args));
  assert.equal(chamadas.length, 1, 'next deve ser chamado exatamente uma vez');
  return chamadas[0][0]; // erro (ou undefined)
}

function respostaFalsa() {
  return {
    statusCode: 200,
    headers: {},
    corpo: undefined,
    headersSent: false,
    status(c) { this.statusCode = c; return this; },
    set(k, v) { this.headers[k] = v; return this; },
    json(b) { this.corpo = b; return this; },
  };
}

describe('middleware validar', () => {
  it('sucesso: coloca os dados convertidos em req.validado e chama next() sem erro', () => {
    const req = { body: { nomeCompleto: 'Ana Souza', email: 'ANA@x.com', cpf: '529.982.247-25', senha: '123456' } };
    const erro = rodar(validar({ body: cadastroSchema }), req);
    assert.equal(erro, undefined);
    assert.deepEqual(req.validado.body, { nomeCompleto: 'Ana Souza', email: 'ana@x.com', cpf: '52998224725', senha: '123456' });
  });

  it('falha: next(AppError 400) com detalhes por campo e mensagem do primeiro erro', () => {
    const req = { body: { nomeCompleto: '', email: 'abc', cpf: '1', senha: '' } };
    const erro = rodar(validar({ body: cadastroSchema }), req);
    assert.ok(erro instanceof AppError);
    assert.equal(erro.status, 400);
    assert.equal(erro.codigo, 'DADOS_INVALIDOS');
    assert.equal(erro.message, 'Informe o nome completo.');
    assert.deepEqual(erro.detalhes.map((d) => d.campo), ['nomeCompleto', 'email', 'cpf', 'senha']);
    assert.equal(req.validado, undefined, 'não deve expor dados parciais');
  });

  it('Express 5: body undefined (sem JSON) é tratado como {} e gera erros de campo obrigatório', () => {
    const erro = rodar(validar({ body: cadastroSchema }), {});
    assert.equal(erro.status, 400);
    assert.equal(erro.detalhes.length, 4);
  });

  it('valida params + query + body juntos, sem mutar req.query (somente leitura no Express 5)', () => {
    const query = Object.freeze({ pagina: '2' });
    const req = { params: { id: 'AAAAAAAAAAAAAAAAAAAAAAAA' }, query };
    const erro = rodar(validar({ params: idNaRota, query: listarProdutosQuery }), req);
    assert.equal(erro, undefined);
    assert.equal(req.validado.params.id, 'aaaaaaaaaaaaaaaaaaaaaaaa');
    assert.equal(req.validado.query.pagina, 2);
    assert.equal(req.query, query);
  });

  it('acumula erros de partes diferentes', () => {
    const erro = rodar(validar({ params: idNaRota, query: listarProdutosQuery }), { params: { id: 'x' }, query: { limite: '999' } });
    assert.deepEqual(erro.detalhes.map((d) => d.campo).sort(), ['id', 'limite']);
  });
});

describe('middleware de erros', () => {
  const silencioso = { error() {} };

  function tratar(err, req = { method: 'GET', originalUrl: '/x' }, logger = silencioso) {
    const res = respostaFalsa();
    let proximo;
    criarTratadorDeErros(logger)(err, req, res, (e) => { proximo = e; });
    return { res, proximo };
  }

  it('AppError -> status, código e MENSAGEM no corpo (regressão: usar err.message)', () => {
    const { res } = tratar(erros.conflito('CPF_JA_CADASTRADO', 'Este CPF já está cadastrado.'));
    assert.equal(res.statusCode, 409);
    assert.deepEqual(res.corpo, { codigo: 'CPF_JA_CADASTRADO', mensagem: 'Este CPF já está cadastrado.' });
  });

  it('AppError com detalhes inclui a lista', () => {
    const { res } = tratar(erros.validacao([{ campo: 'cpf', mensagem: 'Informe um CPF válido.' }]));
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.corpo, {
      codigo: 'DADOS_INVALIDOS',
      mensagem: 'Informe um CPF válido.',
      detalhes: [{ campo: 'cpf', mensagem: 'Informe um CPF válido.' }],
    });
  });

  it('401 inclui o header WWW-Authenticate', () => {
    const { res } = tratar(erros.credenciaisInvalidas());
    assert.equal(res.statusCode, 401);
    assert.equal(res.headers['WWW-Authenticate'], 'Bearer');
    assert.equal(res.corpo.mensagem, 'Login ou senha inválidos.');
  });

  it('JSON malformado -> 400 JSON_INVALIDO; corpo grande -> 413', () => {
    let { res } = tratar(Object.assign(new SyntaxError('x'), { type: 'entity.parse.failed' }));
    assert.equal(res.statusCode, 400);
    assert.equal(res.corpo.codigo, 'JSON_INVALIDO');
    ({ res } = tratar(Object.assign(new Error('x'), { type: 'entity.too.large' })));
    assert.equal(res.statusCode, 413);
  });

  it('erros do Mongoose: CastError -> 400, ValidationError -> 400 com campos, duplicidade -> 409', () => {
    let { res } = tratar(Object.assign(new Error('x'), { name: 'CastError' }));
    assert.equal(res.statusCode, 400);
    ({ res } = tratar(Object.assign(new Error('x'), { name: 'ValidationError', errors: { nome: { path: 'nome', message: 'Informe o nome.' } } })));
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.corpo.detalhes, [{ campo: 'nome', mensagem: 'Informe o nome.' }]);
    ({ res } = tratar(Object.assign(new Error('E11000 duplicate key'), { code: 11000 })));
    assert.equal(res.statusCode, 409);
    assert.equal(res.corpo.codigo, 'REGISTRO_DUPLICADO');
  });

  it('erro desconhecido -> 500 genérico, SEM vazar a mensagem interna, e registra no log', () => {
    const logs = [];
    const { res } = tratar(new Error('senha do banco: segredo123'), { method: 'POST', originalUrl: '/api/x' }, { error: (...a) => logs.push(a) });
    assert.equal(res.statusCode, 500);
    assert.equal(res.corpo.codigo, 'ERRO_INTERNO');
    assert.equal(JSON.stringify(res.corpo).includes('segredo123'), false);
    assert.equal(logs.length, 1);
  });

  it('erros 4xx não poluem o log', () => {
    const logs = [];
    tratar(erros.naoEncontrado('X', 'y'), undefined, { error: (...a) => logs.push(a) });
    assert.equal(logs.length, 0);
  });

  it('se a resposta já começou, delega ao Express', () => {
    const res = respostaFalsa();
    res.headersSent = true;
    let proximo;
    const err = new Error('tarde demais');
    criarTratadorDeErros(silencioso)(err, {}, res, (e) => { proximo = e; });
    assert.equal(proximo, err);
  });

  it('rotaNaoEncontrada gera 404 ROTA_NAO_ENCONTRADA', () => {
    const erro = rodar(rotaNaoEncontrada, {});
    assert.equal(erro.status, 404);
    assert.equal(erro.codigo, 'ROTA_NAO_ENCONTRADA');
  });
});
