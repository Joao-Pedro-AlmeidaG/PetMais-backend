import { erros } from '../utils/AppError.js';
import { precoEfetivo } from '../utils/preco.js';
import { somar } from '../utils/dinheiro.js';

export const STATUS_PEDIDO = Object.freeze({
  AGUARDANDO_RETIRADA: 'AGUARDANDO_RETIRADA', // pedido feito no app; pagamento é no caixa, na retirada
  RETIRADO: 'RETIRADO',
  CANCELADO: 'CANCELADO',
});

/**
 * Transforma o que o app mandou (apenas ids) + os produtos lidos do banco
 * nas linhas que serão gravadas como Compra, já com o preço calculado NO SERVIDOR.
 *
 * Regras:
 *  - o app nunca informa preço: o valor vem do cadastro do produto (promoção incluída);
 *  - cada item vira uma Compra (o mesmo produto 2x gera 2 compras, como no carrinho do app);
 *  - se algum produto não existe/está inativo, nada é gravado (422).
 *
 * @param {Array<{produtoId: string}>} itensSolicitados
 * @param {Array<{_id: any, nome: string, precoAtual: number, precoPromocional: number|null}>} produtos
 */
export function montarLinhasDoPedido(itensSolicitados, produtos) {
  const porId = new Map(produtos.map((produto) => [String(produto._id), produto]));

  const indisponiveis = [
    ...new Set(
      itensSolicitados
        .map((item) => String(item.produtoId).toLowerCase())
        .filter((id) => !porId.has(id))
    ),
  ];

  if (indisponiveis.length > 0) {
    throw erros.naoProcessavel(
      'PRODUTO_INDISPONIVEL',
      indisponiveis.length === 1
        ? 'Um dos produtos do carrinho não está mais disponível.'
        : 'Alguns produtos do carrinho não estão mais disponíveis.',
      indisponiveis.map((id) => ({ campo: 'itens.produtoId', mensagem: `Produto ${id} indisponível.` }))
    );
  }

  const linhas = itensSolicitados.map((item) => {
    const produto = porId.get(String(item.produtoId).toLowerCase());
    return {
      produtoId: String(produto._id),
      nomeProduto: produto.nome,
      preco: precoEfetivo(produto),
    };
  });

  return { linhas, total: somar(linhas.map((linha) => linha.preco)) };
}
