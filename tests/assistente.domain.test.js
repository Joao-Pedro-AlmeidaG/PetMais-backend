import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  INTENCOES,
  identificarIntencao,
  montarResposta,
  ehRacaoParaFilhote,
  formatarMoeda,
} from '../src/domain/assistente.js';

describe('assistente: identificarIntencao', () => {
  it('reconhece as 3 perguntas sugeridas do app', () => {
    assert.equal(identificarIntencao('Qual ração é indicada para filhotes?'), INTENCOES.RACAO_FILHOTE);
    assert.equal(identificarIntencao('Quais produtos estão em promoção hoje?'), INTENCOES.PROMOCOES);
    assert.equal(identificarIntencao('Como finalizo meu pedido?'), INTENCOES.FINALIZAR_PEDIDO);
  });

  it('ignora acentos, maiúsculas e espaços repetidos', () => {
    assert.equal(identificarIntencao('PROMOÇÕES'), INTENCOES.PROMOCOES);
    assert.equal(identificarIntencao('  como    compro?  '), INTENCOES.FINALIZAR_PEDIDO);
    assert.equal(identificarIntencao('Como faço o pedido?'), INTENCOES.FINALIZAR_PEDIDO);
  });

  it('demais intenções', () => {
    assert.equal(identificarIntencao('posso pagar com pix?'), INTENCOES.PAGAMENTO);
    assert.equal(identificarIntencao('aceita cartão?'), INTENCOES.PAGAMENTO);
    assert.equal(identificarIntencao('como remover do carrinho'), INTENCOES.CARRINHO);
    assert.equal(identificarIntencao('quero criar conta'), INTENCOES.CADASTRO);
    assert.equal(identificarIntencao('meu cadastro falhou'), INTENCOES.CADASTRO);
    assert.equal(identificarIntencao('por que meu CPF é inválido?'), INTENCOES.CPF);
    assert.equal(identificarIntencao('Obrigado!'), INTENCOES.AGRADECIMENTO);
    assert.equal(identificarIntencao('valeu'), INTENCOES.AGRADECIMENTO);
  });

  it('saudações', () => {
    for (const m of ['Oi', 'oi!', 'Olá', 'bom dia', 'Boa tarde!', 'boa noite']) {
      assert.equal(identificarIntencao(m), INTENCOES.SAUDACAO, m);
    }
  });

  it('palavras curtas exigem a palavra inteira ("oi" não casa dentro de "coisa")', () => {
    assert.equal(identificarIntencao('tem coisa nova?'), null);
    assert.equal(identificarIntencao('quero uma cola'), null);
    assert.equal(identificarIntencao('qual o melhor pixel'), null);
  });

  it('a primeira regra que casar vence (mesma ordem do app)', () => {
    assert.equal(identificarIntencao('quero ração em promoção'), INTENCOES.RACAO_FILHOTE);
  });

  it('sem correspondência -> null; entradas estranhas não quebram', () => {
    assert.equal(identificarIntencao('qual a capital da França?'), null);
    assert.equal(identificarIntencao(''), null);
    assert.equal(identificarIntencao(undefined), null);
  });
});

describe('assistente: montarResposta', () => {
  const promos = [
    { nome: 'Ração Golden Filhotes 15kg', precoAtual: 189.9, precoPromocional: 159.9 },
    { nome: 'Bolinha de Borracha Kong', precoAtual: 39.9, precoPromocional: 29.9 },
  ];

  it('lista promoções com preço de/por vindos do catálogo', () => {
    const r = montarResposta(INTENCOES.PROMOCOES, { produtosEmPromocao: promos });
    assert.ok(r.startsWith('Estas são as promoções de hoje:\n'));
    assert.ok(r.includes(`• Ração Golden Filhotes 15kg: de ${formatarMoeda(189.9)} por ${formatarMoeda(159.9)}`));
    assert.ok(r.includes(`• Bolinha de Borracha Kong: de ${formatarMoeda(39.9)} por ${formatarMoeda(29.9)}`));
  });

  it('sem promoções cadastradas', () => {
    assert.equal(
      montarResposta(INTENCOES.PROMOCOES, { produtosEmPromocao: [] }),
      'No momento não há produtos em promoção. Volte para conferir mais tarde!'
    );
    assert.equal(
      montarResposta(INTENCOES.PROMOCOES),
      'No momento não há produtos em promoção. Volte para conferir mais tarde!'
    );
  });

  it('ração para filhotes mostra o preço que o cliente paga (promocional quando houver)', () => {
    const r = montarResposta(INTENCOES.RACAO_FILHOTE, { racoesFilhote: [promos[0]] });
    assert.ok(r.startsWith('Para filhotes, recomendo:\n'));
    assert.ok(r.includes(`• Ração Golden Filhotes 15kg — ${formatarMoeda(159.9)}`));
    assert.ok(!r.includes(formatarMoeda(189.9)));
    assert.ok(r.endsWith('ideal para essa fase de crescimento.'));
  });

  it('ração para filhotes sem itens no catálogo dá orientação genérica', () => {
    assert.match(montarResposta(INTENCOES.RACAO_FILHOTE, { racoesFilhote: [] }), /Recomendo escolher uma ração/);
  });

  it('respostas fixas e fallback têm o mesmo texto do app', () => {
    assert.equal(
      montarResposta(INTENCOES.PAGAMENTO),
      'O pagamento não é feito no aplicativo. Você monta o pedido aqui e paga no caixa da loja, no momento da retirada.'
    );
    assert.equal(
      montarResposta(INTENCOES.AGRADECIMENTO),
      'Por nada! Se precisar de mais alguma coisa, é só chamar. 🐾'
    );
    assert.equal(
      montarResposta(null),
      'Posso ajudar com dúvidas sobre rações, promoções, o carrinho ou como finalizar o pedido. Pode perguntar!'
    );
  });
});

describe('assistente: ehRacaoParaFilhote', () => {
  it('só rações que mencionam filhote no nome ou na descrição', () => {
    assert.equal(ehRacaoParaFilhote({ tipo: 'Ração', nome: 'Ração Golden Filhotes 15kg', descricao: 'x' }), true);
    assert.equal(ehRacaoParaFilhote({ tipo: 'Ração', nome: 'Ração X', descricao: 'Para cães filhotes' }), true);
    assert.equal(ehRacaoParaFilhote({ tipo: 'Ração', nome: 'Ração Premier Adulto', descricao: 'cães adultos' }), false);
    assert.equal(ehRacaoParaFilhote({ tipo: 'Brinquedo', nome: 'Bola para filhotes', descricao: 'x' }), false);
  });
});
