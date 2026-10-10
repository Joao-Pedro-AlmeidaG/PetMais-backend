export function emPromocao(produto) {
  const { precoAtual, precoPromocional } = produto;
  return precoPromocional !== null && precoPromocional !== undefined && precoPromocional < precoAtual;
}

export function precoEfetivo(produto) {
  return emPromocao(produto) ? produto.precoPromocional : produto.precoAtual;
}
