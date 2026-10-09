import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';

const QUINZE_MINUTOS = 15 * 60 * 1000;
const base = { standardHeaders: 'draft-7', legacyHeaders: false };
const aviso = (mensagem) => ({ codigo: 'MUITAS_REQUISICOES', mensagem });

export const limitadorGeral = rateLimit({
  ...base,
  windowMs: QUINZE_MINUTOS,
  limit: env.RATE_LIMIT_MAX,
  message: aviso('Muitas requisições. Tente novamente em alguns minutos.'),
});

export const limitadorLogin = rateLimit({
  ...base,
  windowMs: QUINZE_MINUTOS,
  limit: env.AUTH_RATE_LIMIT_MAX,
  skipSuccessfulRequests: true,
  message: aviso('Muitas tentativas de login. Aguarde alguns minutos e tente de novo.'),
});

export const limitadorCadastro = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: env.AUTH_RATE_LIMIT_MAX,
  message: aviso('Muitos cadastros a partir deste dispositivo. Tente novamente mais tarde.'),
});

export const limitadorAssistente = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: env.AI_RATE_LIMIT_MAX,
  message: aviso('Muitas perguntas seguidas. Aguarde um instante e tente de novo.'),
});

export const limitadorAdmin = rateLimit({
  ...base,
  windowMs: QUINZE_MINUTOS,
  limit: env.AUTH_RATE_LIMIT_MAX,
  skipSuccessfulRequests: true,
  message: aviso('Muitas tentativas com chave inválida. Aguarde alguns minutos.'),
});
