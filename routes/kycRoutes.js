import express from "express";
import { protectAny } from "../middleware/authMiddleware.js";
import { verifyKyc } from "../controllers/kycController.js";

const router = express.Router();

router.post("/verify", protectAny, verifyKyc);

export default router;
