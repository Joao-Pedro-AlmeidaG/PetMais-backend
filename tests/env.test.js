import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseEnv } from '../src/config/env.schema.js';

const SEGREDO_FORTE = 'a'.repeat(48);

describe('parseEnv', () => {
  it('só com JWT_SECRET: aplica os padrões (porta 3000, Ollama local, provedor ollama)', () => {
    const r = parseEnv({ JWT_SECRET: SEGREDO_FORTE });
    assert.equal(r.ok, true);
    assert.equal(r.env.NODE_ENV, 'development');
    assert.equal(r.env.PORT, 3000);
    assert.equal(r.env.MONGO_URL, 'mongodb://127.0.0.1:27017/petmais');
    assert.equal(r.env.MONGO_DB, 'petmais');
    assert.equal(r.env.JWT_EXPIRES_IN, '7d');
    assert.equal(r.env.BCRYPT_ROUNDS, 10);
    assert.deepEqual(r.env.CORS_ORIGINS, ['*']);
    assert.equal(r.env.ASSISTANT_PROVIDER, 'ollama');
    assert.equal(r.env.OLLAMA_URL, 'http://127.0.0.1:11434');
    assert.equal(r.env.OLLAMA_MODEL, 'petmais-assistente');
    assert.equal(r.env.OLLAMA_TIMEOUT_MS, 45000);
    assert.equal(r.env.OLLAMA_MAX_CONCURRENT, 2);
    assert.equal(r.env.ADMIN_KEY, undefined);
    assert.deepEqual(r.env.avisos, []);
  });

  it('aceita o formato do .env da equipe (nomes e tipos), ignorando EXPO_PUBLIC_API_URL', () => {
    const r = parseEnv({
      EXPO_PUBLIC_API_URL: 'http://192.168.1.2:3000',
      PORT: '3000',
      MONGO_URL: 'mongodb+srv://usuario:senha@cluster.exemplo.mongodb.net/?appName=PetMais',
      JWT_SECRET: 'segredo-de-21-chars-x', // 21 caracteres: curto, mas aceito em desenvolvimento
      JWT_EXPIRES_IN: '7d',
      ADMIN_KEY: 'chave-do-gerente-123',
    });
    assert.equal(r.ok, true);
    assert.equal(r.env.PORT, 3000);
    assert.equal(r.env.MONGO_URL, 'mongodb+srv://usuario:senha@cluster.exemplo.mongodb.net/?appName=PetMais');
    assert.equal(r.env.ADMIN_KEY, 'chave-do-gerente-123');
    assert.equal('EXPO_PUBLIC_API_URL' in r.env, false);
    assert.ok(r.env.avisos.some((a) => a.startsWith('JWT_SECRET curto')));
  });

  it('JWT_SECRET ausente, vazio ou muito curto -> erro com dica do npm run setup', () => {
    for (const fonte of [{}, { JWT_SECRET: '' }, { JWT_SECRET: 'curto' }]) {
      const r = parseEnv(fonte);
      assert.equal(r.ok, false);
      assert.match(r.erros.join('\n'), /JWT_SECRET/);
      assert.match(r.erros.join('\n'), /npm run setup/);
    }
  });

  it('em produção exige MONGO_URL e JWT_SECRET de 32+ caracteres', () => {
    let r = parseEnv({ NODE_ENV: 'production', JWT_SECRET: SEGREDO_FORTE });
    assert.equal(r.ok, false);
    assert.match(r.erros.join('\n'), /MONGO_URL: é obrigatório em produção/);

    r = parseEnv({ NODE_ENV: 'production', MONGO_URL: 'mongodb://h/db', JWT_SECRET: 'segredo-de-21-chars-x' });
    assert.equal(r.ok, false);
    assert.match(r.erros.join('\n'), /JWT_SECRET: em produção/);

    r = parseEnv({ NODE_ENV: 'production', MONGO_URL: 'mongodb://h/db', JWT_SECRET: SEGREDO_FORTE });
    assert.equal(r.ok, true);
    assert.ok(r.env.avisos.some((a) => a.includes('CORS_ORIGIN')));
  });

  it('valida tipos e limites', () => {
    const base = { JWT_SECRET: SEGREDO_FORTE };
    assert.equal(parseEnv({ ...base, PORT: 'abc' }).ok, false);
    assert.equal(parseEnv({ ...base, PORT: '70000' }).ok, false);
    assert.equal(parseEnv({ ...base, BCRYPT_ROUNDS: '20' }).ok, false);
    assert.equal(parseEnv({ ...base, JWT_EXPIRES_IN: '100' }).ok, false); // número puro = milissegundos (armadilha)
    assert.equal(parseEnv({ ...base, JWT_EXPIRES_IN: '12h' }).ok, true);
    assert.equal(parseEnv({ ...base, ADMIN_KEY: 'curta' }).ok, false);
    assert.equal(parseEnv({ ...base, ASSISTANT_PROVIDER: 'gpt' }).ok, false);
    assert.equal(parseEnv({ ...base, OLLAMA_URL: 'localhost:11434' }).ok, false);
  });

  it('normaliza CORS_ORIGIN (lista) e OLLAMA_URL (sem barra final)', () => {
    const r = parseEnv({
      JWT_SECRET: SEGREDO_FORTE,
      CORS_ORIGIN: 'http://localhost:8081, https://petmais.app ',
      OLLAMA_URL: 'http://127.0.0.1:11434/',
    });
    assert.deepEqual(r.env.CORS_ORIGINS, ['http://localhost:8081', 'https://petmais.app']);
    assert.equal(r.env.OLLAMA_URL, 'http://127.0.0.1:11434');
  });

  it('strings vazias valem como "não definido" (linha "ADMIN_KEY=" no .env)', () => {
    const r = parseEnv({ JWT_SECRET: SEGREDO_FORTE, ADMIN_KEY: '', MONGO_URL: '', PORT: '' });
    assert.equal(r.ok, true);
    assert.equal(r.env.ADMIN_KEY, undefined);
    assert.equal(r.env.PORT, 3000);
  });
});
