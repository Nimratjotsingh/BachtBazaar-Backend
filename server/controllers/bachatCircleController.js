import mongoose from "mongoose";
import BachatCircle from "../models/BachatCircleModel.js";
import CircleInvitation from "../models/CircleInvitationModel.js";
import CircleSharedOffer from "../models/CircleSharedOffers.js";
import User from "../models/userModel.js";
import Offer from "../models/offerModel.js";
import { notifyUserForCircleInvitation,notifyMembersForSharedOffer, notifyInviterOnResponse } from "../utils/circleNotificationHelper.js";

// Helper: Normalize phone numbers (strips spaces, dashes)
// Helper: Normalize phone numbers and ensure '+91' country code prefix
const normalizePhone = (phone) => {
  if (!phone) return "";

  // 1. Remove all spaces, dashes, parentheses, and special characters except leading '+'
  let cleaned = phone.toString().trim().replace(/[\s\-()]/g, "");

  // 2. Remove leading '0' if present (common local trunk prefix)
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1);
  }

  // 3. Check and attach '+91' prefix
  if (cleaned.startsWith("+91")) {
    return cleaned;
  } else if (cleaned.startsWith("91") && cleaned.length === 12) {
    return `+${cleaned}`;
  } else if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }

  // Fallback if already starts with another '+' or raw string
  return cleaned.startsWith("+") ? cleaned : `+91${cleaned}`;
};

/**
 * =========================================================================
 * 1. CIRCLE MANAGEMENT (Create, Update, Details, Leave)
 * =========================================================================
 */

/**
 * POST /api/circles
 * Create a new Bachat Circle. The creator becomes ADMIN automatically.
 */
export const createCircle = async (req, res) => {
  try {
    const { name, description, icon } = req.body;
    const userId = req.user._id;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Circle name is required.",
      });
    }

    const newCircle = new BachatCircle({
      name: name.trim(),
      description: description ? description.trim() : "",
      icon: icon || null,
      createdBy: userId,
      members: [
        {
          userId,
          role: "ADMIN",
          joinedAt: new Date(),
        },
      ],
    });

    await newCircle.save();

    const populatedCircle = await BachatCircle.findById(newCircle._id)
      .populate("members.userId", "name phone profileImage")
      .populate("createdBy", "name phone profileImage")
      .lean();

    return res.status(201).json({
      success: true,
      message: "Bachat Circle created successfully.",
      data: populatedCircle,
    });
  } catch (error) {
    console.error("Create Circle Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create circle.",
      error: error.message,
    });
  }
};

/**
 * GET /api/circles/my-circles
 * Get all circles the authenticated user is currently a member of.
 */
export const getMyCircles = async (req, res) => {
  try {
    const userId = req.user._id;

    const circles = await BachatCircle.find({
      "members.userId": userId,
      isActive: true,
    })
      .populate("createdBy", "name profileImage")
      .populate("members.userId", "name phone profileImage")
      .sort({ updatedAt: -1 })
      .lean();

    // Attach user's specific role in each circle
    const formatted = circles.map((circle) => {
      const currentMembership = circle.members.find(
        (m) => m.userId?._id?.toString() === userId.toString()
      );
      return {
        ...circle,
        myRole: currentMembership?.role || "MEMBER",
        memberCount: circle.members.length,
      };
    });

    return res.status(200).json({
      success: true,
      total: formatted.length,
      data: formatted,
    });
  } catch (error) {
    console.error("Get My Circles Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user circles.",
      error: error.message,
    });
  }
};

/**
 * GET /api/circles/:circleId
 * Get circle details, members list, and pending invites (if Admin/Co-Admin).
 */
export const getCircleDetails = async (req, res) => {
  try {
    const { circleId } = req.params;
    const userId = req.user._id;

    const circle = await BachatCircle.findOne({ _id: circleId, isActive: true })
      .populate("members.userId", "name phone profileImage")
      .populate("createdBy", "name profileImage")
      .lean();

    if (!circle) {
      return res.status(404).json({
        success: false,
        message: "Bachat Circle not found or has been deactivated.",
      });
    }

    const membership = circle.members.find(
      (m) => m.userId?._id?.toString() === userId.toString()
    );

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not a member of this circle.",
      });
    }

    let pendingInvitations = [];
    if (membership.role === "ADMIN" || membership.role === "CO_ADMIN") {
      pendingInvitations = await CircleInvitation.find({
        circleId,
        status: "PENDING",
        expiresAt: { $gt: new Date() },
      })
        .populate("invitedBy", "name phone")
        .populate("invitedUserId", "name phone profileImage")
        .lean();
    }

    return res.status(200).json({
      success: true,
      data: {
        ...circle,
        myRole: membership.role,
        memberCount: circle.members.length,
        pendingInvitations,
      },
    });
  } catch (error) {
    console.error("Get Circle Details Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve circle details.",
      error: error.message,
    });
  }
};

/**
 * PATCH /api/circles/:circleId/member-role
 * Update member role (Promote/Demote to CO_ADMIN or MEMBER). Requires ADMIN.
 */
export const updateMemberRole = async (req, res) => {
  try {
    const { circleId } = req.params;
    const { targetUserId, newRole } = req.body;
    const currentUserId = req.user._id;

    if (!targetUserId || !["CO_ADMIN", "MEMBER"].includes(newRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid target user or role. Role must be 'CO_ADMIN' or 'MEMBER'.",
      });
    }

    const circle = await BachatCircle.findById(circleId);
    if (!circle || !circle.isActive) {
      return res.status(404).json({ success: false, message: "Circle not found." });
    }

    const requesterMember = circle.members.find(
      (m) => m.userId.toString() === currentUserId.toString()
    );

    if (!requesterMember || requesterMember.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Only Circle Admins can manage member roles.",
      });
    }

    const targetMember = circle.members.find(
      (m) => m.userId.toString() === targetUserId.toString()
    );

    if (!targetMember) {
      return res.status(404).json({
        success: false,
        message: "User is not a member of this circle.",
      });
    }

    if (targetMember.role === "ADMIN") {
      return res.status(400).json({
        success: false,
        message: "Cannot modify primary Admin role.",
      });
    }

    targetMember.role = newRole;
    await circle.save();

    return res.status(200).json({
      success: true,
      message: `Member role updated to ${newRole}.`,
      data: circle,
    });
  } catch (error) {
    console.error("Update Member Role Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/circles/:circleId/leave
 * Leave circle (or remove a member if caller is ADMIN/CO_ADMIN).
 */
export const leaveOrRemoveMember = async (req, res) => {
  try {
    const { circleId } = req.params;
    const { targetUserId } = req.body; // Optional: specify to kick another user
    const currentUserId = req.user._id;

    const userToRemove = targetUserId || currentUserId.toString();
    const isSelfLeaving = userToRemove === currentUserId.toString();

    const circle = await BachatCircle.findById(circleId);
    if (!circle || !circle.isActive) {
      return res.status(404).json({ success: false, message: "Circle not found." });
    }

    const requester = circle.members.find(
      (m) => m.userId.toString() === currentUserId.toString()
    );

    if (!requester) {
      return res.status(403).json({ success: false, message: "You are not in this circle." });
    }

    // Permissions check if kicking another member
    if (!isSelfLeaving) {
      const target = circle.members.find((m) => m.userId.toString() === userToRemove);
      if (!target) {
        return res.status(404).json({ success: false, message: "Target user not in circle." });
      }

      if (requester.role === "MEMBER") {
        return res.status(403).json({ success: false, message: "Members cannot remove others." });
      }

      if (requester.role === "CO_ADMIN" && (target.role === "ADMIN" || target.role === "CO_ADMIN")) {
        return res.status(403).json({ success: false, message: "Co-Admins can only remove regular members." });
      }

      if (target.role === "ADMIN") {
        return res.status(400).json({ success: false, message: "Cannot remove primary circle Admin." });
      }
    } else {
      // Primary Admin leaving: require circle deletion or transfer
      if (requester.role === "ADMIN" && circle.members.length > 1) {
        return res.status(400).json({
          success: false,
          message: "Circle Admin must transfer Admin rights or delete circle before leaving.",
        });
      }
    }

    // Remove member
    circle.members = circle.members.filter((m) => m.userId.toString() !== userToRemove);

    // If last member left, deactivate circle
    if (circle.members.length === 0) {
      circle.isActive = false;
    }

    await circle.save();

    return res.status(200).json({
      success: true,
      message: isSelfLeaving ? "You left the circle." : "Member removed from circle.",
    });
  } catch (error) {
    console.error("Leave/Remove Member Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * =========================================================================
 * 2. INVITATION LIFECYCLE (Invite, Respond, List Pending)
 * =========================================================================
 */
export const inviteToCircle = async (req, res) => {
  try {
    const { circleId } = req.params;
    const { phone, roleAssigned = "MEMBER" } = req.body;
    const currentUserId = req.user._id;

    const normalized = normalizePhone(phone);
    if (!normalized || normalized.length < 12) {
      return res.status(400).json({
        success: false,
        message: "Valid 10-digit mobile phone number is required.",
      });
    }

    const circle = await BachatCircle.findById(circleId);
    if (!circle || !circle.isActive) {
      return res.status(404).json({ success: false, message: "Circle not found." });
    }

    const inviterMembership = circle.members.find(
      (m) => m.userId.toString() === currentUserId.toString()
    );

    if (!inviterMembership) {
      return res.status(403).json({ success: false, message: "You are not a member of this circle." });
    }

    if (roleAssigned === "CO_ADMIN" && inviterMembership.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Only Circle Admins can invite Co-Admins.",
      });
    }

    const rawTenDigit = normalized.slice(-10);
    const existingUser = await User.findOne({
      $or: [{ phone: normalized }, { phone: rawTenDigit }],
    }).select("_id name phone");

    if (existingUser) {
      const isAlreadyMember = circle.members.some(
        (m) => m.userId.toString() === existingUser._id.toString()
      );
      if (isAlreadyMember) {
        return res.status(409).json({
          success: false,
          message: "User is already an active member of this circle.",
        });
      }
    }

    const existingPending = await CircleInvitation.findOne({
      circleId,
      phone: normalized,
      status: "PENDING",
      expiresAt: { $gt: new Date() },
    });

    if (existingPending) {
      return res.status(409).json({
        success: false,
        message: "An active invitation has already been sent to this mobile number.",
      });
    }

    const invitation = new CircleInvitation({
      circleId,
      invitedBy: currentUserId,
      phone: normalized,
      invitedUserId: existingUser ? existingUser._id : null,
      roleAssigned,
      status: "PENDING",
    });

    await invitation.save();

    // Trigger Push Notification if user is registered
    if (existingUser) {
      notifyUserForCircleInvitation({
        invitedUserId: existingUser._id,
        inviterName: req.user.name || "A friend",
        circleName: circle.name,
        circleId: circle._id,
        invitationId: invitation._id,
      }).catch((err) => console.error("Invite notification error:", err.message));
    }

    return res.status(201).json({
      success: true,
      message: existingUser
        ? "Invitation sent to registered user."
        : "Invitation created. User will be added automatically once they register.",
      data: invitation,
      isRegistered: !!existingUser,
    });
  } catch (error) {
    console.error("Invite to Circle Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/circles/invitations/my-invitations
 * Get pending invitations received by the logged-in user.
 */
export const getMyPendingInvitations = async (req, res) => {
  try {
    const userPhone = normalizePhone(req.user.phone);
    const userId = req.user._id;

    const invitations = await CircleInvitation.find({
      $or: [{ phone: userPhone }, { invitedUserId: userId }],
      status: "PENDING",
      expiresAt: { $gt: new Date() },
    })
      .populate("circleId", "name description icon members")
      .populate("invitedBy", "name phone profileImage")
      .sort({ createdAt: -1 })
      .lean();

    const formatted = invitations.map((inv) => ({
      _id: inv._id,
      circle: {
        _id: inv.circleId?._id,
        name: inv.circleId?.name,
        description: inv.circleId?.description,
        icon: inv.circleId?.icon,
        memberCount: inv.circleId?.members?.length || 0,
      },
      invitedBy: inv.invitedBy,
      roleAssigned: inv.roleAssigned,
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
    }));

    return res.status(200).json({
      success: true,
      total: formatted.length,
      data: formatted,
    });
  } catch (error) {
    console.error("Get My Pending Invitations Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/circles/invitations/:invitationId/respond
 * Accept or decline an invitation.
 */
export const respondToInvitation = async (req, res) => {
  try {
    const { invitationId } = req.params;
    const { action } = req.body; // "ACCEPT" or "DECLINE"
    const userId = req.user._id;
    const userPhone = typeof normalizePhone === "function" 
      ? normalizePhone(req.user.phone) 
      : req.user.phone;

    if (!["ACCEPT", "DECLINE"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid action. Choose 'ACCEPT' or 'DECLINE'.",
      });
    }

    const invitation = await CircleInvitation.findById(invitationId);
    if (!invitation || invitation.status !== "PENDING") {
      return res.status(404).json({
        success: false,
        message: "Invitation not found or has already been processed.",
      });
    }

    if (new Date() > invitation.expiresAt) {
      invitation.status = "EXPIRED";
      await invitation.save();
      return res.status(400).json({ success: false, message: "This invitation has expired." });
    }

    // Verify phone or invited user ID match
    if (invitation.phone !== userPhone && invitation.invitedUserId?.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: This invitation was not issued for your mobile number.",
      });
    }

    const responderName = req.user.name || req.user.phone || "A friend";

    // Handle DECLINE Action
    if (action === "DECLINE") {
      invitation.status = "DECLINED";
      invitation.respondedAt = new Date();
      await invitation.save();

      // Fetch circle name for notification text
      const circle = await BachatCircle.findById(invitation.circleId).select("name").lean();

      // Notify the Inviter asynchronously
      notifyInviterOnResponse({
        inviterId: invitation.inviterId || invitation.createdBy,
        responderName,
        circleName: circle?.name || "Bachat Circle",
        circleId: invitation.circleId,
        action: "DECLINED",
      });

      return res.status(200).json({
        success: true,
        message: "Invitation declined successfully.",
      });
    }

    // Handle ACCEPT Action
    const circle = await BachatCircle.findById(invitation.circleId);
    if (!circle || !circle.isActive) {
      return res.status(404).json({ success: false, message: "Circle no longer exists." });
    }

    const alreadyMember = circle.members.some((m) => m.userId.toString() === userId.toString());

    if (!alreadyMember) {
      circle.members.push({
        userId,
        role: invitation.roleAssigned || "MEMBER",
        joinedAt: new Date(),
      });
      await circle.save();
    }

    invitation.status = "ACCEPTED";
    invitation.invitedUserId = userId;
    invitation.respondedAt = new Date();
    await invitation.save();

    // Notify the Inviter asynchronously
    notifyInviterOnResponse({
      inviterId: invitation.inviterId || invitation.createdBy,
      responderName,
      circleName: circle.name,
      circleId: circle._id,
      action: "ACCEPTED",
    });

    return res.status(200).json({
      success: true,
      message: "You have joined the Bachat Circle!",
      circleId: circle._id,
    });
  } catch (error) {
    console.error("Respond to Invitation Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * =========================================================================
 * 3. SHARED OFFERS MANAGEMENT (Selective & Full Circle Sharing)
 * =========================================================================
 */

/**
 * POST /api/circles/:circleId/offers
 * Share an offer inside a circle (All members OR selected members).
 */
export const shareOfferInCircles = async (req, res) => {
  try {
    const {
      circleIds,
      circleId,
      offerId,
      note,
    } = req.body;
    const userId = req.user._id;

    // 1. Resolve and validate target circle IDs
    const resolvedCircleIds = Array.isArray(circleIds) && circleIds.length > 0
      ? circleIds
      : circleId || req.params.circleId
      ? [circleId || req.params.circleId]
      : [];

    if (resolvedCircleIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one target circle ID is required.",
      });
    }

    if (!offerId) {
      return res.status(400).json({
        success: false,
        message: "Offer ID is required.",
      });
    }

    // 2. Fetch and validate offer
    const offer = await Offer.findOne({ _id: offerId, is_deleted: false, is_active: true });
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found or no longer active.",
      });
    }

    // 3. Fetch active circles where user is a verified member
    const activeCircles = await BachatCircle.find({
      _id: { $in: resolvedCircleIds },
      isActive: true,
      "members.userId": userId,
    });

    if (activeCircles.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You are not an active member of any of the specified circles.",
      });
    }

    const senderName = req.user.name || "A member";
    const cleanNote = typeof note === "string" ? note.trim() : "";

    // 4. Build Shared Offer Documents (Defaulting visibilityType to ALL_MEMBERS)
    const sharedOfferDocs = activeCircles.map((circle) => ({
      circleId: circle._id,
      offerId,
      sharedBy: userId,
      note: cleanNote,
      visibilityType: "ALL_MEMBERS",
      visibleToMembers: [],
    }));

    const insertedSharedOffers = await CircleSharedOffer.insertMany(sharedOfferDocs);

    // 5. Trigger notifications for each circle's members (excluding sender)
    activeCircles.forEach((circle) => {
      const targetMemberIds = circle.members
        .map((m) => m.userId.toString())
        .filter((id) => id !== userId.toString());

      const matchingSharedDoc = insertedSharedOffers.find(
        (doc) => doc.circleId.toString() === circle._id.toString()
      );

      if (targetMemberIds.length > 0 && matchingSharedDoc) {
        notifyMembersForSharedOffer({
          memberUserIds: targetMemberIds,
          senderName,
          circleName: circle.name,
          offerTitle: offer.title,
          circleId: circle._id,
          sharedOfferId: matchingSharedDoc._id,
        }).catch((err) =>
          console.error(`[Circle Share Notification Error - ${circle.name}]:`, err.message)
        );
      }
    });

    // 6. Populate results for response
    const insertedIds = insertedSharedOffers.map((doc) => doc._id);
    const populatedShares = await CircleSharedOffer.find({ _id: { $in: insertedIds } })
      .populate("sharedBy", "name profileImage")
      .populate("circleId", "name")
      .populate("offerId", "title description thumbnail discount_percentage discount_value end_date")
      .lean();

    return res.status(201).json({
      success: true,
      message: `Offer successfully shared to ${populatedShares.length} circle(s).`,
      totalShared: populatedShares.length,
      data: populatedShares,
    });
  } catch (error) {
    console.error("Share Offer In Circles Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to share offer to circles.",
    });
  }
};

/**
 * GET /api/circles/:circleId/offers
 * Get shared offers visible to the requesting member.
 */
export const getCircleSharedOffers = async (req, res) => {
  try {
    const { circleId } = req.params;
    const { limit = 20, page = 1 } = req.query;
    const userId = req.user._id;

    // Verify circle membership
    const circle = await BachatCircle.findOne({ _id: circleId, isActive: true });
    if (!circle) {
      return res.status(404).json({ success: false, message: "Circle not found." });
    }

    const isMember = circle.members.some((m) => m.userId.toString() === userId.toString());
    if (!isMember) {
      return res.status(403).json({ success: false, message: "Access denied. Not a circle member." });
    }

    // Strict Visibility Query:
    // 1. Visible to ALL_MEMBERS
    // 2. OR Shared by the current user
    // 3. OR Current user is in the visibleToMembers list
    const visibilityQuery = {
      circleId,
      isDeleted: false,
      $or: [
        { visibilityType: "ALL_MEMBERS" },
        { sharedBy: userId },
        { visibilityType: "SELECTED_MEMBERS", visibleToMembers: userId },
      ],
    };

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    const [offers, total] = await Promise.all([
      CircleSharedOffer.find(visibilityQuery)
        .populate("sharedBy", "name phone profileImage")
        .populate({
          path: "offerId",
          select:
            "title description thumbnail discount_percentage discount_value end_date start_date minimum_purchase_amount code display_type",
          populate: { path: "merchant_id", select: "name store_name profileImage" },
        })
        .populate("visibleToMembers", "name profileImage")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      CircleSharedOffer.countDocuments(visibilityQuery),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)) || 1,
      data: offers,
    });
  } catch (error) {
    console.error("Get Circle Shared Offers Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/circles/offers/:sharedOfferId
 * Delete a shared offer (Allowed by poster, ADMIN, or CO_ADMIN).
 */
export const deleteSharedOffer = async (req, res) => {
  try {
    const { sharedOfferId } = req.params;
    const userId = req.user._id;

    const sharedOffer = await CircleSharedOffer.findById(sharedOfferId);
    if (!sharedOffer || sharedOffer.isDeleted) {
      return res.status(404).json({ success: false, message: "Shared offer not found." });
    }

    const circle = await BachatCircle.findById(sharedOffer.circleId);
    const membership = circle?.members.find((m) => m.userId.toString() === userId.toString());

    if (!membership) {
      return res.status(403).json({ success: false, message: "Unauthorized." });
    }

    const isAuthor = sharedOffer.sharedBy.toString() === userId.toString();
    const isLeadership = membership.role === "ADMIN" || membership.role === "CO_ADMIN";

    if (!isAuthor && !isLeadership) {
      return res.status(403).json({
        success: false,
        message: "You can only delete offers you shared or if you are circle leadership.",
      });
    }

    sharedOffer.isDeleted = true;
    await sharedOffer.save();

    return res.status(200).json({
      success: true,
      message: "Shared offer removed from circle feed.",
    });
  } catch (error) {
    console.error("Delete Shared Offer Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};