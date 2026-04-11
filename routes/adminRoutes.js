import express from "express";
import { protectAny, requireSuperAdmin } from "../middleware/authMiddleware.js";
import {
	updateUserRole,
	updateMerchantRole,
	bootstrapSuperAdmin
} from "../controllers/adminController.js";

const router = express.Router();

router.post("/bootstrap-super-admin", bootstrapSuperAdmin);
router.put("/users/:id/role", protectAny, requireSuperAdmin, updateUserRole);
router.put("/merchants/:id/role", protectAny, requireSuperAdmin, updateMerchantRole);

export default router;
