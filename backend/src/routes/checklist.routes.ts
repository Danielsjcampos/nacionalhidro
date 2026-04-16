import { Router } from 'express';
import {
  listTemplates, createTemplate, updateTemplate, deleteTemplate,
  executeChecklist, completeChecklist,
  getHistoricoVeiculo, listExecucoes
} from '../controllers/checklist.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Templates CRUD
router.get('/templates', listTemplates);
router.post('/templates', createTemplate);
router.patch('/templates/:id', updateTemplate);
router.delete('/templates/:id', deleteTemplate);

// Execution
router.get('/execucoes', listExecucoes);
router.post('/execucao', executeChecklist);
router.patch('/execucao/:id/finalizar', completeChecklist);

// Vehicle history (unified timeline)
router.get('/veiculo/:id/historico', getHistoricoVeiculo);

export default router;
