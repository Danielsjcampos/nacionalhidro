import { Router } from 'express';
import {
  listEscalaLogistica, getEscalaLogistica, createEscalaLogistica,
  updateEscalaLogistica, deleteEscalaLogistica,
} from '../controllers/escalaLogistica.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', listEscalaLogistica);
router.get('/:id', getEscalaLogistica);
router.post('/', createEscalaLogistica);
router.patch('/:id', updateEscalaLogistica);
router.delete('/:id', deleteEscalaLogistica);

export default router;
