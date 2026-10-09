import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env.js';
import rotas from './routes/index.js';
import { limitadorGeral } from './middlewares/limitadores.js';
import { rotaNaoEncontrada, tratarErros } from './middlewares/erros.js';

export function criarApp() {
  const app = express();

  if (env.TRUST_PROXY > 0) app.set('trust proxy', env.TRUST_PROXY);

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGINS.includes('*') ? '*' : env.CORS_ORIGINS,
      methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Key'],
    })
  );
  if (env.NODE_ENV !== 'test') app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  app.use('/api', limitadorGeral); // limita ANTES de processar o corpo da requisição
  app.use(express.json({ limit: '100kb' })); // cabe o histórico do assistente (até 20 mensagens)
  app.use('/api', rotas);

  app.use(rotaNaoEncontrada);
  app.use(tratarErros);

  return app;
}
