import express from "express";
import { protectSuperAdmin} from "../middleware/superAuthMiddleware.js";
import { 
  createStaff, 
  listStaff, 
  getStaffById, 
  updateStaff, 
  deleteStaff 
} from "../controllers/adminStaffController.js";

const router = express.Router();
router.use(protectSuperAdmin);

router.post("/",  createStaff);
router.get("/",  listStaff);
router.get("/:id",  getStaffById);
router.put("/:id",  updateStaff);
router.delete("/:id",  deleteStaff);

export default router;