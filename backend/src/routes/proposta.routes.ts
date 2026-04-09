import { Router } from 'express';
import {
  listPropostas, getProposta, createProposta, updateProposta,
  updatePropostaStatus, deleteProposta, gerarOSdeUnidade, gerarPropostaTecnica, enviarEmailProposta, gerarRevisao, gerarPDFPropostaWeb,
  dispararEquipe
} from '../controllers/proposta.controller';
import { authenticate } from '../middleware/auth.middleware';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.use(authenticate);

router.get('/', listPropostas);
router.get('/:id', getProposta);
router.post('/', createProposta);
router.patch('/:id', updateProposta);
router.patch('/:id/status', updatePropostaStatus);
router.post('/:id/enviar-email', upload.single('pdf'), enviarEmailProposta);
router.get('/:id/gerar-pdf', gerarPDFPropostaWeb);
router.post('/:id/gerar-os', gerarOSdeUnidade);
router.post('/:id/gerar-tecnica', gerarPropostaTecnica);
router.post('/:id/revisao', gerarRevisao);
router.post('/:id/disparar-equipe', dispararEquipe);
router.delete('/:id', deleteProposta);

export default router;

