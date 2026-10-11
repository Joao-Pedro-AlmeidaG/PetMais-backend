import * as pedidoService from '../services/pedidoService.js';

export async function listar(req, res) {
  res.json(await pedidoService.listarCompras(req.usuarioId, req.validado.query));
}
