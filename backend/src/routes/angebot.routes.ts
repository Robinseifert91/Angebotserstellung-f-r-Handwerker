import { Router } from 'express';
import { getAngebot, updateAngebot, updatePositionen, exportPdf } from '../controllers/angebot.controller';

const router = Router();

router.get('/:id', getAngebot);
router.put('/:id', updateAngebot);
router.put('/:id/positionen', updatePositionen);
router.get('/:id/export', exportPdf);

export default router;
