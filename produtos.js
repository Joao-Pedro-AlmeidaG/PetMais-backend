import { z } from 'zod';
import { camposDePaginacao } from './comum.js';

export const listarProdutosQuery = z.object({
  busca: z.string().trim().max(100, 'A busca deve ter no máximo 100 caracteres.').optional(),
  tipo: z.string().trim().max(60, 'O tipo deve ter no máximo 60 caracteres.').optional(),
  promocao: z
    .enum(['true', 'false'], { errorMap: () => ({ message: 'O filtro "promocao" aceita apenas true ou false.' }) })
    .optional()
    .transform((valor) => valor === 'true'),
  ...camposDePaginacao(50),
});
