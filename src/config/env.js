import { existsSync } from 'node:fs';
import { parseEnv } from './env.schema.js';

if (existsSync('.env')) process.loadEnvFile('.env');

const resultado = parseEnv(process.env);

if (!resultado.ok) {
  console.error('\n[config] Variáveis de ambiente inválidas:');
  for (const erro of resultado.erros) console.error(`  - ${erro}`);
  console.error('\nCopie .env.example para .env (ou rode "npm run setup") e ajuste os valores.\n');
  process.exit(1);
}

if (resultado.env.NODE_ENV !== 'test') {
  for (const aviso of resultado.env.avisos) console.warn(`[config] aviso: ${aviso}`);
}

export const env = Object.freeze(resultado.env);
