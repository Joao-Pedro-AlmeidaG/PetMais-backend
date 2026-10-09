import { env } from './config/env.js';
import { conectarBanco, desconectarBanco } from './config/database.js';
import { inicializarModelos } from './models/index.js';
import { criarApp } from './app.js';

async function iniciar() {
  await conectarBanco();
  await inicializarModelos();

  const app = criarApp();
  const servidor = app.listen(env.PORT, () => {
    console.log(`[api] PetMais no ar na porta ${env.PORT} (${env.NODE_ENV}): http://localhost:${env.PORT}/api/saude`);
    console.log(
      env.ASSISTANT_PROVIDER === 'ollama'
        ? `[ia]  assistente: Ollama (modelo "${env.OLLAMA_MODEL}" em ${env.OLLAMA_URL}); se estiver fora do ar, responde pelas regras`
        : '[ia]  assistente: somente regras (ASSISTANT_PROVIDER=regras)'
    );
    if (!env.ADMIN_KEY) console.log('[api] ADMIN_KEY não definida: as rotas /api/admin estão desabilitadas.');
  });

  const encerrar = (sinal) => {
    console.log(`\n[api] ${sinal} recebido, encerrando...`);
    servidor.close(async () => {
      await desconectarBanco();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', () => encerrar('SIGINT'));
  process.on('SIGTERM', () => encerrar('SIGTERM'));
}

iniciar().catch((err) => {
  console.error(`[api] falha ao iniciar: ${err.message}`);
  if (/ENOTFOUND|ECONNREFUSED|ServerSelection|whitelist|IP/i.test(err.message)) {
    console.error('[api] Dica: confira a MONGO_URL e, no Atlas, se o seu IP está liberado em Network Access.');
  }
  process.exit(1);
});
