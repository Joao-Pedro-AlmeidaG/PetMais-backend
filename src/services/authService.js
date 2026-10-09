import { Usuario } from '../models/index.js';
import { erros } from '../utils/AppError.js';
import { gerarHashSenha, compararSenha, compararComHashFalso } from '../utils/senha.js';
import { gerarToken } from '../utils/token.js';

const loginJaCadastrado = () => erros.conflito('LOGIN_JA_CADASTRADO', 'Este e-mail já está cadastrado.');
const cpfJaCadastrado = () => erros.conflito('CPF_JA_CADASTRADO', 'Este CPF já está cadastrado.');

export async function cadastrar({ nomeCompleto, email, cpf, senha }) {
  const login = email;

  const existentes = await Usuario.find({ $or: [{ login }, { cpf }] }).select('login cpf').lean();
  if (existentes.some((usuario) => usuario.login === login)) throw loginJaCadastrado();
  if (existentes.some((usuario) => usuario.cpf === cpf)) throw cpfJaCadastrado();

  const hash = await gerarHashSenha(senha);

  try {
    return await Usuario.create({ nomeCompleto, cpf, login, senha: hash });
  } catch (err) {
    if (err?.code === 11000) {
      const campo = Object.keys(err.keyPattern ?? err.keyValue ?? {})[0];
      throw campo === 'cpf' ? cpfJaCadastrado() : loginJaCadastrado();
    }
    throw err;
  }
}

export async function entrar({ login, senha }) {
  const usuario = await Usuario.findOne({ login }).select('+senha');
  const senhaConfere = usuario ? await compararSenha(senha, usuario.senha) : await compararComHashFalso(senha);
  if (!usuario || !senhaConfere) throw erros.credenciaisInvalidas();

  return { token: gerarToken(usuario._id), usuario };
}

export async function buscarPerfil(usuarioId) {
  const usuario = await Usuario.findById(usuarioId);
  if (!usuario) throw erros.naoAutenticado('TOKEN_INVALIDO', 'Sessão inválida. Faça login novamente.');
  return usuario;
}
