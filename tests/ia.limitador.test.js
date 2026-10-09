import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { criarLimitadorDeConcorrencia } from '../src/utils/limitadorDeConcorrencia.js';

const pausa = () => { let liberar; const promessa = new Promise((r) => { liberar = r; }); return { promessa, liberar }; };

describe('limitador de concorrência', () => {
  it('executa a tarefa e devolve o valor', async () => {
    const l = criarLimitadorDeConcorrencia(1);
    assert.deepEqual(await l.tentar(async () => 42), { ocupado: false, valor: 42 });
    assert.equal(l.emAndamento, 0);
  });

  it('acima do limite NÃO enfileira: devolve ocupado na hora', async () => {
    const l = criarLimitadorDeConcorrencia(2);
    const a = pausa(); const b = pausa();
    const p1 = l.tentar(() => a.promessa);
    const p2 = l.tentar(() => b.promessa);
    assert.equal(l.emAndamento, 2);

    let executou = false;
    const terceira = await l.tentar(async () => { executou = true; });
    assert.deepEqual(terceira, { ocupado: true });
    assert.equal(executou, false);

    a.liberar('A'); b.liberar('B');
    assert.equal((await p1).valor, 'A');
    assert.equal((await p2).valor, 'B');
    assert.equal(l.emAndamento, 0);
    assert.equal((await l.tentar(async () => 'de novo')).ocupado, false); // vaga liberada
  });

  it('libera a vaga mesmo quando a tarefa lança erro', async () => {
    const l = criarLimitadorDeConcorrencia(1);
    await assert.rejects(l.tentar(async () => { throw new Error('falhou'); }), /falhou/);
    assert.equal(l.emAndamento, 0);
  });
});
