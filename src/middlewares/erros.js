import { AppError } from '../utils/AppError.js';

export function rotaNaoEncontrada(_req, _res, next) {
  next(new AppError(404, 'ROTA_NAO_ENCONTRADA', 'Rota não encontrada.'));
}


export function criarTratadorDeErros(logger = console) {
  return function tratarErros(err, req, res, next) {
    if (res.headersSent) return next(err);

    let status = 500;
    let corpo = {
      codigo: 'ERRO_INTERNO',
      mensagem: 'Erro interno do servidor. Tente novamente em instantes.',
    };

    if (err instanceof AppError) {
      status = err.status;
      corpo = { codigo: err.codigo, mensagem: err.message };
      if (err.detalhes?.length) corpo.detalhes = err.detalhes;
    } else if (err?.type === 'entity.parse.failed') {
      status = 400;
      corpo = { codigo: 'JSON_INVALIDO', mensagem: 'O corpo da requisição não é um JSON válido.' };
    } else if (err?.type === 'entity.too.large') {
      status = 413;
      corpo = { codigo: 'CORPO_MUITO_GRANDE', mensagem: 'O corpo da requisição é grande demais.' };
    } else if (err?.name === 'CastError') {
      status = 400;
      corpo = { codigo: 'PARAMETRO_INVALIDO', mensagem: 'Parâmetro com formato inválido.' };
    } else if (err?.name === 'ValidationError' && err.errors) {
      status = 400;
      const detalhes = Object.values(err.errors).map((e) => ({ campo: e.path, mensagem: e.message }));
      corpo = {
        codigo: 'DADOS_INVALIDOS',
        mensagem: detalhes[0]?.mensagem ?? 'Dados inválidos.',
        detalhes,
      };
    } else if (err?.code === 11000) {
      status = 409;
      corpo = { codigo: 'REGISTRO_DUPLICADO', mensagem: 'Já existe um registro com esses dados.' };
    }

    if (status >= 500) {
      logger.error(`[erro] ${req.method} ${req.originalUrl}`, err);
    }
    if (status === 401) {
      res.set('WWW-Authenticate', 'Bearer');
    }

    return res.status(status).json(corpo);
  };
}

export const tratarErros = criarTratadorDeErros();
