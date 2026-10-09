import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  radical, extrairTermos, pontuarProduto, selecionarProdutosParaContexto,
  formatarProdutoParaPrompt, formatarCatalogo, dataBR,
} from '../src/domain/ia/catalogo.js';

const oid = (n) => ({ toString: () => String(n).padStart(24, '0') });
const produto = (n, nome, tipo, precoAtual, precoPromocional, descricao, dataValidade = '2027-04-10') =>
  ({ _id: oid(n), nome, tipo, precoAtual, precoPromocional, descricao, dataValidade });

const golden = produto(1, 'Ração Golden Filhotes 15kg', 'Ração', 189.9, 159.9, 'Ração completa para cães filhotes de raças médias');
const premier = produto(2, 'Ração Premier Adulto 10kg', 'Ração', 149.9, null, 'Para cães adultos');
const bolinha = produto(3, 'Bolinha de Borracha Kong', 'Brinquedo', 39.9, 29.9, 'Brinquedo resistente');

describe('catálogo para a IA: termos', () => {
  it('radical em português', () => {
    assert.equal(radical('racoes'), 'racao');
    assert.equal(radical('caes'), 'cao');
    assert.equal(radical('filhotes'), 'filhote');
    assert.equal(radical('brinquedos'), 'brinquedo');
    assert.equal(radical('gas'), 'gas'); // curta demais para cortar
    assert.equal(radical('racao'), 'racao');
  });

  it('extrairTermos ignora acento, palavras vazias e repetições', () => {
    assert.deepEqual(extrairTermos('Qual ração é boa para filhotes de cães?'), ['racao', 'filhote', 'cao']);
    assert.deepEqual(extrairTermos('ração RAÇÃO rações'), ['racao']);
    assert.deepEqual(extrairTermos('quero o que tem hoje'), []);
  });

  it('pontuarProduto: nome/tipo pesam mais que a descrição', () => {
    assert.equal(pontuarProduto(golden, ['racao']), 3);
    assert.equal(pontuarProduto(golden, ['cao']), 1); // só na descrição ("cães")
    assert.equal(pontuarProduto(golden, ['racao', 'filhote', 'cao']), 3 + 3 + 1);
    assert.equal(pontuarProduto(bolinha, ['racao']), 0);
  });
});

describe('catálogo para a IA: seleção (RAG)', () => {
  it('catálogo pequeno vai inteiro (permite "o que dá pra comprar com R$ 50?")', () => {
    const lista = [golden, premier, bolinha];
    assert.deepEqual(selecionarProdutosParaContexto('qualquer coisa', lista), lista);
  });

  // 40 produtos: 5 rações, 5 brinquedos (1 em promoção), 30 acessórios
  const grande = [
    ...Array.from({ length: 5 }, (_, i) => produto(100 + i, `Ração Marca ${i}`, 'Ração', 100, null, 'Ração para pets')),
    ...Array.from({ length: 5 }, (_, i) => produto(200 + i, `Brinquedo ${i}`, 'Brinquedo', 20, i === 0 ? 15 : null, 'Diversão')),
    ...Array.from({ length: 30 }, (_, i) => produto(300 + i, `Acessório ${i}`, 'Acessório', 30, null, 'Item útil')),
  ];

  it('catálogo grande: os mais relevantes primeiro, limitado, sem repetir', () => {
    const r = selecionarProdutosParaContexto('Quais brinquedos vocês têm?', grande);
    assert.equal(r.length, 15);
    assert.deepEqual(r.slice(0, 5).map((p) => p.tipo), Array(5).fill('Brinquedo'));
    assert.equal(new Set(r.map((p) => String(p._id))).size, 15);
  });

  it('sem correspondência: promoções primeiro e depois o início do catálogo', () => {
    const r = selecionarProdutosParaContexto('zzz', grande);
    assert.equal(r.length, 15);
    assert.equal(String(r[0]._id), String(grande[5]._id)); // o único em promoção
    assert.equal(String(r[1]._id), String(grande[0]._id)); // depois a ordem do catálogo
  });

  it('respeita limites informados', () => {
    assert.equal(selecionarProdutosParaContexto('racao', grande, { limite: 3 }).length, 3);
    assert.equal(selecionarProdutosParaContexto('x', grande, { limiteCompleto: 100 }).length, 40);
  });
});

describe('catálogo para a IA: formatação', () => {
  it('produto em promoção mostra preço promocional e o anterior', () => {
    assert.equal(
      formatarProdutoParaPrompt(golden),
      '- Ração Golden Filhotes 15kg | Ração | R$ 159,90 (promoção; preço anterior R$ 189,90) | validade 10/04/2027 | Ração completa para cães filhotes de raças médias'
    );
  });

  it('produto sem promoção mostra só o preço', () => {
    const linha = formatarProdutoParaPrompt(premier);
    assert.ok(linha.includes('| R$ 149,90 |'));
    assert.ok(!linha.includes('promoção'));
  });

  it('não usa espaço não separável (NBSP) e trunca descrição longa', () => {
    const longo = produto(9, 'X', 'Y', 10, null, 'a'.repeat(500));
    const linha = formatarProdutoParaPrompt(longo);
    assert.equal(linha.includes('\u00a0'), false);
    assert.ok(linha.length < 200);
    assert.ok(linha.endsWith('…'));
  });

  it('formatarCatalogo: uma linha por produto; vazio vira aviso', () => {
    assert.equal(formatarCatalogo([golden, premier]).split('\n').length, 2);
    assert.equal(formatarCatalogo([]), '(nenhum produto cadastrado no momento)');
  });

  it('dataBR aceita string ou Date, sem deslocar por fuso', () => {
    assert.equal(dataBR('2027-04-10'), '10/04/2027');
    assert.equal(dataBR(new Date('2026-12-05T00:00:00.000Z')), '05/12/2026');
  });
});
