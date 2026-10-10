import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarTexto, escaparRegex } from '../src/utils/texto.js';

describe('texto', () => {
  it('normaliza acentos e maiúsculas (igual à busca do app)', () => {
    assert.equal(normalizarTexto('Ração Golden Filhotes'), 'racao golden filhotes');
    assert.equal(normalizarTexto('Acessório'), 'acessorio');
    assert.equal(normalizarTexto('PROMOÇÃO'), 'promocao');
  });

  it('tolera null/undefined', () => {
    assert.equal(normalizarTexto(null), '');
    assert.equal(normalizarTexto(undefined), '');
  });

  it('escaparRegex neutraliza metacaracteres: a busca é literal', () => {
    const re = new RegExp(escaparRegex('15kg (.*)'));
    assert.equal(re.test('golden 15kg (.*)'), true);
    assert.equal(re.test('golden 15kg xyz'), false);
    // entrada maliciosa clássica de ReDoS vira texto comum
    assert.doesNotThrow(() => new RegExp(escaparRegex('(a+)+$')));
  });
});
