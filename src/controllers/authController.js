import * as authService from '../services/authService.js';
import { serializarUsuario } from '../utils/serializadores.js';

export async function cadastrar(req, res) {
  const usuario = await authService.cadastrar(req.validado.body);
  res.status(201).json({ usuario: serializarUsuario(usuario) });
}

export async function login(req, res) {
  const { token, usuario } = await authService.entrar(req.validado.body);
  res.json({ token, usuario: serializarUsuario(usuario) });
}

export async function perfil(req, res) {
  const usuario = await authService.buscarPerfil(req.usuarioId);
  res.json({ usuario: serializarUsuario(usuario) });
}
