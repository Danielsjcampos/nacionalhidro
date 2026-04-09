import { Router } from 'express';
import {
    listContasReceber, createContaReceber, receberConta,
    getCobrancaKPIs, registrarCobranca, getHistoricoCobranca,
    criarNegociacao, listNegociacoes, pagarParcelaNegociacao,
    verificarQuebrasAcordo
} from '../controllers/cobranca.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

// KPIs
router.get('/kpis', getCobrancaKPIs);
router.post('/verificar-quebras', verificarQuebrasAcordo);

// Contas a Receber
router.get('/contas-receber', listContasReceber);
router.post('/contas-receber', createContaReceber);
router.patch('/contas-receber/:id/receber', receberConta);

// Histórico de Cobrança  
router.post('/cobrancas', registrarCobranca);
router.get('/cobrancas/:contaReceberId', getHistoricoCobranca);

// Negociações
router.get('/negociacoes', listNegociacoes);
router.post('/negociacoes', criarNegociacao);
router.patch('/negociacoes/parcelas/:id/pagar', pagarParcelaNegociacao);

export default router;
