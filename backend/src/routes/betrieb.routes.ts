import { Router } from 'express';
import { getBetrieb, updateBetrieb, uploadLogo } from '../controllers/betrieb.controller';
import { upload } from '../middleware/upload.middleware';

const router = Router();

router.get('/', getBetrieb);
router.put('/', updateBetrieb);
router.post('/logo', upload.single('logo'), uploadLogo);

export default router;
