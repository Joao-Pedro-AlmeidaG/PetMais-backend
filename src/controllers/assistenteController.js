import * as assistenteService from '../services/assistenteService.js';

export async function responder(req, res) {
  const { mensagem, historico } = req.validado.body;
  res.json(await assistenteService.responder({ mensagem, historico }));
}

export async function status(_req, res) {
  res.json(await assistenteService.statusDaIa());
}
