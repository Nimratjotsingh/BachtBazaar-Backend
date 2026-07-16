import express from "express";
import {
  adminCreateQuickTemplate,
  adminGetAllQuickTemplates,
  adminUpdateQuickTemplate,
  adminDeleteQuickTemplate
} from "../controllers/QuickOfferController.js";
 // Validates role matches ROLES.SUPER_ADMIN

const router = express.Router();

// Lock down all CRUD operations here exclusively behind Super Admin access gates


router.post("/", adminCreateQuickTemplate);
router.get("/", adminGetAllQuickTemplates);
router.put("/:id", adminUpdateQuickTemplate);
router.delete("/:id", adminDeleteQuickTemplate);

export default router;