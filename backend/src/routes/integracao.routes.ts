import { Router } from 'express';
import * as integracaoController from '../controllers/integracao.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Dashboard e Alertas Globais (Módulo Viviane)
router.get('/dashboard', integracaoController.getAllIntegracoes);
router.get('/alertas', integracaoController.getIntegracoesAlertas);
router.get('/pendencias', integracaoController.getIntegracoesPendentes);

// Relacionados ao Funcionário (Cadastrar, Listar, Deletar Integrações de um funcionário)
router.get('/funcionario/:funcionarioId', integracaoController.getIntegracoesByFuncionario);
router.post('/', integracaoController.createIntegracao);
router.put('/:id', integracaoController.updateIntegracao);
router.delete('/:id', integracaoController.deleteIntegracao);

// Relacionados ao Cliente (Listar e atualizar opções disponíveis no Cliente)
router.get('/cliente/:clienteId/opcoes', integracaoController.getOpcoesIntegracaoCliente);
router.put('/cliente/:clienteId/opcoes', integracaoController.updateOpcoesIntegracaoCliente);

export default router;
