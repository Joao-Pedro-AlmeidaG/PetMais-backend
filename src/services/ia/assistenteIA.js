import { responderPorRegras } from '../../domain/assistente.js';
import { selecionarProdutosParaContexto, formatarCatalogo } from '../../domain/ia/catalogo.js';
import { montarMensagens, limparResposta } from '../../domain/ia/prompt.js';
import { IaIndisponivelError } from './ollamaClient.js';

const DICAS = {
  conexao: 'O Ollama está rodando? (abra o app Ollama ou rode "ollama serve") e confira OLLAMA_URL no .env',
  modelo: 'Modelo não encontrado. Rode "npm run ia:treinar" e confira OLLAMA_MODEL no .env',
  timeout: 'Resposta demorou demais. Use um modelo menor ou aumente OLLAMA_TIMEOUT_MS',
};

/**
 * Orquestra o assistente: IA (Ollama) primeiro; se estiver fora do ar, lenta, ocupada ou devolver algo
 * vazio, responde pelas regras. Assim o app NUNCA fica sem resposta (nem na apresentação).
 * Recebe as dependências por parâmetro para ser testável sem banco e sem Ollama.
 *
 * @param {{
 *   cliente: { conversar(mensagens: object[]): Promise<string> },
 *   limitador: { tentar(tarefa: () => Promise<any>): Promise<{ocupado: boolean, valor?: any}> },
 *   obterProdutosAtivos: () => Promise<object[]>,
 *   provedor: 'ollama'|'regras',
 *   logger?: { warn: Function, error: Function },
 * }} deps
 */
export function criarAssistente({ cliente, limitador, obterProdutosAtivos, provedor, logger = console }) {
  function registrarFalha(err) {
    if (err instanceof IaIndisponivelError) {
      logger.warn(`[ia] ${err.message}. Usando as regras. Dica: ${DICAS[err.motivo] ?? 'veja os logs do Ollama'}`);
    } else {
      logger.error('[ia] erro inesperado; usando as regras.', err);
    }
  }

  return {
    /** @returns {Promise<{resposta: string, origem: 'ia'|'regras'}>} */
    async responder({ mensagem, historico = [] }) {
      const produtos = await obterProdutosAtivos();

      if (provedor === 'ollama') {
        try {
          const execucao = await limitador.tentar(() => {
            const escolhidos = selecionarProdutosParaContexto(mensagem, produtos);
            const mensagens = montarMensagens({
              pergunta: mensagem,
              historico,
              catalogoTexto: formatarCatalogo(escolhidos),
            });
            return cliente.conversar(mensagens);
          });

          if (execucao.ocupado) {
            logger.warn('[ia] limite de perguntas simultâneas atingido. Usando as regras.');
          } else {
            const resposta = limparResposta(execucao.valor);
            if (resposta) return { resposta, origem: 'ia' };
            logger.warn('[ia] resposta vazia após a limpeza. Usando as regras.');
          }
        } catch (err) {
          registrarFalha(err);
        }
      }

      return { resposta: responderPorRegras(mensagem, produtos), origem: 'regras' };
    },
  };
}
