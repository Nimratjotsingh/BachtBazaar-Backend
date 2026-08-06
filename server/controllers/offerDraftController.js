import mongoose from "mongoose";
import Offer from "../models/offerModel.js";
import Area from "../models/AreaModel.js";
import CalendarConfig from "../models/calenderConfigModel.js";

/**
 * Helper to safely extract uploaded thumbnail path from req
 */
const getThumbnailPath = (req) => {
  if (req.file) {
    return `/uploads/${req.file.filename}`;
  }
  if (req.files) {
    if (Array.isArray(req.files) && req.files.length > 0) {
      return `/uploads/${req.files[0].filename}`;
    }
    if (typeof req.files === "object") {
      const keys = Object.keys(req.files);
      if (keys.length > 0 && req.files[keys[0]][0]) {
        return `/uploads/${req.files[keys[0]][0].filename}`;
      }
    }
  }
  return null;
};

/**
 * POST /api/merchant/offers/draft
 * Create or save an initial offer draft
 */
export const saveOfferDraft = async (req, res) => {
  try {
    const data = { ...req.body };
    const merchantId = req.merchant._id;

    // 1. Process File Upload
    const uploadedThumbnail = getThumbnailPath(req);
    if (uploadedThumbnail) {
      data.thumbnail = uploadedThumbnail;
    }

    // 2. Process Geolocation Coordinates
    const lat = req.query.lat || req.body.lat;
    const lng = req.query.lng || req.body.lng;

    let locationPoint = {
      type: "Point",
      coordinates: [0, 0],
    };

    if (lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
      locationPoint = {
        type: "Point",
        coordinates: [Number(lng), Number(lat)],
      };
    }

    // 3. Process Array Fields (tags & product_id)
    if (typeof data.tags === "string") {
      data.tags = data.tags.split(",").map((t) => t.trim()).filter(Boolean);
    }

    if (data.product_id) {
      if (typeof data.product_id === "string") {
        data.product_id = data.product_id.split(",").map((id) => id.trim()).filter(Boolean);
      } else if (!Array.isArray(data.product_id)) {
        data.product_id = [data.product_id];
      }
    }

    // 4. Process Date Fields
    const startDate = data.start_date ? new Date(data.start_date) : undefined;
    const endDate = data.end_date ? new Date(data.end_date) : undefined;

    // 5. Construct Draft Document
    const newDraft = new Offer({
      ...data,
      merchant_id: merchantId,
      location: locationPoint,
      start_date: startDate,
      end_date: endDate,
      discount_percentage: data.discount_percentage ? Number(data.discount_percentage) : null,
      discount_value: data.discount_value ? Number(data.discount_value) : null,
      minimum_purchase_amount: data.minimum_purchase_amount ? Number(data.minimum_purchase_amount) : 0,
      tags: data.tags || [],
      product_id: data.product_id || [],
      is_draft: true,
      draft_step: Number(data.draft_step) || 1,
      is_active: false, // Drafts default to inactive until published
    });

    await newDraft.save();

    return res.status(201).json({
      success: true,
      message: "Offer draft saved successfully.",
      data: newDraft,
    });
  } catch (error) {
    console.error("Save Offer Draft Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save offer draft.",
      error: error.message,
    });
  }
};

/**
 * PUT /api/merchant/offers/draft/:draftId
 * Update an existing draft step-by-step
 */
export const updateOfferDraft = async (req, res) => {
  try {
    const { draftId } = req.params;
    const merchantId = req.merchant._id;
    const updates = { ...req.body };

    const draft = await Offer.findOne({
      _id: draftId,
      merchant_id: merchantId,
      is_draft: true,
      is_deleted: false,
    });

    if (!draft) {
      return res.status(404).json({
        success: false,
        message: "Draft offer not found.",
      });
    }

    // Process File Upload
    const uploadedThumbnail = getThumbnailPath(req);
    if (uploadedThumbnail) {
      updates.thumbnail = uploadedThumbnail;
    }

    // Process Location Coordinates
    const lat = req.query.lat || req.body.lat;
    const lng = req.query.lng || req.body.lng;
    if (lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
      updates.location = {
        type: "Point",
        coordinates: [Number(lng), Number(lat)],
      };
    }

    // Process Array Fields
    if (typeof updates.tags === "string") {
      updates.tags = updates.tags.split(",").map((t) => t.trim()).filter(Boolean);
    }

    if (updates.product_id) {
      if (typeof updates.product_id === "string") {
        updates.product_id = updates.product_id.split(",").map((id) => id.trim()).filter(Boolean);
      } else if (!Array.isArray(updates.product_id)) {
        updates.product_id = [updates.product_id];
      }
    }

    // Apply updates
    Object.assign(draft, updates);
    if (updates.draft_step) draft.draft_step = Number(updates.draft_step);

    await draft.save();

    return res.status(200).json({
      success: true,
      message: "Draft updated successfully.",
      data: draft,
    });
  } catch (error) {
    console.error("Update Offer Draft Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update offer draft.",
      error: error.message,
    });
  }
};

/**
 * GET /api/merchant/offers/drafts
 * Retrieve all saved drafts for the logged-in merchant
 */
export const getMerchantOfferDrafts = async (req, res) => {
  try {
    const merchantId = req.merchant._id;

    const drafts = await Offer.find({
      merchant_id: merchantId,
      is_draft: true,
      is_deleted: false,
    })
      .populate("offer_type_id", "label value title name")
      .populate("category_id", "label value name")
      .sort({ updatedAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      totalDrafts: drafts.length,
      data: drafts,
    });
  } catch (error) {
    console.error("Get Merchant Offer Drafts Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve offer drafts.",
      error: error.message,
    });
  }
};

/**
 * POST /api/merchant/offers/draft/:draftId/publish
 * Convert a draft into a live offer (runs full production validation checks)
 */
export const publishOfferDraft = async (req, res) => {
  try {
    const { draftId } = req.params;
    const merchantId = req.merchant._id;

    const draft = await Offer.findOne({
      _id: draftId,
      merchant_id: merchantId,
      is_draft: true,
      is_deleted: false,
    });

    if (!draft) {
      return res.status(404).json({
        success: false,
        message: "Draft offer not found.",
      });
    }

    // 1. Mandatory Location Validation
    const coords = draft.location?.coordinates;
    const lng = coords ? coords[0] : null;
    const lat = coords ? coords[1] : null;

    if (!lat || !lng || (lat === 0 && lng === 0)) {
      return res.status(400).json({
        success: false,
        message: "Cannot publish draft: Valid positional coordinates (lat/lng) are required.",
      });
    }

    // 2. Geofenced Operational Area Lookup
    const geoResults = await Area.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lng, lat] },
          distanceField: "distance_meters",
          spherical: true,
          query: { is_active: true },
        },
      },
      { $limit: 1 },
    ]);

    const closestArea = geoResults.length > 0 ? geoResults[0] : null;

    if (!closestArea) {
      return res.status(404).json({
        success: false,
        message: "Cannot publish draft: Provided coordinates do not map to an active operational Area.",
      });
    }

    const targetAreaId = closestArea._id;

    // 3. Calendar Capacity & Cooldown Checks
    if (draft.display_type === "calendar") {
      if (!draft.start_date || !draft.end_date) {
        return res.status(400).json({
          success: false,
          message: "Cannot publish draft: Both start and end dates are required for calendar offers.",
        });
      }

      if (draft.start_date > draft.end_date) {
        return res.status(400).json({
          success: false,
          message: "Cannot publish draft: Start date cannot occur after end date.",
        });
      }

      const msIn24Hours = 24 * 60 * 60 * 1000;
      const startWithBuffer = new Date(draft.start_date.getTime() - msIn24Hours);
      const endWithBuffer = new Date(draft.end_date.getTime() + msIn24Hours);

      const existingOverlappingOffer = await Offer.findOne({
        _id: { $ne: draftId },
        merchant_id: merchantId,
        display_type: "calendar",
        is_active: true,
        is_deleted: false,
        is_draft: false,
        $or: [
          {
            start_date: { $lte: endWithBuffer },
            end_date: { $gte: startWithBuffer },
          },
        ],
      });

      if (existingOverlappingOffer) {
        return res.status(400).json({
          success: false,
          message: "Validation Error: Overlapping calendar offer active or violating 24-hour cooldown period.",
        });
      }

      // Check Regional Sector Capacity Slots
      const globalDefaultLimit = 5;
      const targetDateLookup = new Date(draft.start_date);
      targetDateLookup.setUTCHours(0, 0, 0, 0);

      const areaMerchantIds = await mongoose
        .model("MerchantShop")
        .find({ area_id: targetAreaId })
        .distinct("merchantId");

      const [dateRule, currentAreaBookingsCount] = await Promise.all([
        CalendarConfig.findOne({ area_id: targetAreaId, date: targetDateLookup }).lean(),
        Offer.countDocuments({
          display_type: "calendar",
          start_date: targetDateLookup,
          is_active: true,
          is_deleted: false,
          is_draft: false,
          merchant_id: { $in: areaMerchantIds },
        }),
      ]);

      if (dateRule) {
        if (dateRule.is_locked) {
          return res.status(400).json({
            success: false,
            message: "Calendar bookings for this date are locked by administrator.",
          });
        }
        const effectiveBooked = Math.max(currentAreaBookingsCount, dateRule.current_booked_count || 0);
        if (effectiveBooked >= dateRule.max_allowed_offers) {
          return res.status(400).json({
            success: false,
            message: `Calendar limit reached for this date (${dateRule.max_allowed_offers} max).`,
          });
        }
      } else if (currentAreaBookingsCount >= globalDefaultLimit) {
        return res.status(400).json({
          success: false,
          message: `All default slots (${globalDefaultLimit}) for this start date are full in your sector.`,
        });
      }
    }

    // 4. Promote Draft to Active Live Offer
    draft.is_draft = false;
    draft.is_active = true;
    await draft.save();

    // 5. Increment Sector Calendar Slot Count
    if (draft.display_type === "calendar") {
      const targetDateLookup = new Date(draft.start_date);
      targetDateLookup.setUTCHours(0, 0, 0, 0);

      await CalendarConfig.findOneAndUpdate(
        { area_id: targetAreaId, date: targetDateLookup },
        { $inc: { current_booked_count: 1 } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    return res.status(200).json({
      success: true,
      message: "Offer draft published successfully! Your campaign is now live.",
      data: draft,
    });
  } catch (error) {
    console.error("Publish Offer Draft Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to publish offer draft.",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/merchant/offers/draft/:draftId
 * Delete or discard a draft
 */
export const discardOfferDraft = async (req, res) => {
  try {
    const { draftId } = req.params;
    const merchantId = req.merchant._id;

    const draft = await Offer.findOneAndDelete({
      _id: draftId,
      merchant_id: merchantId,
      is_draft: true,
    });

    if (!draft) {
      return res.status(404).json({
        success: false,
        message: "Draft not found or access denied.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Offer draft discarded successfully.",
    });
  } catch (error) {
    console.error("Discard Offer Draft Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to discard offer draft.",
      error: error.message,
    });
  }
};