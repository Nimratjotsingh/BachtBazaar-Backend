import express from "express";
import { protectSuperAdmin as verifyAdmin } from "../middleware/superAuthMiddleware.js"; // Adjust to your admin auth guard
import { 
  listMerchantEditRequests, 
  reviewMerchantEditRequest, 
  getMerchantCompleteDetailsForAdmin 
} from "../controllers/adminMerchantEditController.js";

const router = express.Router();

// List all edit requests (supports ?status=pending)
router.get("/", verifyAdmin, listMerchantEditRequests);

// Review (allow or decline) an edit request
router.patch("/:requestId/review", verifyAdmin, reviewMerchantEditRequest);

// Inspect complete merchant details (profile, shops, docs, history)
router.get("/:id/complete-details", verifyAdmin, getMerchantCompleteDetailsForAdmin);

export default router;