import * as pedidoService from '../services/pedidoService.js';

export async function criar(req, res) {
  const pedido = await pedidoService.criarPedido(req.usuarioId, req.validado.body.itens);
  res.status(201).json({ pedido });
}

export async function listar(req, res) {
  res.json(await pedidoService.listarPedidos(req.usuarioId, req.validado.query));
}

export async function buscar(req, res) {
  res.json({ pedido: await pedidoService.buscarPedido(req.usuarioId, req.validado.params.id) });
}
