import mongoose from 'mongoose';
import { temNoMaximoDuasCasas } from '../utils/dinheiro.js';

const { Schema } = mongoose;

const compraSchema = new Schema(
  {
    pedido: { type: Schema.Types.ObjectId, ref: 'Pedido', required: true, index: true },
    usuario: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    produto: { type: Schema.Types.ObjectId, ref: 'Produto', required: true },
    nomeProduto: { type: String, required: true, trim: true },
    preco: {
      type: Number,
      required: true,
      min: 0,
      validate: { validator: temNoMaximoDuasCasas, message: 'O preço deve ter no máximo 2 casas decimais.' },
    },
    dataDaCompra: { type: Date, required: true, default: Date.now },
  },
  { collection: 'compras' }
);

compraSchema.index({ usuario: 1, dataDaCompra: -1 });

export const Compra = mongoose.model('Compra', compraSchema);
