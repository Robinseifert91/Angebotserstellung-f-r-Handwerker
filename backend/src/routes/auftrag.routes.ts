import { Router } from 'express';
import { getAuftraege, createAuftrag, getAuftrag, updateAuftrag, deleteAuftrag } from '../controllers/auftrag.controller';
import { generateAngebot } from '../controllers/angebot.controller';

const router = Router();

router.get('/', getAuftraege);
router.post('/', createAuftrag);
router.get('/:id', getAuftrag);
router.put('/:id', updateAuftrag);
router.delete('/:id', deleteAuftrag);
router.post('/:id/angebot', generateAngebot);

export default router;
