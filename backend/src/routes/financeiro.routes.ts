import { Router } from 'express';
import { listTransacoes, createTransacao } from '../controllers/financeiro.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', listTransacoes);
router.post('/', createTransacao);

export default router;
