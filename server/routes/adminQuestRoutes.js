import {Router} from 'express';
import { protectSuperAdmin} from '../middleware/superAuthMiddleware.js';
import {createQuest,deleteQuest,getAllQuests} from '../controllers/AdminQuestController.js';
const router = Router();

router.use(protectSuperAdmin);

router.post('/', createQuest);
router.get('/', getAllQuests);
router.delete('/:id', deleteQuest);

export default router;