import { Router } from 'express';
import { listAutomacoes, createAutomacao, updateAutomacao, deleteAutomacao, enviarTesteMensagem, listNotificacoes, getStatusInstancia, getQRCode, desconectar, excluir, criar, reiniciar } from '../controllers/whatsapp.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/automacoes', listAutomacoes);
router.post('/automacoes', createAutomacao);
router.patch('/automacoes/:id', updateAutomacao);
router.delete('/automacoes/:id', deleteAutomacao);
router.post('/enviar-teste', enviarTesteMensagem);
router.get('/notificacoes', listNotificacoes);
router.get('/status', getStatusInstancia);
router.get('/qrcode', getQRCode);
router.post('/desconectar', desconectar);
router.delete('/excluir', excluir);
router.post('/criar', criar);
router.post('/reiniciar', reiniciar);

export default router;
