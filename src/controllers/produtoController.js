import * as produtoService from '../services/produtoService.js';

export async function listar(req, res) {
  res.json(await produtoService.listarProdutos(req.validado.query));
}

export async function buscarPorId(req, res) {
  res.json({ produto: await produtoService.buscarProduto(req.validado.params.id) });
}
