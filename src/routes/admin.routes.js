import { Router } from 'express';
import * as adminController from '../controllers/adminController.js';
import { validar } from '../middlewares/validar.js';
import { criarExigirChaveAdmin } from '../middlewares/chaveAdmin.js';
import { limitadorAdmin } from '../middlewares/limitadores.js';
import { criarProdutoSchema, atualizarProdutoSchema } from '../schemas/admin.js';
import { idNaRota } from '../schemas/comum.js';
import { env } from '../config/env.js';

const router = Router();

router.use(limitadorAdmin, criarExigirChaveAdmin(env.ADMIN_KEY));

router.post('/produtos', validar({ body: criarProdutoSchema }), adminController.criarProduto);
router.patch('/produtos/:id', validar({ params: idNaRota, body: atualizarProdutoSchema }), adminController.atualizarProduto);

export default router;
