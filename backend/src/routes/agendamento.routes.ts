import { Router } from 'express';
import {
  listAgendamentos, getAgendamento, createAgendamento, updateAgendamento,
  updateTarefa, disparar, previewMensagem, remarcar, historicoCliente
} from '../controllers/agendamento.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', listAgendamentos);
router.get('/:id', getAgendamento);
router.post('/', createAgendamento);
router.patch('/:id', updateAgendamento);
router.post('/:id/disparar', disparar);
router.get('/:id/preview', previewMensagem);
router.post('/:id/remarcar', remarcar);
router.patch('/:id/tarefas/:tarefaId', updateTarefa);
router.get('/cliente/:clienteId/historico', historicoCliente);

export default router;
