import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { nomeDoBancoNaUrl } from '../src/config/mongoUrl.js';

describe('nomeDoBancoNaUrl', () => {
  it('URL do Atlas sem banco -> null (o app define MONGO_DB em vez de cair no banco "test")', () => {
    assert.equal(nomeDoBancoNaUrl('mongodb+srv://u:p@cluster.exemplo.mongodb.net/?appName=PetMais'), null);
    assert.equal(nomeDoBancoNaUrl('mongodb+srv://u:p@cluster.exemplo.mongodb.net/'), null);
    assert.equal(nomeDoBancoNaUrl('mongodb+srv://u:p@cluster.exemplo.mongodb.net'), null);
  });

  it('URL com banco -> nome do banco', () => {
    assert.equal(nomeDoBancoNaUrl('mongodb+srv://u:p@cluster.exemplo.mongodb.net/petmais?retryWrites=true'), 'petmais');
    assert.equal(nomeDoBancoNaUrl('mongodb://127.0.0.1:27017/petmais'), 'petmais');
  });

  it('vários hosts (réplica) e senha com caracteres codificados', () => {
    assert.equal(nomeDoBancoNaUrl('mongodb://h1:27017,h2:27017,h3:27017/loja?replicaSet=rs0'), 'loja');
    assert.equal(nomeDoBancoNaUrl('mongodb://u:p%2Fq@h1:27017/loja'), 'loja');
  });

  it('local sem barra final -> null', () => {
    assert.equal(nomeDoBancoNaUrl('mongodb://127.0.0.1:27017'), null);
  });
});
