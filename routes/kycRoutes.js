import express from "express";
import { verifyKyc } from "../controllers/kycController.js";

const router = express.Router();

router.post("/verify", verifyKyc);

export default router;
