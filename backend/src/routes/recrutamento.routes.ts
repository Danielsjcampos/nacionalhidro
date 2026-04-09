import { Router } from 'express';
import {
    listVagas, createVaga, updateVaga,
    listCandidatos, createCandidato, updateCandidato, moverEtapa, deleteCandidato,
    getRecrutamentoStats, getVagaPublica, inscricaoPublica, notificarCandidato,
    avaliarCandidatoIA, getFunilConversao
} from '../controllers/recrutamento.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// ─── PUBLIC (sem auth) ──────────────────────────────
router.get('/vagas/:id/publica', getVagaPublica);
router.post('/inscricao-publica', inscricaoPublica);

// ─── PROTECTED ──────────────────────────────────────
router.use(authenticate);

// Vagas
router.get('/vagas', listVagas);
router.post('/vagas', createVaga);
router.patch('/vagas/:id', updateVaga);

// Candidatos
router.get('/candidatos', listCandidatos);
router.post('/candidatos', createCandidato);
router.patch('/candidatos/:id', updateCandidato);
router.patch('/candidatos/:id/mover', moverEtapa);
router.post('/candidatos/:id/notify', notificarCandidato);
router.post('/candidatos/:id/triagem-ia', avaliarCandidatoIA);
router.delete('/candidatos/:id', deleteCandidato);

// Stats
router.get('/stats', getRecrutamentoStats);
router.get('/funil', getFunilConversao); // T16: ?vagaId=&periodo=30

export default router;
