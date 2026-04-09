import { Router } from 'express';
import { getDashboard, listColaboradores, admissoesAndamento, updateColaborador, getAlertasVencimento, getTiquetaqueDashboard } from '../controllers/gestaoColaboradores.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/dashboard', getDashboard);
router.get('/admissoes-andamento', admissoesAndamento);
router.get('/alertas-vencimento', getAlertasVencimento);
router.get('/tiquetaque/dashboard-hoje', getTiquetaqueDashboard);
router.get('/', listColaboradores);
router.patch('/:id', updateColaborador);

export default router;
