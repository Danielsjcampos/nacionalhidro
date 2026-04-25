import { Router } from 'express';
import {
  listOSLogistica, getOSLogistica, createOSLogistica,
  updateOSLogistica, deleteOSLogistica, baixarLoteOSLogistica,
} from '../controllers/osLogistica.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', listOSLogistica);
router.get('/:id', getOSLogistica);
router.post('/', createOSLogistica);
router.patch('/baixar-lote', baixarLoteOSLogistica);
router.patch('/:id', updateOSLogistica);
router.delete('/:id', deleteOSLogistica);

export default router;
