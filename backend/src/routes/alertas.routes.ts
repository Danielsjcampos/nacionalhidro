import { Router } from 'express';
import { getAlertasRH, getAlertasVeiculos, getAlertasGerais } from '../controllers/alertas.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// T07: RH alerts (ASO, férias, experiência)
router.get('/rh', getAlertasRH);

// T08: Vehicle document alerts (CRLV, ANTT, tacógrafo, seguro)
router.get('/veiculos', getAlertasVeiculos);

// Dashboard unificado de alertas
router.get('/geral', getAlertasGerais);

export default router;
