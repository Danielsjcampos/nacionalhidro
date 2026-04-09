import { Router } from 'express';
import {
    relatorioAtivos, relatorioCNHVencendo, relatorioAdmissoes,
    relatorioDesligamentos, relatorioLideres, relatorioASOs, relatorioGeral,
    relatorioPremios, relatorioPPP, relatorioVencimentosGeral
} from '../controllers/relatorios-rh.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/ativos', relatorioAtivos);           // ?tipo=CLT|PJ|TST&formato=csv
router.get('/cnh-vencendo', relatorioCNHVencendo); // ?formato=csv
router.get('/admissoes', relatorioAdmissoes);      // ?dataInicio=&dataFim=&formato=csv
router.get('/desligamentos', relatorioDesligamentos); // ?dataInicio=&dataFim=&formato=csv
router.get('/lideres', relatorioLideres);          // ?formato=csv
router.get('/asos', relatorioASOs);                // ?formato=csv
router.get('/geral', relatorioGeral);              // ?formato=csv
router.get('/premios', relatorioPremios);          // ?formato=csv
router.get('/ppp', relatorioPPP);                  // ?formato=csv
router.get('/vencimentos-geral', relatorioVencimentosGeral); // ?formato=csv

export default router;
