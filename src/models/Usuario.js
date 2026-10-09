import mongoose from 'mongoose';

const { Schema } = mongoose;

const usuarioSchema = new Schema(
  {
    nomeCompleto: {
      type: String,
      required: [true, 'Informe o nome completo.'],
      trim: true,
      minlength: [2, 'O nome deve ter no mínimo 2 caracteres.'],
      maxlength: [120, 'O nome deve ter no máximo 120 caracteres.'],
    },
    cpf: {
      type: String,
      required: [true, 'Informe o CPF.'],
      unique: true,
      match: [/^\d{11}$/, 'O CPF deve conter 11 dígitos.'],
    },
    login: {
      type: String,
      required: [true, 'Informe o login.'],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [254, 'O login deve ter no máximo 254 caracteres.'],
    },
    senha: { type: String, required: true, select: false },
  },
  {
    timestamps: true,
    collection: 'usuarios',
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        delete ret.senha;
        return ret;
      },
    },
  }
);

export const Usuario = mongoose.model('Usuario', usuarioSchema);
