import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { 
  getEquipamentos, 
  createEquipamento, 
  updateEquipamento, 
  deleteEquipamento 
} from '../controllers/equipamento.controller';

const router = Router();

router.use(authenticate);

router.get('/', getEquipamentos);
router.post('/', createEquipamento);
router.put('/:id', updateEquipamento);
router.delete('/:id', deleteEquipamento);

export default router;
