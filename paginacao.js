export function calcularSkip(pagina, limite) {
  return (pagina - 1) * limite;
}

export function montarPaginacao({ pagina, limite, total }) {
  return { pagina, limite, total, totalPaginas: Math.ceil(total / limite) };
}
