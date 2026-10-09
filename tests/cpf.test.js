import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cpfValido, limparCpf, mascararCpf } from '../src/utils/cpf.js';

describe('cpf', () => {
  it('aceita CPFs válidos, com ou sem máscara', () => {
    for (const cpf of ['52998224725', '529.982.247-25', '11144477735', '123.456.789-09']) {
      assert.equal(cpfValido(cpf), true, cpf);
    }
  });

  it('rejeita dígito verificador errado', () => {
    assert.equal(cpfValido('52998224724'), false);
    assert.equal(cpfValido('52998224715'), false);
  });

  it('rejeita todos os dígitos iguais (passam no módulo 11, mas são inválidos)', () => {
    for (let d = 0; d <= 9; d += 1) assert.equal(cpfValido(String(d).repeat(11)), false);
  });

  it('rejeita tamanho errado, vazio e valores não-string', () => {
    for (const v of ['', '123', '5299822472', '529982247250', null, undefined, 'abc']) {
      assert.equal(cpfValido(v), false, String(v));
    }
  });

  it('limparCpf mantém só dígitos', () => {
    assert.equal(limparCpf('529.982.247-25'), '52998224725');
    assert.equal(limparCpf(null), '');
  });

  it('mascararCpf oculta 3 primeiros e 2 últimos dígitos', () => {
    assert.equal(mascararCpf('52998224725'), '***.982.247-**');
    assert.equal(mascararCpf('529.982.247-25'), '***.982.247-**');
    assert.equal(mascararCpf('123'), null);
  });
});
