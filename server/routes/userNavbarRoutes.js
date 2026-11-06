import express from "express";
import {
  getUserNavbarState,
  setNavbarIndicator,
  closeNavbarIndicator,
} from "../controllers/NavbarController.js";
import { protectUser} from "../middleware/authMiddleware.js"; // Adjust to your unified auth middleware name

const router = express.Router();

// --- Navbar State Management Endpoints ---
router.get("/", protectUser, getUserNavbarState);
router.post("/", protectUser, setNavbarIndicator);
router.patch("/close", protectUser, closeNavbarIndicator);

export default router;