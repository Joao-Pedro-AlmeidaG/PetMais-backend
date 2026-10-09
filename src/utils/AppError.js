export class AppError extends Error {
  /**
   * @param {number} status
   * @param {string} codigo
   * @param {string} mensagem
   * @param {Array<{campo?: string, mensagem: string}>} [detalhes]
   */
  constructor(status, codigo, mensagem, detalhes) {
    super(mensagem);
    this.name = 'AppError';
    this.status = status;
    this.codigo = codigo;
    this.detalhes = detalhes;
  }
}

export const erros = {
  validacao: (detalhes) =>
    new AppError(400, 'DADOS_INVALIDOS', detalhes[0]?.mensagem ?? 'Dados inválidos.', detalhes),

  naoAutenticado: (codigo = 'NAO_AUTENTICADO', mensagem = 'Autenticação necessária.') =>
    new AppError(401, codigo, mensagem),

  credenciaisInvalidas: () =>
    new AppError(401, 'CREDENCIAIS_INVALIDAS', 'Login ou senha inválidos.'),

  naoEncontrado: (codigo, mensagem) => new AppError(404, codigo, mensagem),

  conflito: (codigo, mensagem) => new AppError(409, codigo, mensagem),

  naoProcessavel: (codigo, mensagem, detalhes) => new AppError(422, codigo, mensagem, detalhes),
};
