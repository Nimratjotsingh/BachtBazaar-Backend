import {createSubOfferType,deleteSubOfferType,getSubOffersByParent,updateSubOfferType} from '../controllers/subOfferTypeController.js';
import { Router } from 'express';
import {protectSuperAdmin} from '../middleware/superAuthMiddleware.js';
import upload from '../middleware/uploadSec.js'
const router = Router();



router.get('/:id',getSubOffersByParent);

router.post('/',protectSuperAdmin,upload.single('icon'),createSubOfferType);

router.put('/:id',protectSuperAdmin,upload.single('icon'),updateSubOfferType);

router.delete('/:id',protectSuperAdmin,deleteSubOfferType);

export default router;