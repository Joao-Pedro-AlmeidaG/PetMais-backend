import mongoose from 'mongoose';
import { Produto, Pedido, Compra } from '../models/index.js';
import { erros } from '../utils/AppError.js';
import { montarLinhasDoPedido } from '../domain/pedido.js';
import { calcularSkip, montarPaginacao } from '../utils/paginacao.js';
import { serializarPedido, serializarCompra } from '../utils/serializadores.js';

export async function criarPedido(usuarioId, itens) {
  const idsUnicos = [...new Set(itens.map((item) => item.produtoId))];
  const produtos = await Produto.find({ _id: { $in: idsUnicos }, ativo: true }).lean();

  const { linhas, total } = montarLinhasDoPedido(itens, produtos); // lança 422 se faltar produto

  const pedidoId = new mongoose.Types.ObjectId();
  const agora = new Date(); // todas as compras do mesmo pedido compartilham a data, como no app

  try {
    const compras = await Compra.insertMany(
      linhas.map((linha) => ({
        pedido: pedidoId,
        usuario: usuarioId,
        produto: linha.produtoId,
        nomeProduto: linha.nomeProduto,
        preco: linha.preco,
        dataDaCompra: agora,
      }))
    );
    const pedido = await Pedido.create({ _id: pedidoId, usuario: usuarioId, total, dataDoPedido: agora });
    return serializarPedido(pedido, compras);
  } catch (err) {
    await Compra.deleteMany({ pedido: pedidoId }).catch((erroDeLimpeza) =>
      console.error('[pedido] falha ao desfazer compras de um pedido que não foi concluído:', erroDeLimpeza)
    );
    throw err;
  }
}

async function anexarCompras(pedidos) {
  if (pedidos.length === 0) return [];

  const compras = await Compra.find({ pedido: { $in: pedidos.map((pedido) => pedido._id) } })
    .sort({ _id: 1 })
    .lean();

  const porPedido = new Map();
  for (const compra of compras) {
    const chave = String(compra.pedido);
    if (!porPedido.has(chave)) porPedido.set(chave, []);
    porPedido.get(chave).push(compra);
  }
  return pedidos.map((pedido) => serializarPedido(pedido, porPedido.get(String(pedido._id)) ?? []));
}

export async function listarPedidos(usuarioId, { pagina, limite }) {
  const filtro = { usuario: usuarioId };
  const [pedidos, total] = await Promise.all([
    Pedido.find(filtro).sort({ dataDoPedido: -1, _id: -1 }).skip(calcularSkip(pagina, limite)).limit(limite).lean(),
    Pedido.countDocuments(filtro),
  ]);
  return { dados: await anexarCompras(pedidos), paginacao: montarPaginacao({ pagina, limite, total }) };
}

export async function buscarPedido(usuarioId, pedidoId) {
  const pedido = await Pedido.findOne({ _id: pedidoId, usuario: usuarioId }).lean();
  if (!pedido) throw erros.naoEncontrado('PEDIDO_NAO_ENCONTRADO', 'Pedido não encontrado.');
  const [completo] = await anexarCompras([pedido]);
  return completo;
}
export async function listarCompras(usuarioId, { pagina, limite }) {
  const filtro = { usuario: usuarioId };
  const [compras, total] = await Promise.all([
    Compra.find(filtro).sort({ dataDaCompra: -1, _id: -1 }).skip(calcularSkip(pagina, limite)).limit(limite).lean(),
    Compra.countDocuments(filtro),
  ]);
  return { dados: compras.map(serializarCompra), paginacao: montarPaginacao({ pagina, limite, total }) };
}
