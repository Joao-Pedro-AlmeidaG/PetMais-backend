import { z } from 'zod';

const inteiro = (padrao, { min, max } = {}) => {
  let schema = z.coerce.number({ invalid_type_error: 'deve ser um número.' }).int('deve ser um número inteiro.');
  if (min !== undefined) schema = schema.min(min, `deve ser no mínimo ${min}.`);
  if (max !== undefined) schema = schema.max(max, `deve ser no máximo ${max}.`);
  return schema.default(padrao);
};

const MONGO_URL_DEV = 'mongodb://127.0.0.1:27017/petmais';
const OLLAMA_URL_PADRAO = 'http://127.0.0.1:11434';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: inteiro(3000, { min: 1, max: 65535 }),

    // Banco (nomes iguais aos do .env da equipe)
    MONGO_URL: z.string().optional(),
    // Usado só quando a MONGO_URL não traz o nome do banco no caminho (caso típico do Atlas).
    MONGO_DB: z.string().min(1).default('petmais'),

    // Autenticação
    JWT_SECRET: z
      .string({ required_error: 'é obrigatório. Rode "npm run setup" para gerar um automaticamente.' })
      .min(16, 'deve ter pelo menos 16 caracteres (o ideal é 32 ou mais). Rode "npm run setup" para gerar um.'),
    // Só s|m|h|d: um número "puro" seria lido pelo jsonwebtoken como milissegundos (pegadinha clássica).
    JWT_EXPIRES_IN: z
      .string()
      .regex(/^\d+[smhd]$/, 'use número + unidade s, m, h ou d (ex.: 15m, 12h, 7d).')
      .default('7d'),
    BCRYPT_ROUNDS: inteiro(10, { min: 4, max: 15 }),

    // Chave do gerente (rotas /api/admin/*). Sem ela, essas rotas ficam desabilitadas.
    ADMIN_KEY: z.string().min(12, 'deve ter pelo menos 12 caracteres.').optional(),

    // Rede / limites
    CORS_ORIGIN: z.string().default('*'),
    TRUST_PROXY: inteiro(0, { min: 0, max: 10 }),
    RATE_LIMIT_MAX: inteiro(300, { min: 1 }),
    AUTH_RATE_LIMIT_MAX: inteiro(20, { min: 1 }),
    AI_RATE_LIMIT_MAX: inteiro(20, { min: 1 }),

    // Assistente com IA (Ollama)
    ASSISTANT_PROVIDER: z.enum(['ollama', 'regras'], {
      errorMap: () => ({ message: 'use "ollama" (IA, com fallback para regras) ou "regras" (sem IA).' }),
    }).default('ollama'),
    // .url() do zod aceita "localhost:11434" (vira um "esquema"), por isso exigimos http(s):// explicitamente.
    OLLAMA_URL: z
      .string()
      .regex(/^https?:\/\/[^\s/]+/, 'deve começar com http:// ou https://, ex.: http://127.0.0.1:11434')
      .default(OLLAMA_URL_PADRAO),
    OLLAMA_MODEL: z.string().min(1).default('petmais-assistente'),
    OLLAMA_TIMEOUT_MS: inteiro(45000, { min: 1000, max: 300000 }),
    OLLAMA_MAX_CONCURRENT: inteiro(2, { min: 1, max: 10 }),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production') {
      if (!env.MONGO_URL) {
        ctx.addIssue({ code: 'custom', path: ['MONGO_URL'], message: 'é obrigatório em produção.' });
      }
      if (env.JWT_SECRET.length < 32) {
        ctx.addIssue({ code: 'custom', path: ['JWT_SECRET'], message: 'em produção deve ter pelo menos 32 caracteres.' });
      }
    }
  })
  .transform((env) => {
    const avisos = [];
    if (env.JWT_SECRET.length < 32) {
      avisos.push('JWT_SECRET curto: use 32+ caracteres aleatórios (rode "npm run setup" para gerar um).');
    }
    if (env.ADMIN_KEY && env.ADMIN_KEY.length < 16) {
      avisos.push('ADMIN_KEY curta: use 16+ caracteres aleatórios.');
    }
    if (env.NODE_ENV === 'production' && env.CORS_ORIGIN === '*') {
      avisos.push('CORS_ORIGIN="*" em produção: restrinja às origens do seu front.');
    }

    return {
      ...env,
      MONGO_URL: env.MONGO_URL ?? MONGO_URL_DEV,
      CORS_ORIGINS: env.CORS_ORIGIN.split(',')
        .map((origem) => origem.trim())
        .filter(Boolean),
      OLLAMA_URL: env.OLLAMA_URL.replace(/\/+$/, ''),
      avisos,
    };
  });

/**
 * Valida variáveis de ambiente. Pura: recebe um objeto e devolve { ok, env } ou { ok: false, erros }.
 * Strings vazias (ex.: "JWT_SECRET=" no .env) são tratadas como "não definido".
 * Variáveis desconhecidas (ex.: EXPO_PUBLIC_API_URL, que é do app) são ignoradas.
 */
export function parseEnv(fonte) {
  const limpo = Object.fromEntries(Object.entries(fonte).filter(([, valor]) => valor !== ''));
  const resultado = envSchema.safeParse(limpo);

  if (resultado.success) return { ok: true, env: resultado.data };

  return {
    ok: false,
    erros: resultado.error.issues.map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`),
  };
}
