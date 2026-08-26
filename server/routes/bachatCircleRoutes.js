import express from "express";
import {
  createCircle,
  getMyCircles,
  getCircleDetails,
  updateMemberRole,
  leaveOrRemoveMember,
  inviteToCircle,
  getMyPendingInvitations,
  respondToInvitation,
  shareOfferInCircles,
  getCircleSharedOffers,
  deleteSharedOffer,
} from "../controllers/bachatCircleController.js";
import { protectUser } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authenticated user
router.use(protectUser);

// Circle CRUD & Membership
router.post("/", createCircle);
router.get("/my-circles", getMyCircles);
router.get("/:circleId", getCircleDetails);
router.patch("/:circleId/member-role", updateMemberRole);
router.delete("/:circleId/leave", leaveOrRemoveMember);

// Invitations
router.post("/:circleId/invite", inviteToCircle);
router.get("/invitations/my-invitations", getMyPendingInvitations);
router.post("/invitations/:invitationId/respond", respondToInvitation);

// Shared Offers
router.post("/share/offers", shareOfferInCircles);
router.get("/:circleId/offers", getCircleSharedOffers);
router.delete("/offers/:sharedOfferId", deleteSharedOffer);

export default router;