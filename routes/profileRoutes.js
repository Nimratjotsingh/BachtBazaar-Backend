import express from "express";
import { protectAny } from "../middleware/authMiddleware.js";
import { getProfile } from "../controllers/profileController.js";

const router = express.Router();

router.get("/", protectAny, getProfile);

export default router;
