import { Router } from 'express';
import { getDrePorCnpj } from '../controllers/dre.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', getDrePorCnpj);

export default router;
