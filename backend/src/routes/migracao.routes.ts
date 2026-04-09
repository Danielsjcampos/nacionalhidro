import { Router } from 'express';
import { getMigracaoStatus, importarDados } from '../controllers/migracao.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/status', getMigracaoStatus);
router.post('/importar', importarDados);

export default router;
