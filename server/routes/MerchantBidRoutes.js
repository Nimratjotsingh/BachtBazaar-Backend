
import express from "express";
import { 
  submitMerchantBid, 
  getMerchantBidsHistory,
  getBidsForUserRequest,
  updateUserBidStatus,
  closeMerchantBid
} from "../controllers/MerchantBidController.js";
import { protectUser } from "../middleware/authMiddleware.js"; // Standard consumer security gate
import { protectMerchant } from "../middleware/authMiddleware.js"; // Standard merchant security gate






const router = express.Router();

// Merchant Interfaces Paths
router.post("/merchant/submit", protectMerchant, submitMerchantBid);
router.get("/merchant/history", protectMerchant, getMerchantBidsHistory);
router.patch("/merchant/close/:bidId", protectMerchant, closeMerchantBid);

// Consumer Interfaces Paths
router.get("/user/request/:requestId", protectUser, getBidsForUserRequest);
router.patch("/user/:bidId/status", protectUser, updateUserBidStatus);

export default router;