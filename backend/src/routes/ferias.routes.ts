import { Router } from 'express';
import {
    listFerias, getFerias, createFerias,
    updateFerias, deleteFerias, getResumoFerias
} from '../controllers/ferias.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', listFerias);
router.get('/resumo', getResumoFerias);
router.get('/:id', getFerias);
router.post('/', createFerias);
router.patch('/:id', updateFerias);
router.delete('/:id', deleteFerias);

export default router;
