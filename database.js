import mongoose from 'mongoose';
import { env } from './env.js';
import { nomeDoBancoNaUrl } from './mongoUrl.js';

// Remove do filtro qualquer campo que não exista no schema (defesa extra contra NoSQL injection).
mongoose.set('strictQuery', true);

export async function conectarBanco({ url = env.MONGO_URL, dbName = env.MONGO_DB } = {}) {
  mongoose.connection.on('error', (err) => console.error('[mongo] erro de conexão:', err.message));
  mongoose.connection.on('disconnected', () => console.warn('[mongo] desconectado'));

  const opcoes = { serverSelectionTimeoutMS: 5000 }; // falha rápido (5s) se o banco não responder
  // URL do Atlas costuma vir sem nome de banco; sem isso o driver gravaria tudo no banco "test".
  if (!nomeDoBancoNaUrl(url)) opcoes.dbName = dbName;

  await mongoose.connect(url, opcoes);
  // Loga só o nome do banco: a URL contém usuário e senha e NUNCA deve ir para o log.
  console.log(`[mongo] conectado ao banco "${mongoose.connection.name}"`);
}

export async function desconectarBanco() {
  await mongoose.disconnect();
}

export function bancoConectado() {
  return mongoose.connection.readyState === 1;
}
