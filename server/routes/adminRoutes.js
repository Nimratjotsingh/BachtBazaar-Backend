import express from "express";
import { protectSuperAdmin } from "../middleware/superAuthMiddleware.js";
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
	deleteMerchant,
	getDashboardStats,
	blockMerchant,
	rejectMerchant
} from "../controllers/adminController.js";

const router = express.Router();


// Bootstrap
router.post("/bootstrap-super-admin", bootstrapSuperAdmin);

// User management
router.get("/users",protectSuperAdmin, listUsers);
router.get("/users/:id", protectSuperAdmin, getUser);
router.put("/users/:id", protectSuperAdmin, updateUser);
router.put("/users/:id/status", protectSuperAdmin, updateUserStatus);
router.delete("/users/:id", protectSuperAdmin, deleteUser);
router.put("/users/:id/role", protectSuperAdmin, updateUserRole);

// Merchant management
router.get("/merchants", protectSuperAdmin, listMerchants);
router.get("/merchants/:id", protectSuperAdmin, getMerchant);
router.put("/merchants/:id", protectSuperAdmin, updateMerchant);

router.put("/merchants/:id/verify", protectSuperAdmin, verifyMerchant);
router.put("/merchants/:id/status", protectSuperAdmin, updateMerchantStatus);

router.put("/merchants/:id/block", protectSuperAdmin, blockMerchant);
router.put("/merchants/:id/reject", protectSuperAdmin, rejectMerchant);

router.delete("/merchants/:id", protectSuperAdmin, deleteMerchant);
router.put("/merchants/:id/role", protectSuperAdmin, updateMerchantRole);
router.get("/stats", protectSuperAdmin, getDashboardStats);

export default router;
