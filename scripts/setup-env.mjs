#!/usr/bin/env node
/** Cria o .env a partir do .env.example já com JWT_SECRET e ADMIN_KEY aleatórios. Não sobrescreve um .env existente. */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

if (existsSync('.env')) {
  console.log('O arquivo .env já existe: nada foi alterado. (Apague-o se quiser gerar um novo.)');
  process.exit(0);
}

const preencher = (texto, chave, valor) => texto.replace(new RegExp(`^${chave}=.*$`, 'm'), `${chave}=${valor}`);

let conteudo = readFileSync('.env.example', 'utf8');
conteudo = preencher(conteudo, 'JWT_SECRET', randomBytes(48).toString('hex'));
conteudo = preencher(conteudo, 'ADMIN_KEY', randomBytes(24).toString('hex'));

writeFileSync('.env', conteudo, { mode: 0o600 }); // só o dono do arquivo lê
console.log('.env criado com JWT_SECRET e ADMIN_KEY aleatórios.');
console.log('Próximos passos: ajuste a MONGO_URL (se usar Atlas), depois: npm run seed && npm run dev');
