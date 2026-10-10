import { Produto } from '../models/index.js';
import { erros } from '../utils/AppError.js';
import { normalizarTexto, escaparRegex } from '../utils/texto.js';
import { calcularSkip, montarPaginacao } from '../utils/paginacao.js';
import { serializarProduto } from '../utils/serializadores.js';

const filtroEmPromocao = () => ({
  precoPromocional: { $ne: null },
  $expr: { $lt: ['$precoPromocional', '$precoAtual'] },
});

export async function listarProdutos({ busca, tipo, promocao, pagina, limite }) {
  const filtro = { ativo: true };

  if (tipo) filtro.tipoNormalizado = normalizarTexto(tipo).trim();
  if (promocao) Object.assign(filtro, filtroEmPromocao());
  const termo = normalizarTexto(busca).trim();
  if (termo) {
    const regex = new RegExp(escaparRegex(termo));
    filtro.$or = [{ nomeNormalizado: regex }, { tipoNormalizado: regex }];
  }

  const [produtos, total] = await Promise.all([
    Produto.find(filtro).sort({ _id: 1 }).skip(calcularSkip(pagina, limite)).limit(limite).lean(),
    Produto.countDocuments(filtro),
  ]);

  return { dados: produtos.map(serializarProduto), paginacao: montarPaginacao({ pagina, limite, total }) };
}

export async function buscarProduto(id) {
  const produto = await Produto.findOne({ _id: id, ativo: true }).lean();
  if (!produto) throw erros.naoEncontrado('PRODUTO_NAO_ENCONTRADO', 'Este produto não foi encontrado.');
  return serializarProduto(produto);
}
export function obterProdutosAtivos() {
  return Produto.find({ ativo: true }).sort({ _id: 1 }).limit(500).lean();
}
