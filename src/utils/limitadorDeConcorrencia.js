export function criarLimitadorDeConcorrencia(maximo) {
  let emAndamento = 0;

  return {
    get emAndamento() {
      return emAndamento;
    },

    async tentar(tarefa) {
      if (emAndamento >= maximo) return { ocupado: true };
      emAndamento += 1;
      try {
        return { ocupado: false, valor: await tarefa() };
      } finally {
        emAndamento -= 1;
      }
    },
  };
}
