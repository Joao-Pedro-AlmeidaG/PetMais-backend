const KEEP_ALIVE = '30m';

export class IaIndisponivelError extends Error {
  /** @param {'conexao'|'timeout'|'modelo'|'servidor'|'resposta'|'resposta_vazia'} motivo */
  constructor(motivo, detalhe) {
    super(`IA indisponível (${motivo})${detalhe ? `: ${detalhe}` : ''}`);
    this.name = 'IaIndisponivelError';
    this.motivo = motivo;
  }
}

const ehTimeout = (err) => err?.name === 'TimeoutError' || err?.name === 'AbortError';

export function criarClienteOllama({ baseUrl, modelo, timeoutMs, opcoes = {}, fetchImpl = globalThis.fetch }) {
  async function chamar(caminho, init, timeout) {
    try {
      return await fetchImpl(`${baseUrl}${caminho}`, { ...init, signal: AbortSignal.timeout(timeout) });
    } catch (err) {
      if (ehTimeout(err)) throw new IaIndisponivelError('timeout');
      throw new IaIndisponivelError('conexao', err?.cause?.code ?? err?.message);
    }
  }

  async function lerJson(resposta) {
    try {
      return await resposta.json();
    } catch (err) {
      if (ehTimeout(err)) throw new IaIndisponivelError('timeout');
      throw new IaIndisponivelError('resposta', 'JSON inválido');
    }
  }

  return {
    async conversar(mensagens, sobrescritas = {}) {
      const resposta = await chamar(
        '/api/chat',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: modelo,
            messages: mensagens,
            stream: false,
            keep_alive: KEEP_ALIVE,
            options: { temperature: 0.3, num_ctx: 4096, num_predict: 300, ...opcoes, ...sobrescritas },
          }),
        },
        timeoutMs
      );

      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => ({}));
        throw new IaIndisponivelError(resposta.status === 404 ? 'modelo' : 'servidor', corpo?.error ?? `HTTP ${resposta.status}`);
      }

      const dados = await lerJson(resposta);
      const texto = dados?.message?.content;
      if (typeof texto !== 'string' || texto.trim() === '') throw new IaIndisponivelError('resposta_vazia');
      return texto;
    },

    async status() {
      try {
        const resposta = await chamar('/api/tags', { method: 'GET' }, 2000);
        if (!resposta.ok) return { disponivel: false, motivo: 'servidor' };
        const dados = await lerJson(resposta);
        const nomes = (dados?.models ?? []).map((m) => m.name);
        return {
          disponivel: true,
          modeloInstalado: nomes.some((nome) => nome === modelo || nome === `${modelo}:latest`),
        };
      } catch (err) {
        return { disponivel: false, motivo: err instanceof IaIndisponivelError ? err.motivo : 'desconhecido' };
      }
    },
  };
}
