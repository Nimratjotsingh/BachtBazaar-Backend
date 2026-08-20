import express from "express";
import {
  getInteractedUsersForMerchant,
  createMilestoneGoal,
} from "../controllers/milestoneController.js";
import { protectMerchant } from "../middleware/authMiddleware.js";

const router = express.Router();

// Enforce Merchant Authentication
router.use(protectMerchant);

// GET /api/merchant/milestones/eligible-users -> List users from analytics
router.get("/eligible-users", getInteractedUsersForMerchant);

// POST /api/merchant/milestones/create -> Create/assign progress goals to specific users
router.post("/create", createMilestoneGoal);

export default router;