import express from "express";
import { syncAndCheckContacts } from "../controllers/userContactController.js";
import { protectUser } from "../middleware/authMiddleware.js";

const router = express.Router();

// Enforce Customer Authentication
router.use(protectUser);

// POST /api/user/contacts/sync -> Sync address book & return on-platform vs non-platform contacts
router.post("/sync", syncAndCheckContacts);

export default router;