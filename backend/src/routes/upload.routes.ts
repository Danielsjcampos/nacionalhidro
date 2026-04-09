import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Ensure public/uploads directory exists
const uploadDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

router.post('/', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: { message: 'Nenhum arquivo enviado' } });
        }
        
        // Create full URL (using /uploads path because Express usually maps public folder to root)
        const url = `/uploads/${req.file.filename}`;
        
        return res.status(200).json({ url });
    } catch (error) {
        console.error('Erro no upload:', error);
        return res.status(500).json({ error: { message: 'Erro interno no upload' } });
    }
});

export default router;
