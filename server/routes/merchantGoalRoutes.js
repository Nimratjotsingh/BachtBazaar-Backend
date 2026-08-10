import { Router } from "express";
const router = Router();

import {
  createMerchantGoal,
  getMerchantGoals,
  deleteMerchantGoal,
} from "../controllers/merchantGoalController.js";
import {protectMerchant} from '../middleware/authMiddleware.js'

router.use(protectMerchant);

router.post("/", createMerchantGoal);
router.get("/", getMerchantGoals);
router.delete("/:id", deleteMerchantGoal);

export default router;