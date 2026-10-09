import { env } from '../config/env.js';
import { criarClienteOllama } from './ia/ollamaClient.js';
import { criarAssistente } from './ia/assistenteIA.js';
import { obterProdutosAtivos } from './produtoService.js';
import { criarLimitadorDeConcorrencia } from '../utils/limitadorDeConcorrencia.js';

const cliente = criarClienteOllama({
  baseUrl: env.OLLAMA_URL,
  modelo: env.OLLAMA_MODEL,
  timeoutMs: env.OLLAMA_TIMEOUT_MS,
});

const assistente = criarAssistente({
  cliente,
  limitador: criarLimitadorDeConcorrencia(env.OLLAMA_MAX_CONCURRENT),
  obterProdutosAtivos,
  provedor: env.ASSISTANT_PROVIDER,
});

/** @returns {Promise<{resposta: string, origem: 'ia'|'regras'}>} */
export const responder = (entrada) => assistente.responder(entrada);

export async function statusDaIa() {
  if (env.ASSISTANT_PROVIDER !== 'ollama') return { provedor: 'regras', modelo: null, ollama: null };
  return { provedor: 'ollama', modelo: env.OLLAMA_MODEL, ollama: await cliente.status() };
}
