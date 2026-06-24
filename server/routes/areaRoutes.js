import express from "express";
import { 
  createArea, 
  getAreasByCity, 
  getAllAreasAdmin, 
  updateArea, 
  deleteArea 
} from "../controllers/areaController.js";
import { protectSuperAdmin as protectAdmin} from "../middleware/superAuthMiddleware.js"; // Enforce admin check rules

const router = express.Router();

// Public / Mobile Client Endpoint (Dropdown lookup filter)
// e.g., GET /api?city=bathinda
router.get("/", getAreasByCity);

// Secured Administrative Routes
router.get("/admin-list", protectAdmin, getAllAreasAdmin);
router.post("/create", protectAdmin, createArea);
router.put("/update/:id", protectAdmin, updateArea);
router.delete("/delete/:id", protectAdmin, deleteArea);

export default router;