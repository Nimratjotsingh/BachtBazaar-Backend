import express from "express";
import {
  listCallbacksAdmin,
  updateCallbackStatusAdmin,
} from "../controllers/adminCallbackController.js";
import { protectSuperAdmin } from "../middleware/superAuthMiddleware.js";

const router = express.Router();

router.use(protectSuperAdmin);

router.get("/", listCallbacksAdmin);
router.patch("/:id/status", updateCallbackStatusAdmin);

export default router;