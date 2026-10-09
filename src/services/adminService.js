import { Produto } from '../models/index.js';
import { erros } from '../utils/AppError.js';

const paraData = (textoAAAAMMDD) => new Date(`${textoAAAAMMDD}T00:00:00Z`);

export async function criarProduto({ dataValidade, ...dados }) {
  const produto = new Produto({ ...dados, dataValidade: paraData(dataValidade) });
  await produto.save();
  return produto;
}

export async function atualizarProduto(id, { dataValidade, ...alteracoes }) {
  const produto = await Produto.findById(id);
  if (!produto) throw erros.naoEncontrado('PRODUTO_NAO_ENCONTRADO', 'Produto não encontrado.');

  produto.set(alteracoes);
  if (dataValidade) produto.dataValidade = paraData(dataValidade);

  if (produto.precoPromocional != null && produto.precoPromocional >= produto.precoAtual) {
    throw erros.validacao([
      { campo: 'precoPromocional', mensagem: 'O preço promocional deve ser menor que o preço atual.' },
    ]);
  }

  await produto.save();
  return produto;
}
