import { normalizarTexto } from '../../utils/texto.js';
import { emPromocao, precoEfetivo } from '../../utils/preco.js';
import { formatarMoeda } from '../assistente.js';

export const LIMITE_CATALOGO_COMPLETO = 25;
export const LIMITE_PRODUTOS_NO_CONTEXTO = 15;
const TAMANHO_MAX_DESCRICAO = 140;

const PALAVRAS_VAZIAS = new Set([
  'para', 'pra', 'com', 'sem', 'uma', 'uns', 'umas', 'dos', 'das', 'que', 'qual', 'quais', 'quanto',
  'quanta', 'custa', 'custam', 'tem', 'tenho', 'quero', 'queria', 'preciso', 'voce', 'voces', 'meu',
  'minha', 'meus', 'minhas', 'pelo', 'pela', 'mais', 'muito', 'muita', 'bom', 'boa', 'bons', 'boas',
  'melhor', 'como', 'onde', 'quando', 'favor', 'aqui', 'esse', 'essa', 'isso', 'esta', 'este', 'isto',
  'sobre', 'tambem', 'ainda', 'ser', 'sao', 'estao', 'ter', 'fazer', 'posso', 'pode', 'podem', 'vende',
  'vendem', 'loja', 'produto', 'produtos', 'petmais', 'algum', 'alguma', 'alguns', 'algumas', 'hoje',
]);

export function radical(palavra) {
  if (palavra.length >= 4 && /(oes|aes|aos)$/.test(palavra)) return `${palavra.slice(0, -3)}ao`;
  if (palavra.length > 3 && palavra.endsWith('s')) return palavra.slice(0, -1);
  return palavra;
}

export function extrairTermos(pergunta) {
  const termos = [];
  for (const token of normalizarTexto(pergunta).split(/[^a-z0-9]+/)) {
    if (token.length < 3 || PALAVRAS_VAZIAS.has(token)) continue;
    const termo = radical(token);
    if (!termos.includes(termo)) termos.push(termo);
  }
  return termos;
}

function radicaisDoTexto(texto) {
  return new Set(
    normalizarTexto(texto)
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
      .map(radical)
  );
}

export function pontuarProduto(produto, termos) {
  const nomeETipo = radicaisDoTexto(`${produto.nome} ${produto.tipo}`);
  const descricao = radicaisDoTexto(produto.descricao);
  let pontos = 0;
  for (const termo of termos) {
    if (nomeETipo.has(termo)) pontos += 3;
    else if (descricao.has(termo)) pontos += 1;
  }
  return pontos;
}

export function selecionarProdutosParaContexto(
  pergunta,
  produtos,
  { limiteCompleto = LIMITE_CATALOGO_COMPLETO, limite = LIMITE_PRODUTOS_NO_CONTEXTO } = {}
) {
  if (produtos.length <= limiteCompleto) return produtos;

  const termos = extrairTermos(pergunta);
  const relevantes = produtos
    .map((produto, indice) => ({ produto, indice, pontos: pontuarProduto(produto, termos) }))
    .filter((item) => item.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos || a.indice - b.indice)
    .map((item) => item.produto);

  const escolhidos = [];
  const ids = new Set();
  const adicionar = (produto) => {
    const id = String(produto._id);
    if (escolhidos.length < limite && !ids.has(id)) {
      ids.add(id);
      escolhidos.push(produto);
    }
  };

  relevantes.forEach(adicionar); 
  produtos.filter(emPromocao).forEach(adicionar); 
  produtos.forEach(adicionar); 
  return escolhidos;
}

const moeda = (valor) => formatarMoeda(valor).replace(/\u00a0/g, ' ');

export function dataBR(data) {
  const [ano, mes, dia] = new Date(data).toISOString().slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

function truncar(texto, max) {
  const limpo = String(texto ?? '').replace(/\s+/g, ' ').trim();
  return limpo.length > max ? `${limpo.slice(0, max - 1).trimEnd()}…` : limpo;
}

export function formatarProdutoParaPrompt(produto) {
  const preco = emPromocao(produto)
    ? `${moeda(precoEfetivo(produto))} (promoção; preço anterior ${moeda(produto.precoAtual)})`
    : moeda(precoEfetivo(produto));

  return `- ${[
    produto.nome,
    produto.tipo,
    preco,
    `validade ${dataBR(produto.dataValidade)}`,
    truncar(produto.descricao, TAMANHO_MAX_DESCRICAO),
  ].join(' | ')}`;
}

export function formatarCatalogo(produtos) {
  if (produtos.length === 0) return '(nenhum produto cadastrado no momento)';
  return produtos.map(formatarProdutoParaPrompt).join('\n');
}
