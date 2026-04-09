import { Router } from 'express';
import multer from 'multer';
import { parseXml, importarXml, listImportacoes } from '../controllers/importacaoXml.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticate);

router.post('/parse', upload.single('xml'), parseXml);       // POST /importacao-xml/parse
router.post('/importar', importarXml);                        // POST /importacao-xml/importar
router.get('/historico', listImportacoes);                     // GET  /importacao-xml/historico

export default router;
