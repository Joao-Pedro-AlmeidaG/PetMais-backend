export const MAX_MENSAGENS_HISTORICO = 8;
const MAX_CARACTERES_HISTORICO = 600;
export const MAX_CARACTERES_RESPOSTA = 1500;

export const MARCADOR_INICIO_CATALOGO = '[CATÁLOGO ATUAL DA LOJA]';
export const MARCADOR_FIM_CATALOGO = '[FIM DO CATÁLOGO]';


export function neutralizarMarcadores(texto) {
  return String(texto ?? '')
    .replace(/[[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {{ pergunta: string, historico?: Array<{papel: 'usuario'|'assistente', texto: string}>, catalogoTexto: string }} entrada
 * @returns {Array<{role: 'user'|'assistant', content: string}>}
 */
export function montarMensagens({ pergunta, historico = [], catalogoTexto }) {
  const mensagens = historico.slice(-MAX_MENSAGENS_HISTORICO).map((item) => ({
    role: item.papel === 'assistente' ? 'assistant' : 'user',
    content: neutralizarMarcadores(item.texto).slice(0, MAX_CARACTERES_HISTORICO),
  }));

  mensagens.push({
    role: 'user',
    content: [
      MARCADOR_INICIO_CATALOGO,
      catalogoTexto,
      MARCADOR_FIM_CATALOGO,
      '',
      `Pergunta do cliente: ${neutralizarMarcadores(pergunta)}`,
    ].join('\n'),
  });

  return mensagens;
}


export function limparResposta(texto, { max = MAX_CARACTERES_RESPOSTA } = {}) {
  let t = String(texto ?? '');

  t = t.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<think>[\s\S]*$/i, '');
  t = t.replace(/\r\n/g, '\n');
  t = t.replace(/\*\*([\s\S]+?)\*\*/g, '$1').replace(/__([\s\S]+?)__/g, '$1');
  t = t.replace(/(?<![\w*])\*(?!\s)([^*\n]+?)\*(?![\w*])/g, '$1');
  t = t.replace(/^[ \t]*#{1,6}[ \t]*/gm, '');
  t = t.replace(/^[ \t]*[*-][ \t]+/gm, '• ');
  t = t.replace(/`+/g, '');
  t = t.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  if (t.length > max) {
    const corte = t.slice(0, max);
    const fimDeFrase = Math.max(corte.lastIndexOf('. '), corte.lastIndexOf('\n'));
    t = fimDeFrase > max * 0.5 ? corte.slice(0, fimDeFrase + 1).trim() : `${corte.trimEnd()}…`;
  }
  return t;
}
