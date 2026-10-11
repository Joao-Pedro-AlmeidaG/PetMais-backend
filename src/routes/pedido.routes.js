import { Router } from 'express';
import * as pedidoController from '../controllers/pedidoController.js';
import { validar } from '../middlewares/validar.js';
import { autenticar } from '../middlewares/autenticar.js';
import { criarPedidoSchema } from '../schemas/pedidos.js';
import { idNaRota, paginacaoQuery } from '../schemas/comum.js';

const router = Router();

router.use(autenticar); 

router.post('/', validar({ body: criarPedidoSchema }), pedidoController.criar);
router.get('/', validar({ query: paginacaoQuery }), pedidoController.listar);
router.get('/:id', validar({ params: idNaRota }), pedidoController.buscar);

export default router;
