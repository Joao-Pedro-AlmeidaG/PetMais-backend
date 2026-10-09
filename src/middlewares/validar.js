import { erros } from '../utils/AppError.js';

/**
 * Valida `params`, `query` e `body` com schemas zod.
 * O resultado já convertido/normalizado fica em `req.validado` (nunca sobrescrevemos
 * req.query: no Express 5 ele é somente leitura).
 *
 * Uso: router.post('/x', validar({ body: meuSchema }), controller)
 */
export function validar(schemas) {
  return (req, _res, next) => {
    const validado = {};
    const detalhes = [];

    for (const parte of ['params', 'query', 'body']) {
      const schema = schemas[parte];
      if (!schema) continue;

      const entrada = parte === 'body' ? (req.body ?? {}) : req[parte];
      const resultado = schema.safeParse(entrada);

      if (resultado.success) {
        validado[parte] = resultado.data;
        continue;
      }

      for (const issue of resultado.error.issues) {
        const campo = issue.path.join('.');
        if (!detalhes.some((d) => d.campo === campo)) {
          detalhes.push({ campo, mensagem: issue.message });
        }
      }
    }

    if (detalhes.length > 0) return next(erros.validacao(detalhes));

    req.validado = validado;
    return next();
  };
}
