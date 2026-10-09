import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

export const gerarHashSenha = (senha) => bcrypt.hash(senha, env.BCRYPT_ROUNDS);
export const compararSenha = (senha, hash) => bcrypt.compare(senha, hash);

let hashFalso;

export async function compararComHashFalso(senha) {
  hashFalso ??= await bcrypt.hash(randomUUID(), env.BCRYPT_ROUNDS);
  return bcrypt.compare(senha, hashFalso);
}
