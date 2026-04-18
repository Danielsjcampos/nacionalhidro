import { Router } from 'express';
import { 
  listEscalas, createEscala, updateEscala, deleteEscala,
  listVeiculos, createVeiculo, updateVeiculo, deleteVeiculo,
  sendToMaintenance, receberPosicaoGPS, listarPosicoesFrota,
  verificarFuncionario,
  duplicarEscala, cancelarEscala, validarOS,
  quadroFuncionarios, quadroVeiculos,
  registrarNaoCompareceu, reverterCancelamentoEscala
} from '../controllers/logistica.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// GPS (T17)
router.get('/gps', listarPosicoesFrota);
router.post('/gps', receberPosicaoGPS);

// Quadros de Disponibilidade (M02/M05/M08)
router.get('/quadro-funcionarios', quadroFuncionarios);
router.get('/quadro-veiculos', quadroVeiculos);

// Validar OS por código (M01)
router.get('/validar-os/:codigo', validarOS);

// Escalas
router.get('/verificar-funcionario/:id/:clienteId', verificarFuncionario);
router.get('/escalas', listEscalas);
router.post('/escalas', createEscala);
router.post('/escalas/:id/duplicar', duplicarEscala);
router.patch('/escalas/:id/cancelar', cancelarEscala);
router.patch('/escalas/:id/nao-compareceu', registrarNaoCompareceu);
router.patch('/escalas/:id/reverter-cancelamento', reverterCancelamentoEscala);
router.patch('/escalas/:id', updateEscala);
router.delete('/escalas/:id', deleteEscala);

// Veículos
router.get('/veiculos', listVeiculos);
router.post('/veiculos', createVeiculo);
router.patch('/veiculos/:id', updateVeiculo);
router.patch('/veiculos/:id/manutencao', sendToMaintenance);
router.delete('/veiculos/:id', deleteVeiculo);

export default router;

