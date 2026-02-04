import { Router } from 'express';
import { listFuncionarios, createFuncionario, getFuncionario, updateFuncionario } from '../controllers/rh.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', listFuncionarios);
router.post('/', createFuncionario);
router.get('/:id', getFuncionario);
router.put('/:id', updateFuncionario);

export default router;
