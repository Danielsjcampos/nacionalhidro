import { Router } from 'express';
import { listEmpresas, getIndicadorFaturamento, updateEmpresa, createEmpresa, deleteEmpresa } from '../controllers/cnpj.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', listEmpresas);
router.get('/indicador', getIndicadorFaturamento);
router.post('/', createEmpresa);
router.patch('/:id', updateEmpresa);
router.delete('/:id', deleteEmpresa);

export default router;
