import { Router } from 'express';
import {
    listContasPagar, createContaPagar, baixarContaPagar, editarContaPagar,
    baixarLoteContasPagar, agruparFatura, cancelarContaPagar, revogarContaPagar,
    corrigirBaixaContaPagar, relatorioContasPagar, exportarLoteExcel, exportarLoteCnab,
    listContasReceber, createContaReceber, receberConta, corrigirBaixaContaReceber,
    revogarContaReceber, cancelarContaReceber, receberLoteContasReceber,
    getFinanceiroStats
} from '../controllers/financeiro.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

// Stats
router.get('/stats', getFinanceiroStats);

// Contas a Pagar
router.get('/contas-pagar', listContasPagar);
router.post('/contas-pagar', createContaPagar);
router.put('/contas-pagar/:id', editarContaPagar);
router.patch('/contas-pagar/:id/baixar', baixarContaPagar);
router.post('/contas-pagar/baixar-lote', baixarLoteContasPagar);
router.post('/contas-pagar/agrupar-fatura', agruparFatura);
router.patch('/contas-pagar/:id/cancelar', cancelarContaPagar);
router.patch('/contas-pagar/:id/revogar', revogarContaPagar);
router.patch('/contas-pagar/:id/corrigir-baixa', corrigirBaixaContaPagar);
router.get('/contas-pagar/relatorio', relatorioContasPagar);
router.get('/contas-pagar/exportar-excel', exportarLoteExcel);
router.get('/contas-pagar/exportar-cnab', exportarLoteCnab);

// Backward compat
router.patch('/contas-pagar/:id/pagar', baixarContaPagar);

// Contas a Receber
router.get('/contas-receber', listContasReceber);
router.post('/contas-receber', createContaReceber);
router.patch('/contas-receber/:id/receber', receberConta);
router.post('/contas-receber/receber-lote', receberLoteContasReceber);
router.patch('/contas-receber/:id/corrigir-baixa', corrigirBaixaContaReceber);
router.patch('/contas-receber/:id/revogar', revogarContaReceber);
router.patch('/contas-receber/:id/cancelar', cancelarContaReceber);

export default router;
