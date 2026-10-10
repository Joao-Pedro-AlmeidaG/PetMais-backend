import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { somar, paraCentavos, deCentavos, temNoMaximoDuasCasas } from '../src/utils/dinheiro.js';

describe('dinheiro', () => {
  it('somar evita o erro de ponto flutuante que a soma ingênua tem', () => {
    assert.notEqual(159.9 + 159.9 + 159.9, 479.7); // 3x Ração Golden em promoção -> 479.70000000000005
    assert.notEqual(0.1 + 0.2, 0.3);
    assert.equal(somar([159.9, 159.9, 159.9]), 479.7);
    assert.equal(somar([0.1, 0.2]), 0.3);
  });

  it('soma o carrinho de exemplo do app', () => {
    assert.equal(somar([159.9, 49.9, 27.9, 149.9]), 387.6);
  });

  it('lista vazia soma 0', () => {
    assert.equal(somar([]), 0);
  });

  it('conversões de/para centavos', () => {
    assert.equal(paraCentavos(189.9), 18990);
    assert.equal(deCentavos(18990), 189.9);
  });

  it('temNoMaximoDuasCasas', () => {
    for (const v of [0, 10, 10.5, 189.9, 0.1 + 0.2, 209.8]) assert.equal(temNoMaximoDuasCasas(v), true, String(v));
    for (const v of [10.999, 0.001, NaN, Infinity]) assert.equal(temNoMaximoDuasCasas(v), false, String(v));
  });
});
