import { normalizarTexto, escaparRegex } from '../utils/texto.js';
import { emPromocao, precoEfetivo } from '../utils/preco.js';



export const INTENCOES = Object.freeze({
  RACAO_FILHOTE: 'RACAO_FILHOTE',
  PROMOCOES: 'PROMOCOES',
  PAGAMENTO: 'PAGAMENTO',
  FINALIZAR_PEDIDO: 'FINALIZAR_PEDIDO',
  CARRINHO: 'CARRINHO',
  CADASTRO: 'CADASTRO',
  CPF: 'CPF',
  SAUDACAO: 'SAUDACAO',
  AGRADECIMENTO: 'AGRADECIMENTO',
});

const formatadorMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatarMoeda = (valor) => formatadorMoeda.format(valor);

const REGRAS = [
  { intencao: INTENCOES.RACAO_FILHOTE, palavras: ['filhote', 'racao', 'alimentar'] },
  { intencao: INTENCOES.PROMOCOES, palavras: ['promoc', 'desconto', 'oferta'] },
  { intencao: INTENCOES.PAGAMENTO, palavras: ['pagamento', 'pagar', 'cartao', 'pix'] },
  { intencao: INTENCOES.FINALIZAR_PEDIDO, palavras: ['finaliz', 'como compro', 'como faco o pedido'] },
  { intencao: INTENCOES.CARRINHO, palavras: ['carrinho'] },
  { intencao: INTENCOES.CADASTRO, palavras: ['cadastr', 'criar conta', 'conta nova'] },
  { intencao: INTENCOES.CPF, palavras: ['cpf'] },
  { intencao: INTENCOES.SAUDACAO, palavras: ['ola', 'oi', 'bom dia', 'boa tarde', 'boa noite'] },
  { intencao: INTENCOES.AGRADECIMENTO, palavras: ['obrigad', 'valeu'] },
].map(({ intencao, palavras }) => ({ intencao, padroes: palavras.map(compilarPalavra) }));

function compilarPalavra(palavra) {
  const inicio = '(?:^|[^a-z0-9])';
  const fim = palavra.length <= 3 ? '(?:$|[^a-z0-9])' : '';
  return new RegExp(inicio + escaparRegex(palavra) + fim);
}

export function identificarIntencao(mensagem) {
  const texto = normalizarTexto(mensagem).replace(/\s+/g, ' ').trim();
  const regra = REGRAS.find(({ padroes }) => padroes.some((padrao) => padrao.test(texto)));
  return regra ? regra.intencao : null;
}

export function ehRacaoParaFilhote(produto) {
  return (
    normalizarTexto(produto.tipo) === 'racao' &&
    normalizarTexto(`${produto.nome} ${produto.descricao}`).includes('filhote')
  );
}

const RESPOSTA_PADRAO =
  'Posso ajudar com dúvidas sobre rações, promoções, o carrinho ou como finalizar o pedido. Pode perguntar!';

const RESPOSTAS_FIXAS = {
  [INTENCOES.PAGAMENTO]:
    'O pagamento não é feito no aplicativo. Você monta o pedido aqui e paga no caixa da loja, no momento da retirada.',
  [INTENCOES.FINALIZAR_PEDIDO]:
    'Para finalizar seu pedido: adicione produtos ao carrinho, abra "Meu carrinho" e toque em "Finalizar pedido". O pagamento é feito no caixa da loja, na retirada.',
  [INTENCOES.CARRINHO]:
    'No carrinho você vê todos os itens adicionados e o valor total. Toque no "x" ao lado de um item para removê-lo.',
  [INTENCOES.CADASTRO]:
    'Para criar uma conta, toque em "Criar cadastro" na tela de login e preencha nome completo, e-mail, CPF e senha.',
  [INTENCOES.CPF]:
    'O CPF precisa ser válido (dígitos verificadores corretos) para o cadastro ser concluído. Digite apenas os números.',
  [INTENCOES.SAUDACAO]:
    'Olá! Sou o assistente do PetMais. Posso ajudar com produtos, promoções e pedidos.',
  [INTENCOES.AGRADECIMENTO]: 'Por nada! Se precisar de mais alguma coisa, é só chamar. 🐾',
};

function respostaPromocoes(produtos) {
  if (produtos.length === 0) {
    return 'No momento não há produtos em promoção. Volte para conferir mais tarde!';
  }
  const linhas = produtos
    .map((p) => `• ${p.nome}: de ${formatarMoeda(p.precoAtual)} por ${formatarMoeda(p.precoPromocional)}`)
    .join('\n');
  return `Estas são as promoções de hoje:\n${linhas}`;
}

function respostaRacaoFilhote(racoes) {
  if (racoes.length === 0) {
    return 'Recomendo escolher uma ração com a indicação "filhotes" na embalagem, que tem mais proteína e calorias para o crescimento.';
  }
  // Mostra o preço que o cliente realmente paga (promocional, quando houver).
  const linhas = racoes.map((p) => `• ${p.nome} — ${formatarMoeda(precoEfetivo(p))}`).join('\n');
  return `Para filhotes, recomendo:\n${linhas}\nElas têm mais proteína, ideal para essa fase de crescimento.`;
}

/**
 * @param {string|null} intencao
 * @param {{produtosEmPromocao?: object[], racoesFilhote?: object[]}} [dados]
 */
export function montarResposta(intencao, { produtosEmPromocao = [], racoesFilhote = [] } = {}) {
  if (intencao === INTENCOES.PROMOCOES) return respostaPromocoes(produtosEmPromocao);
  if (intencao === INTENCOES.RACAO_FILHOTE) return respostaRacaoFilhote(racoesFilhote);
  return RESPOSTAS_FIXAS[intencao] ?? RESPOSTA_PADRAO;
}

export function responderPorRegras(mensagem, produtos) {
  return montarResposta(identificarIntencao(mensagem), {
    produtosEmPromocao: produtos.filter(emPromocao),
    racoesFilhote: produtos.filter(ehRacaoParaFilhote),
  });
}
