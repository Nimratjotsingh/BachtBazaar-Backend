import express from "express";
import { 
  claimOfferInStore, 
  getMerchantOfferAnalytics 
} from "../controllers/offerRedemptionController.js";
import { protectMerchant } from "../middleware/authMiddleware.js"; // Merchant-specific authentication middleware

const router = express.Router();


router.post('/',protectMerchant,claimOfferInStore);
// GET /api/merchant/offers/analytics -> Displays redeemed, claimed, and remaining limit metrics
router.get("/analytics", protectMerchant, getMerchantOfferAnalytics);

export default router;