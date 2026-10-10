import { Usuario } from './Usuario.js';
import { Produto } from './Produto.js';
import { Pedido } from './Pedido.js';
import { Compra } from './Compra.js';

export { Usuario, Produto, Pedido, Compra };

export async function inicializarModelos() {
  await Promise.all([Usuario, Produto, Pedido, Compra].map((modelo) => modelo.init()));
}
