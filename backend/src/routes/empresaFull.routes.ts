import { Router } from 'express';
import {
  listEmpresasFull, getEmpresaFull, createEmpresaFull, updateEmpresaFull,
  listHistoricos, createHistorico, updateHistorico, deleteHistorico,
  listClienteDocumentos, createClienteDocumento, softDeleteClienteDocumento,
  listClienteContatos, upsertClienteContatos,
} from '../controllers/empresaFull.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

// ── Empresas (CRUD completo com bancos) ──────────────────────────
router.get('/empresas', listEmpresasFull);
router.get('/empresas/:id', getEmpresaFull);
router.post('/empresas', createEmpresaFull);
router.patch('/empresas/:id', updateEmpresaFull);

// ── Histórico de Contatos ────────────────────────────────────────
router.get('/historico-contatos', listHistoricos);
router.post('/historico-contatos', createHistorico);
router.patch('/historico-contatos/:id', updateHistorico);
router.delete('/historico-contatos/:id', deleteHistorico);

// ── Cliente Documentos ────────────────────────────────────────────
router.get('/cliente-documentos', listClienteDocumentos);
router.post('/cliente-documentos', createClienteDocumento);
router.delete('/cliente-documentos/:id', softDeleteClienteDocumento);

// ── Cliente Contatos (sync completo por clienteId) ────────────────
router.get('/cliente-contatos', listClienteContatos);
router.put('/cliente-contatos/:clienteId', upsertClienteContatos);

export default router;
