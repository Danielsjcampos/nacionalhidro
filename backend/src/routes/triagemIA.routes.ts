import { Router } from 'express';
import { triarCandidatos, aprovarAdmissao, aprovarTodos } from '../controllers/triagemIA.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', triarCandidatos);
router.post('/aprovar/:admissaoId', aprovarAdmissao);
router.post('/aprovar-todos', aprovarTodos);

export default router;
