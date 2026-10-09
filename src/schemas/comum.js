import './mensagens.js';
import { z } from 'zod';

export const textoObrigatorio = (mensagem) =>
  z.string({ required_error: mensagem, invalid_type_error: mensagem });

export const objectId = (mensagem = 'Identificador inválido.') =>
  textoObrigatorio(mensagem)
    .trim()
    .regex(/^[a-f\d]{24}$/i, mensagem)
    .transform((valor) => valor.toLowerCase());

export const camposDePaginacao = (limitePadrao, limiteMaximo = 100) => ({
  pagina: z.coerce
    .number({ invalid_type_error: 'Página inválida.' })
    .int('Página inválida.')
    .min(1, 'Página inválida.')
    .default(1),
  limite: z.coerce
    .number({ invalid_type_error: 'Limite inválido.' })
    .int('Limite inválido.')
    .min(1, 'Limite inválido.')
    .max(limiteMaximo, `O limite máximo é ${limiteMaximo}.`)
    .default(limitePadrao),
});

export const paginacaoQuery = z.object(camposDePaginacao(20));

export const idNaRota = z.object({ id: objectId() });
