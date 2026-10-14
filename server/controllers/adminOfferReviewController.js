import Offer from "../models/offerModel.js";
import { notifyNearbyUsersForNewOffer } from "../utils/offerNotificationHelper.js";
import mongoose from "mongoose";

/**
 * 1. List Offer Review Queue / Filter Offers
 * GET /api/admin/offers/review-queue
 * Query: ?page=1&limit=10&status=pending&display_type=all&isCustomImage=true&search=diwali
 */
export const getOfferReviewQueue = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status = "pending",
      display_type,
      isCustomImage,
      search,
    } = req.query;

    const query = { is_deleted: false };

    // Status filter: pending | approved | rejected | all
    if (status && status !== "all") {
      query.approval_status = status;
    }

    if (display_type) {
      query.display_type = display_type;
    }

    if (isCustomImage !== undefined) {
      query.isCustomImage = isCustomImage === "true";
    }

    if (search && search.trim()) {
      query.$or = [
        { title: { $regex: search.trim(),$options: "i" } },
        { description: { $regex: search.trim(),$options: "i" } },
        { tags: { $in: [new RegExp(search.trim(), "i")] } },
      ];
    }

    const currentPage = Math.max(1, Number(page));
    const itemsPerPage = Math.max(1, Number(limit));
    const skip = (currentPage - 1) * itemsPerPage;

    const total = await Offer.countDocuments(query);

    const offers = await Offer.find(query)
      .populate("merchant_id", "name businessName email phone logo status isBlocked")
      .populate("category_id", "label name")
      .populate("product_id", "name thumbnail price discounted_price")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(itemsPerPage)
      .lean();

    return res.status(200).json({
      success: true,
      total,
      pages: Math.ceil(total / itemsPerPage) || 1,
      currentPage,
      count: offers.length,
      data: offers,
    });
  } catch (error) {
    console.error("Get Offer Review Queue Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve offer review queue.",
      error: error.message,
    });
  }
};

/**
 * 2. Get Single Offer Particulars for Deep Inspection
 * GET /api/admin/offers/:id
 */
export const getOfferDetailsAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Offer ID format." });
    }

    const offer = await Offer.findOne({ _id: id, is_deleted: false })
      .populate("merchant_id", "name businessName email phone logo status address city isBlocked")
      .populate("category_id", "label name")
      .populate("offer_type_id", "title label")
      .populate("sub_offer_type_id", "title label")
      .populate("product_id", "name thumbnail price discounted_price stock")
      .lean();

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer listing not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: offer,
    });
  } catch (error) {
    console.error("Get Admin Offer Details Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load offer specifications.",
      error: error.message,
    });
  }
};

/**
 * 3. Moderate Offer Status (Approve / Reject / Revert to Pending)
 * PATCH /api/admin/offers/:id/review
 * Body: { status: "approved" | "rejected" | "pending", rejection_reason: "..." }
 */
export const reviewOfferStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Offer ID format." });
    }

    const allowedStatuses = ["approved", "rejected", "pending"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid review status. Allowed values: 'approved', 'rejected', 'pending'.",
      });
    }

    if (status === "rejected" && (!rejection_reason || !rejection_reason.trim())) {
      return res.status(400).json({
        success: false,
        message: "A clear rejection_reason must be provided when declining an offer.",
      });
    }

    const offer = await Offer.findOne({ _id: id, is_deleted: false });
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Target offer not found in directory.",
      });
    }

    const previousStatus = offer.approval_status;

    // Apply verification logic
    offer.approval_status = status;

    if (status === "approved") {
      offer.is_active = true;
      offer.rejection_reason = null;
    } else if (status === "rejected") {
      offer.is_active = false;
      offer.rejection_reason = rejection_reason.trim();
    } else if (status === "pending") {
      offer.is_active = false;
      offer.rejection_reason = null;
    }

    await offer.save();

    // Trigger nearby push notification on fresh approval
    if (status === "approved" && previousStatus !== "approved") {
      const coordinates = offer.location?.coordinates;
      if (Array.isArray(coordinates) && coordinates.length === 2) {
        const [lng, lat] = coordinates;
        (async () => {
          try {
            if (typeof notifyNearbyUsersForNewOffer === "function") {
              await notifyNearbyUsersForNewOffer({
                offerId: offer._id,
                offerTitle: offer.title,
                discountPercentage: offer.discount_percentage,
                discountValue: offer.discount_value,
                merchantId: offer.merchant_id,
                lat,
                lng,
                targetRadiusKm: 15,
              });
            }
          } catch (notifyErr) {
            console.error("Async Nearby Offer Notification Error:", notifyErr.message);
          }
        })();
      }
    }

    return res.status(200).json({
      success: true,
      message: `Offer has been ${status === "approved" ? "authorized and published" : status === "rejected" ? "declined" : "reverted to review queue"}.`,
      data: offer,
    });
  } catch (error) {
    console.error("Review Offer Status Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to commit offer review decision.",
      error: error.message,
    });
  }
};

import fs from "fs";
import path from "path";

/**
 * Update/Replace Offer Thumbnail (Admin Only)
 * PATCH /api/admin/offers/:id/thumbnail
 * Supports:
 *  1. Multipart file upload: req.file -> saved to /uploads/filename
 *  2. JSON / Form body string: req.body.thumbnail -> pre-existing or remote URL
 */
export const updateOfferThumbnailAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Offer ID format.",
      });
    }

    const offer = await Offer.findOne({ _id: id, is_deleted: false });
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Target offer not found.",
      });
    }

    let newThumbnailPath = null;

    // 1. Check for uploaded file
    if (req.file) {
      newThumbnailPath = `/uploads/${req.file.filename}`;
    } else if (req.body.thumbnail && typeof req.body.thumbnail === "string") {
      newThumbnailPath = req.body.thumbnail.trim();
    }

    if (!newThumbnailPath) {
      return res.status(400).json({
        success: false,
        message: "A new thumbnail file upload or an image path string is required.",
      });
    }

    // Optional: Clean up previous local file asset if it was stored locally
    const oldThumbnail = offer.thumbnail;
    if (
      req.file &&
      oldThumbnail &&
      oldThumbnail.startsWith("/uploads/") &&
      oldThumbnail !== newThumbnailPath
    ) {
      const oldFilePath = path.join(process.cwd(), oldThumbnail);
      fs.unlink(oldFilePath, (err) => {
        if (err && err.code !== "ENOENT") {
          console.error("Failed to delete stale offer thumbnail asset:", err.message);
        }
      });
    }

    // 2. Commit update
    offer.thumbnail = newThumbnailPath;

    // Optional: If an admin explicitly updates the thumbnail on a rejected offer,
    // you can automatically reset isCustomImage or keep the status intact
    if (req.body.isCustomImage !== undefined) {
      offer.isCustomImage =
        req.body.isCustomImage === true || req.body.isCustomImage === "true";
    }

    await offer.save();

    return res.status(200).json({
      success: true,
      message: "Offer thumbnail updated successfully by administrator.",
      data: {
        _id: offer._id,
        title: offer.title,
        thumbnail: offer.thumbnail,
        isCustomImage: offer.isCustomImage,
        approval_status: offer.approval_status,
      },
    });
  } catch (error) {
    console.error("Update Offer Thumbnail Admin Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update offer thumbnail.",
      error: error.message,
    });
  }
};