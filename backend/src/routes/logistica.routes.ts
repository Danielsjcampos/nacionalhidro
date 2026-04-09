import { Router } from 'express';
import { 
  listEscalas, createEscala, updateEscala, deleteEscala,
  listVeiculos, createVeiculo, updateVeiculo, deleteVeiculo,
  sendToMaintenance, receberPosicaoGPS, listarPosicoesFrota,
  verificarFuncionario
} from '../controllers/logistica.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// GPS (T17)
router.get('/gps', listarPosicoesFrota);
router.post('/gps', receberPosicaoGPS);

// Escalas
router.get('/verificar-funcionario/:id/:clienteId', verificarFuncionario);
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
