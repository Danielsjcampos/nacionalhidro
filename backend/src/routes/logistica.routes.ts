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
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// GPS
router.get('/gps', authorize('frota.mapa.ver'), listarPosicoesFrota);
router.post('/gps', authorize('frota.mapa.ver'), receberPosicaoGPS);

// Quadros de Disponibilidade
router.get('/quadro-funcionarios', authorize('logistica.escala.listar'), quadroFuncionarios);
router.get('/quadro-veiculos', authorize('logistica.escala.listar'), quadroVeiculos);

// Validar OS por código
router.get('/validar-os/:codigo', authorize('logistica.os.listar'), validarOS);

// Escalas
router.get('/verificar-funcionario/:id/:clienteId', authorize('logistica.escala.listar'), verificarFuncionario);
router.get('/escalas', authorize('logistica.escala.listar'), listEscalas);
router.post('/escalas', authorize('logistica.escala.criar'), createEscala);
router.post('/escalas/:id/duplicar', authorize('logistica.escala.criar'), duplicarEscala);
router.patch('/escalas/:id/cancelar', authorize('logistica.escala.editar'), cancelarEscala);
router.patch('/escalas/:id/nao-compareceu', authorize('logistica.escala.editar'), registrarNaoCompareceu);
router.patch('/escalas/:id/reverter-cancelamento', authorize('logistica.escala.editar'), reverterCancelamentoEscala);
router.patch('/escalas/:id', authorize('logistica.escala.editar'), updateEscala);
router.delete('/escalas/:id', authorize('logistica.escala.editar'), deleteEscala);

// Veículos
router.get('/veiculos', authorize('frota.veiculos.listar'), listVeiculos);
router.post('/veiculos', authorize('frota.veiculos.editar'), createVeiculo);
router.patch('/veiculos/:id', authorize('frota.veiculos.editar'), updateVeiculo);
router.patch('/veiculos/:id/manutencao', authorize('frota.veiculos.editar'), sendToMaintenance);
router.delete('/veiculos/:id', authorize('frota.veiculos.editar'), deleteVeiculo);

export default router;
