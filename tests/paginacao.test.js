import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calcularSkip, montarPaginacao } from '../src/utils/paginacao.js';

describe('paginação', () => {
  it('calcula o skip', () => {
    assert.equal(calcularSkip(1, 50), 0);
    assert.equal(calcularSkip(3, 20), 40);
  });

  it('monta metadados', () => {
    assert.deepEqual(montarPaginacao({ pagina: 1, limite: 50, total: 10 }), {
      pagina: 1, limite: 50, total: 10, totalPaginas: 1,
    });
    assert.equal(montarPaginacao({ pagina: 1, limite: 20, total: 41 }).totalPaginas, 3);
    assert.equal(montarPaginacao({ pagina: 1, limite: 20, total: 0 }).totalPaginas, 0);
  });
});
