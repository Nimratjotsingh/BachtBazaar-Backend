import express from "express";
import { redeemOffer,userSelfClaimOffer,getUserOfferHistory, cancelUserOfferRedemption } from "../controllers/offerRedemptionController.js";
import { protectUser } from "../middleware/authMiddleware.js"; // Standard consumer authentication middleware

const router = express.Router();

// POST /api/offers/:offerId/redeem -> Reserves an offer and generates a QR code/token
router.get("/history", protectUser, getUserOfferHistory);
router.post("/:offerId/redeem", protectUser, redeemOffer);

router.post("/:offerId/claim-direct", protectUser, userSelfClaimOffer);

router.delete("/:redemptionId/delete", protectUser, cancelUserOfferRedemption);





export default router;