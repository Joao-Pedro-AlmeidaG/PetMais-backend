import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { validar } from '../middlewares/validar.js';
import { autenticar } from '../middlewares/autenticar.js';
import { limitadorLogin, limitadorCadastro } from '../middlewares/limitadores.js';
import { cadastroSchema, loginSchema } from '../schemas/auth.js';

const router = Router();

router.post('/cadastro', limitadorCadastro, validar({ body: cadastroSchema }), authController.cadastrar);
router.post('/login', limitadorLogin, validar({ body: loginSchema }), authController.login);
router.get('/me', autenticar, authController.perfil);

export default router;
