import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { emPromocao, precoEfetivo } from '../src/utils/preco.js';

describe('preço efetivo (regra do app: promoção só vale se for menor)', () => {
  it('promoção válida', () => {
    const p = { precoAtual: 189.9, precoPromocional: 159.9 };
    assert.equal(emPromocao(p), true);
    assert.equal(precoEfetivo(p), 159.9);
  });

  it('sem promoção (null ou undefined)', () => {
    for (const precoPromocional of [null, undefined]) {
      const p = { precoAtual: 149.9, precoPromocional };
      assert.equal(emPromocao(p), false);
      assert.equal(precoEfetivo(p), 149.9);
    }
  });

  it('promocional igual ou maior que o atual é ignorado', () => {
    assert.equal(precoEfetivo({ precoAtual: 10, precoPromocional: 10 }), 10);
    assert.equal(precoEfetivo({ precoAtual: 10, precoPromocional: 12 }), 10);
  });

  it('promocional zero é uma promoção válida (brinde)', () => {
    assert.equal(precoEfetivo({ precoAtual: 10, precoPromocional: 0 }), 0);
  });
});
