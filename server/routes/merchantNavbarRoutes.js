import express from "express";
import {
  getUserNavbarState,
  setNavbarIndicator,
  closeNavbarIndicator,
} from "../controllers/NavbarController.js";
import { protectMerchant} from "../middleware/authMiddleware.js"; // Adjust to your unified auth middleware name

const router = express.Router();

// --- Navbar State Management Endpoints ---
router.get("/", protectMerchant, getUserNavbarState);
router.post("/", protectMerchant, setNavbarIndicator);
router.patch("/close", protectMerchant, closeNavbarIndicator);

export default router;