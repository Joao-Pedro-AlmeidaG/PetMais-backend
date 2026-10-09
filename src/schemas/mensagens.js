import { z } from 'zod';

z.setErrorMap((issue, ctx) => {
  switch (issue.code) {
    case 'invalid_type':
      return { message: issue.received === 'undefined' ? 'Campo obrigatório.' : 'Valor com formato inválido.' };
    case 'too_small':
      if (issue.type === 'string') return { message: `Deve ter no mínimo ${issue.minimum} caracteres.` };
      if (issue.type === 'array') return { message: `Informe ao menos ${issue.minimum} item(ns).` };
      return { message: `O valor mínimo é ${issue.minimum}.` };
    case 'too_big':
      if (issue.type === 'string') return { message: `Deve ter no máximo ${issue.maximum} caracteres.` };
      if (issue.type === 'array') return { message: `Informe no máximo ${issue.maximum} item(ns).` };
      return { message: `O valor máximo é ${issue.maximum}.` };
    case 'invalid_enum_value':
      return { message: 'Valor não permitido.' };
    case 'invalid_string':
      return { message: 'Texto com formato inválido.' };
    default:
      return { message: ctx.defaultError };
  }
});
