import { env } from '../config/env.js';
import { conectarBanco, desconectarBanco } from '../config/database.js';
import { Usuario, Produto, Pedido, Compra, inicializarModelos } from '../models/index.js';
import { gerarHashSenha } from '../utils/senha.js';
import { produtosIniciais, usuariosIniciais } from './dados.js';

const reset = process.argv.includes('--reset');
const confirmado = process.argv.includes('--confirmo');

async function semearProdutos() {
  let criados = 0;
  let atualizados = 0;

  for (const dados of produtosIniciais) {
    let produto = await Produto.findOne({ nome: dados.nome });
    const novo = !produto;
    produto ??= new Produto();

    produto.set({ ...dados, dataValidade: new Date(`${dados.dataValidade}T00:00:00Z`), ativo: true });
    await produto.save();

    if (novo) criados += 1;
    else atualizados += 1;
  }
  return { criados, atualizados };
}

async function semearUsuarios() {
  let criados = 0;
  for (const { senha, ...dados } of usuariosIniciais) {
    const existe = await Usuario.exists({ $or: [{ login: dados.login }, { cpf: dados.cpf }] });
    if (existe) continue;
    await Usuario.create({ ...dados, senha: await gerarHashSenha(senha) });
    criados += 1;
  }
  return criados;
}

async function apagarTudo() {
  const [compras, pedidos, produtos, usuarios] = await Promise.all([
    Compra.countDocuments(),
    Pedido.countDocuments(),
    Produto.countDocuments(),
    Usuario.countDocuments(),
  ]);
  console.log(`[seed] Isto vai APAGAR: ${usuarios} usuários, ${produtos} produtos, ${pedidos} pedidos e ${compras} compras.`);

  if (!confirmado) {
    console.log('[seed] Nada foi apagado. Para confirmar, rode:  npm run seed:reset -- --confirmo');
    return false;
  }
  await Promise.all([Compra.deleteMany({}), Pedido.deleteMany({}), Produto.deleteMany({}), Usuario.deleteMany({})]);
  console.log('[seed] Banco limpo.');
  return true;
}

async function principal() {
  await conectarBanco();
  await inicializarModelos();

  if (reset) {
    if (env.NODE_ENV === 'production') throw new Error('--reset é proibido com NODE_ENV=production.');
    if (!(await apagarTudo())) return;
  }

  const produtos = await semearProdutos();
  console.log(`[seed] Produtos: ${produtos.criados} criados, ${produtos.atualizados} atualizados.`);

  if (env.NODE_ENV === 'production') {
    console.log('[seed] Produção: usuários de teste NÃO foram criados.');
  } else {
    const usuarios = await semearUsuarios();
    console.log(`[seed] Usuários de teste: ${usuarios} criados (login: ${usuariosIniciais[0].login}).`);
  }
}

principal()
  .catch((err) => {
    console.error(`[seed] falhou: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(desconectarBanco);
