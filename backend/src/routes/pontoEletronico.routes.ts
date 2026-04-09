import { Router } from 'express';
import { listPontos, listPontosTiquetaque, registrarPonto, deletePonto, importarTicTac, resumoPonto, exportarPontoCSV, sincronizarTiquetaque } from '../controllers/pontoEletronico.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/exportar', exportarPontoCSV);           // GET ?mes=3&ano=2026 → CSV download
router.get('/resumo', resumoPonto);                   // ?mes=3&ano=2026
router.get('/tiquetaque', listPontosTiquetaque);
router.get('/', listPontos);
router.post('/', registrarPonto);
router.delete('/:id', deletePonto);
router.post('/importar-tictac', importarTicTac);      // POST body: { dados: "csv string" or array }
router.post('/sincronizar-tiquetaque', sincronizarTiquetaque);

export default router;
