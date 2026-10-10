import mongoose from 'mongoose';
import { normalizarTexto } from '../utils/texto.js';
import { temNoMaximoDuasCasas } from '../utils/dinheiro.js';

const { Schema } = mongoose;

const duasCasas = {
  validator: (valor) => valor === null || valor === undefined || temNoMaximoDuasCasas(valor),
  message: 'O valor de {PATH} deve ter no máximo 2 casas decimais.',
};

const produtoSchema = new Schema(
  {
    nome: {
      type: String,
      required: [true, 'Informe o nome do produto.'],
      trim: true,
      minlength: [2, 'O nome do produto deve ter no mínimo 2 caracteres.'],
      maxlength: [160, 'O nome do produto deve ter no máximo 160 caracteres.'],
    },
    tipo: {
      type: String,
      required: [true, 'Informe o tipo do produto.'],
      trim: true,
      maxlength: [60, 'O tipo deve ter no máximo 60 caracteres.'],
    },
    precoAtual: {
      type: Number,
      required: [true, 'Informe o preço atual.'],
      min: [0, 'O preço não pode ser negativo.'],
      max: [1_000_000, 'O preço está alto demais.'],
      validate: duasCasas,
    },
    precoPromocional: {
      type: Number,
      default: null,
      min: [0, 'O preço promocional não pode ser negativo.'],
      max: [1_000_000, 'O preço promocional está alto demais.'],
      validate: [
        duasCasas,
        {
          validator(valor) {
            return valor === null || valor === undefined || valor < this.precoAtual;
          },
          message: 'O preço promocional deve ser menor que o preço atual.',
        },
      ],
    },
    descricao: {
      type: String,
      required: [true, 'Informe a descrição.'],
      trim: true,
      maxlength: [1000, 'A descrição deve ter no máximo 1000 caracteres.'],
    },
    dataValidade: { type: Date, required: [true, 'Informe a data de validade.'] },
    ativo: { type: Boolean, default: true },

    nomeNormalizado: { type: String, select: false },
    tipoNormalizado: { type: String, select: false },
  },
  { timestamps: true, collection: 'produtos' }
);

produtoSchema.pre('validate', function normalizarCamposDeBusca() {
  this.nomeNormalizado = normalizarTexto(this.nome);
  this.tipoNormalizado = normalizarTexto(this.tipo);
});

produtoSchema.index({ ativo: 1, tipoNormalizado: 1 });

export const Produto = mongoose.model('Produto', produtoSchema);
