import { Router } from 'express';
import {
    listContasReceber, createContaReceber, receberConta,
    getCobrancaKPIs, registrarCobranca, getHistoricoCobranca,
    criarNegociacao, listNegociacoes, pagarParcelaNegociacao,
    verificarQuebrasAcordo
} from '../controllers/cobranca.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

// KPIs
router.get('/kpis', authorize('financeiro.cobranca.listar'), getCobrancaKPIs);
router.post('/verificar-quebras', authorize('financeiro.cobranca.listar'), verificarQuebrasAcordo);

// Contas a Receber
router.get('/contas-receber', authorize('financeiro.cobranca.listar'), listContasReceber);
router.post('/contas-receber', authorize('financeiro.cobranca.criar'), createContaReceber);
router.patch('/contas-receber/:id/receber', authorize('financeiro.cobranca.criar'), receberConta);

// Histórico de Cobrança  
router.post('/cobrancas', authorize('financeiro.cobranca.criar'), registrarCobranca);
router.get('/cobrancas/:contaReceberId', authorize('financeiro.cobranca.listar'), getHistoricoCobranca);

// Negociações
router.get('/negociacoes', authorize('financeiro.cobranca.listar'), listNegociacoes);
router.post('/negociacoes', authorize('financeiro.cobranca.criar'), criarNegociacao);
router.patch('/negociacoes/parcelas/:id/pagar', authorize('financeiro.cobranca.criar'), pagarParcelaNegociacao);

export default router;
