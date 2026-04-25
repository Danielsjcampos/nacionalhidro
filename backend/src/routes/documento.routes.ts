import { Router } from 'express';
import { listDocumentos, createDocumento, updateDocumento, deleteDocumento } from '../controllers/documento.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', listDocumentos);       // ?tipo=PGR&status=VALIDO&vencimento=VENCIDO|VENCENDO
router.post('/', createDocumento);
router.put('/:id', updateDocumento);
router.delete('/:id', deleteDocumento);

export default router;
