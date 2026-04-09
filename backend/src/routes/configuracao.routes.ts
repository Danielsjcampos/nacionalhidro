import { Router } from 'express';
import { getConfig, updateConfig } from '../controllers/configuracao.controller';

const router = Router();

router.get('/', getConfig);
router.post('/', updateConfig);
// PUT works same as POST for singleton upsert
router.put('/', updateConfig);

export default router;
