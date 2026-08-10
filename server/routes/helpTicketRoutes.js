import express from "express";
import {
  createHelpTicket,
  replyToTicketByRequester,
  replyToTicketByAdmin,
  getMyHelpTickets,
  getHelpTicketById,
  getAllHelpTicketsAdmin,
} from "../controllers/helpTicketController.js";

import {protectSuperAdmin as adminAuthMiddleware } from "../middleware/superAuthMiddleware.js";
import {protectMerchant,protectUser} from '../middleware/authMiddleware.js'
const router = express.Router();

// Merchant / User Routes (Protected by Auth Middleware)
router.post("/user/tickets", protectUser, createHelpTicket);
router.post("/user/tickets/:id/reply", protectUser, replyToTicketByRequester);
router.get("/user/tickets/my-tickets", protectUser, getMyHelpTickets);
router.get("/user/tickets/:id", protectUser, getHelpTicketById);

router.post("/merchant/tickets", protectMerchant, createHelpTicket);
router.post("/merchant/tickets/:id/reply", protectMerchant, replyToTicketByRequester);
router.get("/merchant/tickets/my-tickets", protectMerchant, getMyHelpTickets);
router.get("/merchant/tickets/:id", protectMerchant, getHelpTicketById);

// Admin Routes
router.get("/admin/tickets", adminAuthMiddleware, getAllHelpTicketsAdmin);
router.post("/admin/tickets/:id/reply", adminAuthMiddleware, replyToTicketByAdmin);

export default router;