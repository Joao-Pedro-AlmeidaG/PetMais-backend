import { erros } from '../utils/AppError.js';
import { verificarToken } from '../utils/token.js';

export function autenticar(req, _res, next) {
  const [tipo, token] = (req.headers.authorization ?? '').split(' ');

  if (tipo?.toLowerCase() !== 'bearer' || !token) {
    return next(erros.naoAutenticado());
  }

  try {
    const { sub } = verificarToken(token);
    if (!sub) return next(erros.naoAutenticado('TOKEN_INVALIDO', 'Sessão inválida. Faça login novamente.'));
    req.usuarioId = sub;
    return next();
  } catch (err) {
    return next(
      err?.name === 'TokenExpiredError'
        ? erros.naoAutenticado('TOKEN_EXPIRADO', 'Sua sessão expirou. Faça login novamente.')
        : erros.naoAutenticado('TOKEN_INVALIDO', 'Sessão inválida. Faça login novamente.')
    );
  }
}
