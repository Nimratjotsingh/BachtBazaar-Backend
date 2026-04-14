import express from "express";
import { protectAny, requireSuperAdmin } from "../middleware/authMiddleware.js";
import {
	updateUserRole,
	updateMerchantRole,
	bootstrapSuperAdmin,
	// User management
	listUsers,
	getUser,
	updateUser,
	updateUserStatus,
	deleteUser,
	// Merchant management
	listMerchants,
	getMerchant,
	updateMerchant,
	verifyMerchant,
	updateMerchantStatus,
	deleteMerchant
} from "../controllers/adminController.js";

const router = express.Router();


// Bootstrap
router.post("/bootstrap-super-admin", bootstrapSuperAdmin);

// User management
router.get("/users", protectAny, requireSuperAdmin, listUsers);
router.get("/users/:id", protectAny, requireSuperAdmin, getUser);
router.put("/users/:id", protectAny, requireSuperAdmin, updateUser);
router.put("/users/:id/status", protectAny, requireSuperAdmin, updateUserStatus);
router.delete("/users/:id", protectAny, requireSuperAdmin, deleteUser);
router.put("/users/:id/role", protectAny, requireSuperAdmin, updateUserRole);

// Merchant management
router.get("/merchants", protectAny, requireSuperAdmin, listMerchants);
router.get("/merchants/:id", protectAny, requireSuperAdmin, getMerchant);
router.put("/merchants/:id", protectAny, requireSuperAdmin, updateMerchant);
router.put("/merchants/:id/verify", protectAny, requireSuperAdmin, verifyMerchant);
router.put("/merchants/:id/status", protectAny, requireSuperAdmin, updateMerchantStatus);
router.delete("/merchants/:id", protectAny, requireSuperAdmin, deleteMerchant);
router.put("/merchants/:id/role", protectAny, requireSuperAdmin, updateMerchantRole);

export default router;
