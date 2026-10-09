import { z } from 'zod';
import { textoObrigatorio } from './comum.js';
import { temNoMaximoDuasCasas } from '../utils/dinheiro.js';

const erroDeCorpo = { invalid_type_error: 'Corpo da requisição inválido.', required_error: 'Corpo da requisição inválido.' };

function dataExiste(texto) {
  const data = new Date(`${texto}T00:00:00Z`);
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === texto;
}

const preco = (obrigatoria) =>
  z
    .number({ required_error: obrigatoria, invalid_type_error: 'O preço deve ser um número (ex.: 159.9).' })
    .min(0, 'O preço não pode ser negativo.')
    .max(1_000_000, 'O preço está alto demais.')
    .refine(temNoMaximoDuasCasas, 'Use no máximo 2 casas decimais no preço.');

const campos = {
  nome: textoObrigatorio('Informe o nome do produto.')
    .trim()
    .min(2, 'O nome do produto deve ter no mínimo 2 caracteres.')
    .max(160, 'O nome do produto deve ter no máximo 160 caracteres.'),
  tipo: textoObrigatorio('Informe o tipo do produto.')
    .trim()
    .min(2, 'O tipo deve ter no mínimo 2 caracteres.')
    .max(60, 'O tipo deve ter no máximo 60 caracteres.'),
  precoAtual: preco('Informe o preço atual.'),
  precoPromocional: preco('Informe o preço promocional ou null.').nullable(),
  descricao: textoObrigatorio('Informe a descrição.')
    .trim()
    .min(1, 'Informe a descrição.')
    .max(1000, 'A descrição deve ter no máximo 1000 caracteres.'),
  dataValidade: textoObrigatorio('Informe a data de validade (AAAA-MM-DD).')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a data no formato AAAA-MM-DD.')
    .refine(dataExiste, 'Data de validade inválida.'),
  ativo: z.boolean({ invalid_type_error: '"ativo" deve ser true ou false.' }),
};

const promocaoMenorQueAtual = {
  teste: (p) => p.precoPromocional == null || p.precoAtual === undefined || p.precoPromocional < p.precoAtual,
  opcoes: { path: ['precoPromocional'], message: 'O preço promocional deve ser menor que o preço atual.' },
};

export const criarProdutoSchema = z
  .object(
    {
      ...campos,
      precoPromocional: campos.precoPromocional.optional().default(null),
      ativo: campos.ativo.optional().default(true),
    },
    erroDeCorpo
  )
  .refine(promocaoMenorQueAtual.teste, promocaoMenorQueAtual.opcoes);

/** PATCH: qualquer subconjunto dos campos. (Se só o preço promocional vier, o serviço compara com o preço salvo.) */
export const atualizarProdutoSchema = z
  .object(campos, erroDeCorpo)
  .partial()
  .refine((corpo) => Object.keys(corpo).length > 0, 'Envie ao menos um campo para atualizar.')
  .refine(promocaoMenorQueAtual.teste, promocaoMenorQueAtual.opcoes);
