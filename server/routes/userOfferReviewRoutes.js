import {Router} from 'express'
import {createUserOfferReview} from '../controllers/userOfferReviewController.js'
import {protectUser} from '../middleware/authMiddleware.js'
const router = Router();

router.post('/',protectUser,createUserOfferReview);

export default router;