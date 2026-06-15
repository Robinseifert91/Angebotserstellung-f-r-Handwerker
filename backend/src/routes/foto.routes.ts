import { Router } from 'express';
import { uploadFoto, analyseFotos, deleteFoto } from '../controllers/foto.controller';
import { upload } from '../middleware/upload.middleware';

const router = Router();

router.post('/:id/fotos', upload.single('foto'), uploadFoto);
router.post('/:id/fotos/analyse', analyseFotos);
router.delete('/fotos/:fotoId', deleteFoto);

export default router;
