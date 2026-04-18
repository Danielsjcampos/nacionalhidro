import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
    listAdmissoes, getAdmissao, createAdmissao,
    updateAdmissao, moverEtapaAdmissao, deleteAdmissao, getAdmissaoStats, assinarContrato,
    getAdmissaoPortal, submitAdmissaoPortal, generateFormPDF, generateAsoPDF
} from '../controllers/admissao.controller';

import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Configuração do Multer para o Portal de Admissão
const uploadDir = path.join(__dirname, '../../public/uploads/admissoes');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'adm-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Rotas PÚBLICAS (Portal do Candidato)
router.get('/:id/portal', getAdmissaoPortal);
router.post('/:id/portal', upload.array('documentos', 15), submitAdmissaoPortal);

// Rotas PROTEGIDAS (RH)
router.use(authenticate);

router.get('/', listAdmissoes);
router.get('/stats', getAdmissaoStats);
router.get('/:id', getAdmissao);
router.post('/', createAdmissao);
router.patch('/:id/mover', moverEtapaAdmissao);
router.post('/:id/sign', assinarContrato);
router.post('/:id/pdf-ficha', generateFormPDF);
router.post('/:id/pdf-aso', generateAsoPDF);
router.patch('/:id', updateAdmissao);
router.delete('/:id', deleteAdmissao);


export default router;
