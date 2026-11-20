import express from "express";
import { getMerchantOfferReviews ,getMerchantReviewsByOfferId} from "../controllers/merchantUserOfferReviewController.js";
import { protectMerchant } from "../middleware/authMiddleware.js"; // Adjust to your merchant auth middleware

const router = express.Router();

// GET /api/merchant/offer-reviews?page=1&limit=10&offerId=...&rating=5&verifiedOnly=true&search=...
router.get("/", protectMerchant, getMerchantOfferReviews);

router.get('/:offerId',protectMerchant,getMerchantReviewsByOfferId)

export default router;