import { Router } from 'express';
import * as assistenteController from '../controllers/assistenteController.js';
import { validar } from '../middlewares/validar.js';
import { limitadorAssistente } from '../middlewares/limitadores.js';
import { mensagemAssistenteSchema } from '../schemas/assistente.js';

const router = Router();

router.post('/mensagens', limitadorAssistente, validar({ body: mensagemAssistenteSchema }), assistenteController.responder);
router.get('/status', assistenteController.status);

export default router;
