import { Router } from 'express';
import { getDrePorCnpj, getAlocacaoCustosTrabalho } from '../controllers/dre.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', getDrePorCnpj);
router.get('/alocacao-custos', getAlocacaoCustosTrabalho);

export default router;
