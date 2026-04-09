import { Router } from 'express';
import { getFluxoCaixa, getRelatorioGerencial, getFluxoCaixaDiario, getFluxoCaixaDiarioDetalhes } from '../controllers/fluxoCaixa.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/fluxo-caixa', getFluxoCaixa);
router.get('/fluxo-caixa/diario', getFluxoCaixaDiario);
router.get('/fluxo-caixa/diario/:data/detalhes', getFluxoCaixaDiarioDetalhes);
router.get('/relatorio-gerencial', getRelatorioGerencial);

export default router;
