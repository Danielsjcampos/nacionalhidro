import { Router } from 'express';
import {
    listarContratos,
    obterContrato,
    criarContrato,
    atualizarContrato,
    deletarContrato,
    dashboardContratos
} from '../controllers/contrato.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate); // Protege as rotas

router.get('/dashboard', dashboardContratos);
router.get('/', listarContratos);
router.get('/:id', obterContrato);
router.post('/', criarContrato);
router.patch('/:id', atualizarContrato);
router.delete('/:id', deletarContrato);

export default router;
