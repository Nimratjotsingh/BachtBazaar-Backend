import mongoose from "mongoose";
import ComboOffer from "../models/ComboOfferModel.js";

/**
 * GET /api/admin/combo-offers
 * Retrieves a paginated list of all combo offers for admin/staff management and moderation.
 */
export const getAdminComboOffers = async (req, res) => {
  try {
    const { page = 1, limit = 15, status, approval_status, search, merchantId } = req.query;

    const query = { is_deleted: false };

    if (status && status !== "ALL") {
      if (status === "active") query.is_active = true;
      if (status === "inactive") query.is_active = false;
    }

    if (approval_status && approval_status !== "ALL") {
      query.approval_status = approval_status;
    }

    if (merchantId && mongoose.Types.ObjectId.isValid(merchantId)) {
      query.merchantId = merchantId;
    }

    if (search && search.trim()) {
      query.name = { $regex: search.trim(), $options: "i" };
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const [combos, total] = await Promise.all([
      ComboOffer.find(query)
        .populate("merchantId", "name store_name email phone status isBlocked")
        .populate("shopId", "shopName address city")
        .populate("approved_by", "name email role")
        .populate("products.productId", "name thumbnail price")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ComboOffer.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      data: combos,
    });
  } catch (error) {
    console.error("Get Admin Combo Offers Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve combo offers ledger.",
      error: error.message,
    });
  }
};

/**
 * GET /api/admin/combo-offers/:id
 * Retrieves full details of a specific combo offer for administrative audit and inspection.
 */
export const getComboOfferDetailsAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Combo Offer ID." });
    }

    const combo = await ComboOffer.findOne({ _id: id, is_deleted: false })
      .populate("merchantId", "name store_name email phone status isBlocked isBlueTickEnabled")
      .populate("shopId", "shopName address city phone")
      .populate("approved_by", "name email role")
      .populate("products.productId", "name thumbnail price discounted_price stock")
      .lean();

    if (!combo) {
      return res.status(404).json({ success: false, message: "Combo offer not found." });
    }

    return res.status(200).json({
      success: true,
      data: combo,
    });
  } catch (error) {
    console.error("Get Combo Offer Details Admin Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve combo offer details.",
      error: error.message,
    });
  }
};

/**
 * PATCH /api/admin/combo-offers/:id/review
 * Approves or rejects a combo offer (Supports Admin, SuperAdmin, and Staff attribution).
 */
export const reviewComboOfferStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason } = req.body; // status: "approved" | "rejected"

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Combo Offer ID." });
    }

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value. Must be 'approved' or 'rejected'.",
      });
    }

    const combo = await ComboOffer.findOne({ _id: id, is_deleted: false });
    if (!combo) {
      return res.status(404).json({ success: false, message: "Combo offer not found." });
    }

    // --- IDENTIFY VERIFIER (SuperAdmin, Admin, or Staff) ---
    const verifierId = req.superAdmin?._id || req.admin?._id || req.staff?._id || req.user?._id || null;
    let verifierModel = null;

    if (req.superAdmin || req.admin) {
      verifierModel = "SuperAdmin";
    } else if (req.staff) {
      verifierModel = "Staff";
    } else if (req.user) {
      verifierModel = req.user.role === "staff" ? "Staff" : "SuperAdmin";
    }

    combo.approval_status = status;
    combo.approval_date = new Date();

    if (verifierId) {
      combo.approved_by = verifierId;
      combo.approved_by_model = verifierModel;
    }

    if (status === "rejected") {
      combo.rejection_reason = rejection_reason ? rejection_reason.trim() : "No reason provided.";
      combo.is_active = false; // Deactivate if rejected
    } else {
      combo.rejection_reason = null;
      combo.is_active = true; // Activate upon approval
    }

    await combo.save();

    // Populate audit trail for response
    await combo.populate("approved_by", "name email role");

    return res.status(200).json({
      success: true,
      message: `Combo offer successfully ${status}.`,
      data: combo,
    });
  } catch (error) {
    console.error("Review Combo Offer Status Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update combo offer review status.",
      error: error.message,
    });
  }
};

/**
 * PATCH /api/admin/combo-offers/:id/disable
 * Administrative override to disable/pause a combo offer.
 */
export const disableComboOfferAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { pause_reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Combo Offer ID." });
    }

    const combo = await ComboOffer.findOne({ _id: id, is_deleted: false });
    if (!combo) {
      return res.status(404).json({ success: false, message: "Combo offer not found." });
    }

    // --- IDENTIFY VERIFIER ---
    const verifierId = req.superAdmin?._id || req.admin?._id || req.staff?._id || req.user?._id || null;
    let verifierModel = null;

    if (req.superAdmin || req.admin) {
      verifierModel = "SuperAdmin";
    } else if (req.staff) {
      verifierModel = "Staff";
    } else if (req.user) {
      verifierModel = req.user.role === "staff" ? "Staff" : "SuperAdmin";
    }

    combo.is_active = false;
    if (pause_reason && pause_reason.trim()) {
      combo.rejection_reason = pause_reason.trim();
    }

    if (verifierId) {
      combo.approved_by = verifierId;
      combo.approved_by_model = verifierModel;
      combo.approval_date = new Date();
    }

    await combo.save();

    return res.status(200).json({
      success: true,
      message: "Combo offer campaign has been disabled by administration.",
      data: combo,
    });
  } catch (error) {
    console.error("Disable Combo Offer Admin Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to disable combo offer.",
      error: error.message,
    });
  }
};