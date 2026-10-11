import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { cadastroSchema, loginSchema } from '../src/schemas/auth.js';
import { listarProdutosQuery } from '../src/schemas/produtos.js';
import { criarPedidoSchema } from '../src/schemas/pedidos.js';
import { idNaRota, paginacaoQuery } from '../src/schemas/comum.js';
import '../src/schemas/mensagens.js';

/** Primeira mensagem de cada campo, igual ao que o middleware `validar` devolve. */
function erros(schema, dados) {
  const r = schema.safeParse(dados);
  assert.equal(r.success, false, 'era esperado falhar');
  const porCampo = {};
  for (const issue of r.error.issues) {
    const campo = issue.path.join('.');
    if (!(campo in porCampo)) porCampo[campo] = issue.message;
  }
  return porCampo;
}

describe('cadastroSchema', () => {
  const valido = {
    nomeCompleto: '  Ana Beatriz Souza ',
    email: ' Ana.Souza@PetMais.com ',
    cpf: '529.982.247-25',
    senha: '123456',
  };

  it('normaliza: trim, e-mail em minúsculas, CPF só com dígitos, descarta campos extras', () => {
    const r = cadastroSchema.parse({ ...valido, repetirSenha: '123456', admin: true });
    assert.deepEqual(r, {
      nomeCompleto: 'Ana Beatriz Souza',
      email: 'ana.souza@petmais.com',
      cpf: '52998224725',
      senha: '123456',
    });
  });

  it('campos ausentes -> mensagens do app', () => {
    assert.deepEqual(erros(cadastroSchema, {}), {
      nomeCompleto: 'Informe o nome completo.',
      email: 'Informe o e-mail.',
      cpf: 'Informe o CPF.',
      senha: 'Informe a senha.',
    });
  });

  it('campos vazios -> a primeira regra declarada vence', () => {
    assert.deepEqual(erros(cadastroSchema, { nomeCompleto: '   ', email: '', cpf: '', senha: '' }), {
      nomeCompleto: 'Informe o nome completo.',
      email: 'Informe o e-mail.',
      cpf: 'Informe o CPF.',
      senha: 'Informe a senha.',
    });
  });

  it('nome curto, e-mail e CPF inválidos, senha curta', () => {
    assert.deepEqual(erros(cadastroSchema, { nomeCompleto: 'A', email: 'abc', cpf: '111.111.111-11', senha: '123' }), {
      nomeCompleto: 'O nome deve ter no mínimo 2 caracteres.',
      email: 'Informe um e-mail válido.',
      cpf: 'Informe um CPF válido.',
      senha: 'A senha deve ter no mínimo 6 caracteres.',
    });
    assert.equal(erros(cadastroSchema, { ...valido, email: 'a@b.c' }).email, 'Informe um e-mail válido.');
  });

  it('senha: limite de 72 BYTES do bcrypt (acentos pesam 2 bytes)', () => {
    assert.equal(cadastroSchema.safeParse({ ...valido, senha: 'ç'.repeat(36) }).success, true); // 72 bytes
    assert.match(erros(cadastroSchema, { ...valido, senha: 'ç'.repeat(37) }).senha, /longa demais/); // 74 bytes
    assert.match(erros(cadastroSchema, { ...valido, senha: 'a'.repeat(73) }).senha, /longa demais/);
  });

  it('tipos errados não passam (inclusive objetos de NoSQL injection)', () => {
    assert.equal(erros(cadastroSchema, { ...valido, senha: 123456 }).senha, 'Informe a senha.');
    assert.equal(erros(cadastroSchema, { ...valido, email: { $gt: '' } }).email, 'Informe o e-mail.');
  });

  it('corpo que não é objeto -> mensagem genérica em português', () => {
    assert.equal(erros(cadastroSchema, [])[''], 'Corpo da requisição inválido.');
  });
});

describe('loginSchema', () => {
  it('normaliza o login e mantém a senha intacta (espaços fazem parte da senha)', () => {
    assert.deepEqual(loginSchema.parse({ login: '  ANA@PetMais.com ', senha: ' 123456 ' }), {
      login: 'ana@petmais.com',
      senha: ' 123456 ',
    });
  });

  it('exige login e senha', () => {
    assert.deepEqual(erros(loginSchema, {}), { login: 'Informe o login.', senha: 'Informe a senha.' });
  });

  it('bloqueia injeção de operador do MongoDB no login', () => {
    assert.equal(erros(loginSchema, { login: { $ne: null }, senha: { $ne: null } }).login, 'Informe o login.');
  });
});

describe('listarProdutosQuery', () => {
  it('padrões: página 1, 50 por página, sem filtro de promoção', () => {
    const r = listarProdutosQuery.parse({});
    assert.equal(r.pagina, 1);
    assert.equal(r.limite, 50);
    assert.equal(r.promocao, false);
    assert.equal(r.busca, undefined);
  });

  it('converte strings da query', () => {
    const r = listarProdutosQuery.parse({ busca: '  ração ', tipo: 'Brinquedo', promocao: 'true', pagina: '2', limite: '10' });
    assert.deepEqual({ ...r }, { busca: 'ração', tipo: 'Brinquedo', promocao: true, pagina: 2, limite: 10 });
  });

  it('rejeita valores inválidos', () => {
    assert.equal(erros(listarProdutosQuery, { limite: '101' }).limite, 'O limite máximo é 100.');
    assert.equal(erros(listarProdutosQuery, { pagina: '0' }).pagina, 'Página inválida.');
    assert.equal(erros(listarProdutosQuery, { pagina: 'abc' }).pagina, 'Página inválida.');
    assert.equal(erros(listarProdutosQuery, { pagina: '1.5' }).pagina, 'Página inválida.');
    assert.match(erros(listarProdutosQuery, { promocao: 'sim' }).promocao, /true ou false/);
    // ?busca=a&busca=b chega como array
    assert.equal(erros(listarProdutosQuery, { busca: ['a', 'b'] }).busca, 'Valor com formato inválido.');
  });
});

describe('criarPedidoSchema', () => {
  const ID = 'AAAAAAAAAAAAAAAAAAAAAAAA';

  it('normaliza ids e descarta preço enviado pelo cliente', () => {
    const r = criarPedidoSchema.parse({ itens: [{ produtoId: ID, preco: 0.01 }, { produtoId: ID }] });
    assert.deepEqual(r.itens, [{ produtoId: ID.toLowerCase() }, { produtoId: ID.toLowerCase() }]);
  });

  it('carrinho vazio, ausente ou grande demais', () => {
    assert.equal(erros(criarPedidoSchema, { itens: [] }).itens, 'O carrinho está vazio.');
    assert.equal(erros(criarPedidoSchema, {}).itens, 'Informe os itens do pedido.');
    assert.equal(erros(criarPedidoSchema, { itens: 'x' }).itens, 'Informe os itens do pedido.');
    const muitos = Array.from({ length: 51 }, () => ({ produtoId: ID }));
    assert.equal(erros(criarPedidoSchema, { itens: muitos }).itens, 'Um pedido pode ter no máximo 50 itens.');
  });

  it('id inválido aponta o item exato', () => {
    assert.deepEqual(erros(criarPedidoSchema, { itens: [{ produtoId: ID }, { produtoId: '123' }] }), {
      'itens.1.produtoId': 'Produto inválido.',
    });
    assert.equal(erros(criarPedidoSchema, { itens: ['abc'] })['itens.0'], 'Item inválido.');
  });
});

describe('idNaRota e paginacaoQuery', () => {
  it('idNaRota aceita ObjectId e normaliza', () => {
    assert.equal(idNaRota.parse({ id: 'ABCDEF012345678901234567' }).id, 'abcdef012345678901234567');
    assert.equal(erros(idNaRota, { id: '1' }).id, 'Identificador inválido.');
  });

  it('paginacaoQuery usa 20 por página', () => {
    assert.equal(paginacaoQuery.parse({}).limite, 20);
  });
});

describe('mensagens padrão em português', () => {
  it('erros sem mensagem própria saem em português (rede de segurança)', () => {
    const msg = (schema, valor) => schema.safeParse(valor).error.issues[0].message;
    assert.equal(msg(z.object({ x: z.number() }), {}), 'Campo obrigatório.');
    assert.equal(msg(z.number(), 'a'), 'Valor com formato inválido.');
    assert.equal(msg(z.string().min(3), 'a'), 'Deve ter no mínimo 3 caracteres.');
    assert.equal(msg(z.string().max(2), 'abc'), 'Deve ter no máximo 2 caracteres.');
    assert.equal(msg(z.enum(['a', 'b']), 'c'), 'Valor não permitido.');
  });
});
