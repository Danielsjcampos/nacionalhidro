import { Router } from 'express';
import { 
  listEscalas, createEscala, updateEscala, deleteEscala,
  listVeiculos, createVeiculo, updateVeiculo, deleteVeiculo,
  sendToMaintenance 
} from '../controllers/logistica.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Escalas
router.get('/escalas', listEscalas);
router.post('/escalas', createEscala);
router.patch('/escalas/:id', updateEscala);
router.delete('/escalas/:id', deleteEscala);

// Veículos
router.get('/veiculos', listVeiculos);
router.post('/veiculos', createVeiculo);
router.patch('/veiculos/:id', updateVeiculo);
router.patch('/veiculos/:id/manutencao', sendToMaintenance);
router.delete('/veiculos/:id', deleteVeiculo);

export default router;
