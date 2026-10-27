import express from "express";
import { protectMerchant } from "../middleware/authMiddleware.js"; // Adjust to your auth guard
import { 
  createMerchantEditRequest, 
  getMerchantEditRequests, 
  applyMerchantEdit
} from "../controllers/merchantEditRequestController.js";

const router = express.Router();

// Submit a new edit request
router.post("/", protectMerchant, createMerchantEditRequest);

// Check status and view history of all edit requests
router.get("/", protectMerchant, getMerchantEditRequests);

// Apply approved changes for a specific request ID
router.post("/:requestId/apply", protectMerchant, applyMerchantEdit);

export default router;