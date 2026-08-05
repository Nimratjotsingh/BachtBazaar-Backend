import express from "express";
import {
  createLeague,
  getAllLeagues,
  updateLeague,
  deleteLeague,
  createTask,
  getAllTasks,
  updateTask,
  deleteTask,
  getMerchantGamificationDashboard,
  getLeagueLeaderboard,
} from "../controllers/leagueController.js";
import { protectSuperAdmin as protectAdmin } from "../middleware/superAuthMiddleware.js";
import { protectMerchant } from "../middleware/authMiddleware.js";
import uploadBadgeIcon from "../middleware/uploadSec.js";

const router = express.Router();

// ==========================================
// ADMIN LEAGUE ROUTES (WITH BADGE UPLOAD)
// ==========================================
router.post(
  "/admin/leagues",
  protectAdmin,
  uploadBadgeIcon.single("badgeIcon"),
  createLeague
);

router.get("/admin/leagues", protectAdmin, getAllLeagues);

router.put(
  "/admin/leagues/:id",
  protectAdmin,
  uploadBadgeIcon.single("badgeIcon"),
  updateLeague
);

router.delete("/admin/leagues/:id", protectAdmin, deleteLeague);

// ==========================================
// ADMIN TASK ROUTES
// ==========================================
router.post("/admin/tasks", protectAdmin, createTask);
router.get("/admin/tasks", protectAdmin, getAllTasks);
router.put("/admin/tasks/:id", protectAdmin, updateTask);
router.delete("/admin/tasks/:id", protectAdmin, deleteTask);

// ==========================================
// MERCHANT GAMIFICATION DASHBOARD ROUTES
// ==========================================
router.get(
  "/merchant/dashboard",
  protectMerchant,
  getMerchantGamificationDashboard
);
router.get("/merchant/leaderboard", protectMerchant, getLeagueLeaderboard);
 


export default router;