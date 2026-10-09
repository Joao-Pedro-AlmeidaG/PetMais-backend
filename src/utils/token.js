import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const ALGORITMO = 'HS256';

export function gerarToken(usuarioId) {
  return jwt.sign({ sub: String(usuarioId) }, env.JWT_SECRET, {
    algorithm: ALGORITMO,
    expiresIn: env.JWT_EXPIRES_IN,
  });
}
export function verificarToken(token) {
  return jwt.verify(token, env.JWT_SECRET, { algorithms: [ALGORITMO] });
}
