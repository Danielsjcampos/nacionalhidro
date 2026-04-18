import { Router } from 'express';
import { listOcorrencias, createOcorrencia, deleteOcorrencia } from '../controllers/ocorrencia.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', listOcorrencias);
router.post('/', createOcorrencia);
router.delete('/:id', deleteOcorrencia);

export default router;
