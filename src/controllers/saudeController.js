import { bancoConectado } from '../config/database.js';

export function saude(_req, res) {
  const conectado = bancoConectado();
  res.status(conectado ? 200 : 503).json({
    status: conectado ? 'ok' : 'indisponivel',
    banco: conectado ? 'conectado' : 'desconectado',
    uptimeSegundos: Math.round(process.uptime()),
  });
}
