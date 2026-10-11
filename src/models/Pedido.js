import mongoose from 'mongoose';
import { STATUS_PEDIDO } from '../domain/pedido.js';
import { temNoMaximoDuasCasas } from '../utils/dinheiro.js';

const { Schema } = mongoose;

const pedidoSchema = new Schema(
  {
    usuario: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    total: {
      type: Number,
      required: true,
      min: 0,
      validate: { validator: temNoMaximoDuasCasas, message: 'O total deve ter no máximo 2 casas decimais.' },
    },
    status: { type: String, enum: Object.values(STATUS_PEDIDO), default: STATUS_PEDIDO.AGUARDANDO_RETIRADA },
    dataDoPedido: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: 'pedidos' }
);

pedidoSchema.index({ usuario: 1, dataDoPedido: -1 });

export const Pedido = mongoose.model('Pedido', pedidoSchema);
