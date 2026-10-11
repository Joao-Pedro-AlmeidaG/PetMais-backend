import { Router } from 'express';
import * as compraController from '../controllers/compraController.js';
import { validar } from '../middlewares/validar.js';
import { autenticar } from '../middlewares/autenticar.js';
import { paginacaoQuery } from '../schemas/comum.js';

const router = Router();

router.get('/', autenticar, validar({ query: paginacaoQuery }), compraController.listar);

export default router;
