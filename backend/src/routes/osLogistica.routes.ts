import { Router } from 'express';
import {
  listOSLogistica, getOSLogistica, createOSLogistica,
  updateOSLogistica, deleteOSLogistica, baixarLoteOSLogistica,
  createLoteOSLogistica, imprimirLoteOSLogistica,
  precificarOSLogistica, dashboardOSLogistica,
  verificarPendenciasOSLogistica, historicoOSLogistica,
} from '../controllers/osLogistica.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', listOSLogistica);
router.get('/imprimir-lote', imprimirLoteOSLogistica);
router.get('/dashboard', dashboardOSLogistica);
router.get('/pendencias', verificarPendenciasOSLogistica);
router.get('/:id', getOSLogistica);
router.get('/:id/historico', historicoOSLogistica);
router.post('/', createOSLogistica);
router.post('/lote', createLoteOSLogistica);
router.patch('/baixar-lote', baixarLoteOSLogistica);
router.patch('/:id', updateOSLogistica);
router.patch('/:id/precificar', precificarOSLogistica);
router.delete('/:id', deleteOSLogistica);

export default router;


