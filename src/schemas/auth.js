import { z } from 'zod';
import { textoObrigatorio } from './comum.js';
import { cpfValido, limparCpf } from '../utils/cpf.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const MAX_BYTES_SENHA = 72;

export const cadastroSchema = z.object(
  {
    nomeCompleto: textoObrigatorio('Informe o nome completo.')
      .trim()
      .min(1, 'Informe o nome completo.')
      .min(2, 'O nome deve ter no mínimo 2 caracteres.')
      .max(120, 'O nome deve ter no máximo 120 caracteres.'),

    email: textoObrigatorio('Informe o e-mail.')
      .trim()
      .min(1, 'Informe o e-mail.')
      .max(254, 'O e-mail deve ter no máximo 254 caracteres.')
      .regex(EMAIL_REGEX, 'Informe um e-mail válido.')
      .toLowerCase(),

    cpf: textoObrigatorio('Informe o CPF.')
      .trim()
      .min(1, 'Informe o CPF.')
      .refine(cpfValido, 'Informe um CPF válido.')
      .transform(limparCpf),

    senha: textoObrigatorio('Informe a senha.')
      .min(1, 'Informe a senha.')
      .min(6, 'A senha deve ter no mínimo 6 caracteres.')
      .refine((senha) => Buffer.byteLength(senha, 'utf8') <= MAX_BYTES_SENHA, 'A senha é longa demais (máximo de 72 bytes).'),
  },
  { invalid_type_error: 'Corpo da requisição inválido.', required_error: 'Corpo da requisição inválido.' }
);

export const loginSchema = z.object(
  {
    login: textoObrigatorio('Informe o login.')
      .trim()
      .min(1, 'Informe o login.')
      .max(254, 'Login inválido.')
      .toLowerCase(),
    senha: textoObrigatorio('Informe a senha.')
      .min(1, 'Informe a senha.')
      .max(128, 'Senha inválida.'),
  },
  { invalid_type_error: 'Corpo da requisição inválido.', required_error: 'Corpo da requisição inválido.' }
);
