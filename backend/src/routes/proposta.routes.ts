import { Router } from 'express';
import {
  listPropostas, getProposta, createProposta, updateProposta,
  updatePropostaStatus, deleteProposta, gerarOSdeUnidade, gerarPropostaTecnica, enviarEmailProposta, gerarRevisao, gerarPDFPropostaWeb,
  dispararEquipe, getPropostasStats
} from '../controllers/proposta.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.use(authenticate);

router.get('/', authorize('comercial.propostas.listar'), listPropostas);
router.get('/stats', authorize('comercial.propostas.listar'), getPropostasStats);
router.get('/:id', authorize('comercial.propostas.listar'), getProposta);
router.post('/', authorize('comercial.propostas.criar'), createProposta);
router.patch('/:id', authorize('comercial.propostas.editar'), updateProposta);
router.patch('/:id/status', authorize('comercial.propostas.editar'), updatePropostaStatus);
router.post('/:id/enviar-email', authorize('comercial.propostas.editar'), upload.single('pdf'), enviarEmailProposta);
router.get('/:id/gerar-pdf', authorize('comercial.propostas.listar'), gerarPDFPropostaWeb);
router.post('/:id/gerar-os', authorize('comercial.propostas.criar'), gerarOSdeUnidade);
router.post('/:id/gerar-tecnica', authorize('comercial.propostas.criar'), gerarPropostaTecnica);
router.post('/:id/revisao', authorize('comercial.propostas.editar'), gerarRevisao);
router.post('/:id/disparar-equipe', authorize('comercial.propostas.editar'), dispararEquipe);
router.delete('/:id', authorize('comercial.propostas.excluir'), deleteProposta);

export default router;
