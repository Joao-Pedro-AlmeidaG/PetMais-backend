import * as adminService from '../services/adminService.js';
import { serializarProdutoAdmin } from '../utils/serializadores.js';

export async function criarProduto(req, res) {
  const produto = await adminService.criarProduto(req.validado.body);
  res.status(201).json({ produto: serializarProdutoAdmin(produto) });
}

export async function atualizarProduto(req, res) {
  const produto = await adminService.atualizarProduto(req.validado.params.id, req.validado.body);
  res.json({ produto: serializarProdutoAdmin(produto) });
}
