import { z } from 'zod';
import { objectId } from './comum.js';

export const MAX_ITENS_POR_PEDIDO = 50;

export const criarPedidoSchema = z.object(
  {
    itens: z
      .array(z.object({ produtoId: objectId('Produto inválido.') }, { invalid_type_error: 'Item inválido.' }), {
        required_error: 'Informe os itens do pedido.',
        invalid_type_error: 'Informe os itens do pedido.',
      })
      .min(1, 'O carrinho está vazio.')
      .max(MAX_ITENS_POR_PEDIDO, `Um pedido pode ter no máximo ${MAX_ITENS_POR_PEDIDO} itens.`),
  },
  { invalid_type_error: 'Corpo da requisição inválido.', required_error: 'Corpo da requisição inválido.' }
);
