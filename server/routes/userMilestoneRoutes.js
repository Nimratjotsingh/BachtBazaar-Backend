import express from "express";
import { getMyMilestoneGoals } from "../controllers/userProgressController.js";
import { protectUser } from "../middleware/authMiddleware.js";

const router = express.Router();

// Enforce Customer/User Authentication
router.use(protectUser);

// GET /api/user/milestones -> Get active progress bars, percentages & unlocked rewards
router.get("/", getMyMilestoneGoals);

export default router;