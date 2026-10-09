import { createHash, timingSafeEqual } from 'node:crypto';
import { AppError } from '../utils/AppError.js';

const sha256 = (texto) => createHash('sha256').update(texto).digest();

export function criarExigirChaveAdmin(chaveConfigurada) {
  const esperado = chaveConfigurada ? sha256(chaveConfigurada) : null;

  return function exigirChaveAdmin(req, _res, next) {
    if (!esperado) {
      return next(
        new AppError(503, 'ADMIN_DESABILITADO', 'As rotas de gerente estão desabilitadas: defina ADMIN_KEY no servidor.')
      );
    }

    const enviada = req.headers['x-admin-key'];
    const valida = typeof enviada === 'string' && enviada !== '' && timingSafeEqual(sha256(enviada), esperado);

    return valida ? next() : next(new AppError(403, 'CHAVE_ADMIN_INVALIDA', 'Chave de gerente ausente ou inválida.'));
  };
}
