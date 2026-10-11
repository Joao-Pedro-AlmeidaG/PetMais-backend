import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { montarLinhasDoPedido, STATUS_PEDIDO } from '../src/domain/pedido.js';
import { AppError } from '../src/utils/AppError.js';

// _id como objeto (igual ao ObjectId do Mongoose, que só vira string via toString)
const oid = (hex) => ({ toString: () => hex });
const ID = {
  golden: 'aaaaaaaaaaaaaaaaaaaaaaaa',
  premier: 'bbbbbbbbbbbbbbbbbbbbbbbb',
  whiskas: 'cccccccccccccccccccccccc',
};
const produtos = [
  { _id: oid(ID.golden), nome: 'Ração Golden Filhotes 15kg', precoAtual: 189.9, precoPromocional: 159.9 },
  { _id: oid(ID.premier), nome: 'Ração Premier Adulto 10kg', precoAtual: 149.9, precoPromocional: null },
  { _id: oid(ID.whiskas), nome: 'Ração Whiskas Peixe 3kg', precoAtual: 59.9, precoPromocional: 49.9 },
];

describe('montarLinhasDoPedido', () => {
  it('usa o preço efetivo do cadastro (promoção quando houver) e soma o total em centavos', () => {
    const { linhas, total } = montarLinhasDoPedido(
      [{ produtoId: ID.golden }, { produtoId: ID.premier }, { produtoId: ID.whiskas }],
      produtos
    );
    assert.deepEqual(
      linhas.map((l) => [l.nomeProduto, l.preco]),
      [['Ração Golden Filhotes 15kg', 159.9], ['Ração Premier Adulto 10kg', 149.9], ['Ração Whiskas Peixe 3kg', 49.9]]
    );
    assert.equal(total, 359.7);
  });

  it('o mesmo produto duas vezes gera duas linhas (uma Compra por item, como no carrinho do app)', () => {
    const { linhas, total } = montarLinhasDoPedido([{ produtoId: ID.whiskas }, { produtoId: ID.whiskas }], produtos);
    assert.equal(linhas.length, 2);
    assert.equal(total, 99.8);
  });

  it('o total não sofre erro de ponto flutuante (3x Golden em promoção)', () => {
    const itens = [{ produtoId: ID.golden }, { produtoId: ID.golden }, { produtoId: ID.golden }];
    const { total } = montarLinhasDoPedido(itens, produtos);
    assert.notEqual(159.9 + 159.9 + 159.9, 479.7); // a soma ingênua erraria (479.70000000000005)
    assert.equal(total, 479.7);
  });

  it('preserva a ordem do carrinho', () => {
    const { linhas } = montarLinhasDoPedido([{ produtoId: ID.whiskas }, { produtoId: ID.golden }], produtos);
    assert.deepEqual(linhas.map((l) => l.produtoId), [ID.whiskas, ID.golden]);
  });

  it('ids em maiúsculas casam com os do banco', () => {
    const { linhas } = montarLinhasDoPedido([{ produtoId: ID.golden.toUpperCase() }], produtos);
    assert.equal(linhas.length, 1);
  });

  it('produto inexistente/inativo -> 422 PRODUTO_INDISPONIVEL e nada é montado', () => {
    const fantasma = 'ffffffffffffffffffffffff';
    assert.throws(
      () => montarLinhasDoPedido([{ produtoId: ID.golden }, { produtoId: fantasma }], produtos),
      (err) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.status, 422);
        assert.equal(err.codigo, 'PRODUTO_INDISPONIVEL');
        assert.deepEqual(err.detalhes.map((d) => d.mensagem), [`Produto ${fantasma} indisponível.`]);
        return true;
      }
    );
  });

  it('lista cada id indisponível uma única vez', () => {
    const f1 = 'f1f1f1f1f1f1f1f1f1f1f1f1';
    const f2 = 'f2f2f2f2f2f2f2f2f2f2f2f2';
    assert.throws(
      () => montarLinhasDoPedido([{ produtoId: f1 }, { produtoId: f1 }, { produtoId: f2 }], produtos),
      (err) => err.detalhes.length === 2 && /Alguns produtos/.test(err.message)
    );
  });

  it('expõe os status do pedido', () => {
    assert.equal(STATUS_PEDIDO.AGUARDANDO_RETIRADA, 'AGUARDANDO_RETIRADA');
  });
});
