import { z } from 'zod';
import { textoObrigatorio } from './comum.js';

const erroDeCorpo = { invalid_type_error: 'Corpo da requisição inválido.', required_error: 'Corpo da requisição inválido.' };

export const MAX_HISTORICO_ENTRADA = 20;

export const mensagemAssistenteSchema = z.object(
  {
    mensagem: textoObrigatorio('Digite uma mensagem.')
      .trim()
      .min(1, 'Digite uma mensagem.')
      .max(500, 'A mensagem deve ter no máximo 500 caracteres.'),

    historico: z
      .array(
        z.object(
          {
            papel: z.enum(['usuario', 'assistente'], {
              errorMap: () => ({ message: 'O papel no histórico deve ser "usuario" ou "assistente".' }),
            }),
            texto: textoObrigatorio('Texto inválido no histórico.')
              .trim()
              .min(1, 'Texto inválido no histórico.')
              .max(1500, 'Uma mensagem do histórico está longa demais.'),
          },
          { invalid_type_error: 'Item inválido no histórico.' }
        ),
        { invalid_type_error: 'Histórico inválido.' }
      )
      .max(MAX_HISTORICO_ENTRADA, `O histórico pode ter no máximo ${MAX_HISTORICO_ENTRADA} mensagens.`)
      .optional()
      .default([]),
  },
  erroDeCorpo
);
