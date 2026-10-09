import { Router } from 'express';
import { saude } from '../controllers/saudeController.js';
import authRoutes from './auth.routes.js';
import produtoRoutes from './produto.routes.js';
import pedidoRoutes from './pedido.routes.js';
import compraRoutes from './compra.routes.js';
import assistenteRoutes from './assistente.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();

router.get('/saude', saude);
router.use('/auth', authRoutes);
router.use('/produtos', produtoRoutes);
router.use('/pedidos', pedidoRoutes);
router.use('/compras', compraRoutes);
router.use('/assistente', assistenteRoutes);
router.use('/admin', adminRoutes);

export default router;
