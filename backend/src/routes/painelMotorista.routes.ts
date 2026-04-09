import { Router } from 'express';
import { getPainelMotorista, atualizarKm, finalizarOS, reportarFalhaOS, registrarCheckpoint } from '../controllers/painelMotorista.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', getPainelMotorista);
router.post('/km', atualizarKm);
router.post('/checkpoint', registrarCheckpoint);
router.post('/finalizar', finalizarOS);
router.post('/falha', reportarFalhaOS);

export default router;
