import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  serializarProduto,
  serializarUsuario,
  serializarCompra,
  serializarPedido,
} from '../src/utils/serializadores.js';

const oid = (hex) => ({ toString: () => hex }); // simula ObjectId

describe('serializarProduto', () => {
  const doc = {
    _id: oid('64b000000000000000000001'),
    nome: 'Ração Golden Filhotes 15kg',
    tipo: 'Ração',
    precoAtual: 189.9,
    precoPromocional: 159.9,
    descricao: 'Ração completa',
    dataValidade: new Date('2027-04-10'),
    nomeNormalizado: 'interno',
    __v: 0,
  };

  it('devolve exatamente o formato do mock do app (+ campos calculados)', () => {
    assert.deepEqual(serializarProduto(doc), {
      id: '64b000000000000000000001',
      nome: 'Ração Golden Filhotes 15kg',
      tipo: 'Ração',
      precoAtual: 189.9,
      precoPromocional: 159.9,
      descricao: 'Ração completa',
      dataValidade: '2027-04-10',
      emPromocao: true,
      precoEfetivo: 159.9,
    });
  });

  it('não vaza campos internos (_id, __v, normalizados)', () => {
    const json = serializarProduto(doc);
    for (const chave of ['_id', '__v', 'nomeNormalizado', 'tipoNormalizado', 'ativo']) {
      assert.equal(chave in json, false, chave);
    }
  });

  it('sem promoção: precoPromocional null e preço efetivo = atual', () => {
    const json = serializarProduto({ ...doc, precoPromocional: undefined });
    assert.equal(json.precoPromocional, null);
    assert.equal(json.emPromocao, false);
    assert.equal(json.precoEfetivo, 189.9);
  });

  it('dataValidade sai como YYYY-MM-DD (sem hora/fuso), igual ao mock', () => {
    assert.equal(serializarProduto({ ...doc, dataValidade: new Date('2029-01-01T00:00:00.000Z') }).dataValidade, '2029-01-01');
  });
});

describe('serializarUsuario', () => {
  it('nunca expõe senha nem CPF completo', () => {
    const json = serializarUsuario({
      _id: oid('64b0000000000000000000aa'),
      nomeCompleto: 'Ana Beatriz Souza',
      login: 'ana.souza@petmais.com',
      cpf: '52998224725',
      senha: '$2a$10$hashhashhashhash',
    });
    assert.deepEqual(json, {
      id: '64b0000000000000000000aa',
      nomeCompleto: 'Ana Beatriz Souza',
      login: 'ana.souza@petmais.com',
      cpfMascarado: '***.982.247-**',
    });
    assert.equal(JSON.stringify(json).includes('$2a$'), false);
    assert.equal(JSON.stringify(json).includes('52998224725'), false);
  });
});

describe('serializarCompra / serializarPedido', () => {
  const data = new Date('2026-10-07T12:30:00.000Z');
  const compra = (n, nome, preco) => ({
    _id: oid(`64c00000000000000000000${n}`),
    pedido: oid('64d000000000000000000001'),
    usuario: oid('64b0000000000000000000aa'),
    produto: oid(`64b00000000000000000000${n}`),
    nomeProduto: nome,
    preco,
    dataDaCompra: data,
  });

  it('compra expõe os 3 atributos do enunciado (+ ids)', () => {
    assert.deepEqual(serializarCompra(compra(1, 'Ração Whiskas Peixe 3kg', 49.9)), {
      id: '64c000000000000000000001',
      produtoId: '64b000000000000000000001',
      nomeProduto: 'Ração Whiskas Peixe 3kg',
      preco: 49.9,
      dataDaCompra: '2026-10-07T12:30:00.000Z',
    });
  });

  it('pedido traz itens e total no formato que a tela "Pedido finalizado" consome', () => {
    const json = serializarPedido(
      { _id: oid('64d000000000000000000001'), status: 'AGUARDANDO_RETIRADA', total: 209.8, dataDoPedido: data },
      [compra(1, 'Ração Golden Filhotes 15kg', 159.9), compra(2, 'Ração Whiskas Peixe 3kg', 49.9)]
    );
    assert.equal(json.id, '64d000000000000000000001');
    assert.equal(json.total, 209.8);
    assert.equal(json.status, 'AGUARDANDO_RETIRADA');
    assert.equal(json.itens.length, 2);
    assert.deepEqual(
      json.itens.map((i) => [i.nomeProduto, i.preco]),
      [['Ração Golden Filhotes 15kg', 159.9], ['Ração Whiskas Peixe 3kg', 49.9]]
    );
  });
});
