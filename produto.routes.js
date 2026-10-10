import { Router } from 'express';
import * as produtoController from '../controllers/produtoController.js';
import { validar } from '../middlewares/validar.js';
import { listarProdutosQuery } from '../schemas/produtos.js';
import { idNaRota } from '../schemas/comum.js';

const router = Router();

router.get('/', validar({ query: listarProdutosQuery }), produtoController.listar);
router.get('/:id', validar({ params: idNaRota }), produtoController.buscarPorId);

export default router;
