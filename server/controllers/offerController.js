// controllers/offerController.js
import Offer from "../models/offerModel.js";
import CalendarConfig from "../models/calenderConfigModel.js";
import Merchant from '../models/merchantModel.js';
import MerchantShop from '../models/merchantShopModel.js'
import Area from '../models/AreaModel.js';
import mongoose from "mongoose";

// Helper to isolate date segments and force UTC Midnight matching your schemas
const normalizeToMidnight = (dateString) => {
  if (!dateString) return null;
  const cleanDateString = dateString.includes("T") ? dateString.split("T")[0] : dateString;
  const [year, month, day] = cleanDateString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
};

// ====================================================================
// --- GET SLOT STATUS BY EXPLICIT OR SHOP LAT/LNG COORDINATES -------
// ====================================================================
// const normalizeToMidnight = (dateString) => {
//   if (!dateString) return null;
//   const cleanDateString = dateString.includes("T") ? dateString.split("T")[0] : dateString;
//   const [year, month, day] = cleanDateString.split("-").map(Number);
//   return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
// };

export const getMerchantSlotStatus = async (req, res) => {
  try {
    const { lat, lng, date } = req.query;
    const merchantId = req.merchant?._id; 

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "The target calendar placement date parameter is required."
      });
    }

    const targetDate = normalizeToMidnight(date);
    let resolvedLng;
    let resolvedLat;
    let fallbackUsed = false;

    // =========================================================
    // PIPELINE 1: COORDINATES DETECTION & RESOLUTION
    // =========================================================
    if (lat !== undefined && lng !== undefined && lat !== "" && lng !== "") {
      resolvedLat = Number(lat);
      resolvedLng = Number(lng);
    } else {
      const shop = await MerchantShop.findOne({ merchantId }).select("center_location location area_id");
      
      if (!shop) {
        return res.status(404).json({
          success: false,
          message: "Coordinates missing from request, and no storefront profile was found for this merchant."
        });
      }

      const shopGeo = shop.center_location || shop.location;
      if (!shopGeo || !shopGeo.coordinates) {
        return res.status(400).json({
          success: false,
          message: "Coordinates missing from request, and your store profile lacks valid GPS metrics."
        });
      }

      [resolvedLng, resolvedLat] = shopGeo.coordinates;
      fallbackUsed = true;
    }

    // Sanity validation checking on numerical coordinate transformations
    if (isNaN(resolvedLat) || isNaN(resolvedLng)) {
      return res.status(400).json({
        success: false,
        message: "Provided or fallback geospatial coordinates map fields are invalid numbers."
      });
    }

    // =========================================================
    // PIPELINE 2: FIXED GEOGRAPHIC GEOMAPPING VIA AGGREGATION
    // =========================================================
    // Using $geoNear stage directly guarantees MongoDB explicitly binds onto the Area index
    const geoResults = await Area.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [resolvedLng, resolvedLat] // [longitude, latitude]
          },
          distanceField: "distance_meters",
          spherical: true,
          query: { is_active: true }
        }
      },
      { $limit: 1 },
      {
        $project: {
          _id: 1,
          name: 1,
          radius_km: 1
        }
      }
    ]);

    const closestArea = geoResults.length > 0 ? geoResults[0] : null;

    if (!closestArea) {
      return res.status(404).json({
        success: false,
        message: "The coordinates do not fall within any operational BachatBazarr geofenced Area boundaries."
      });
    }

    const targetAreaId = closestArea._id;

    // =========================================================
    // PIPELINE 3: ALLOCATION METRICS COMPILATION
    // =========================================================
    const fallbackDefaultLimit = 5;

    const [dateRule, totalAreaOffers, merchantSpecificOffers] = await Promise.all([
      CalendarConfig.findOne({ area_id: targetAreaId, date: targetDate }).lean(),

      Offer.countDocuments({
        display_type: "calendar",
        start_date: targetDate,
        is_deleted: false,
        is_active: true,
        merchant_id: { 
          $in: await mongoose.model("MerchantShop").find({ area_id: targetAreaId }).distinct("merchantId") 
        }
      }),

      Offer.countDocuments({
        display_type: "calendar",
        start_date: targetDate,
        merchant_id: merchantId,
        is_deleted: false,
        is_active: true
      })
    ]);

    const maxAllowedSlots = dateRule ? dateRule.max_allowed_offers : fallbackDefaultLimit;
    const isLockedByAdmin = dateRule ? dateRule.is_locked : false;
    const slotsRemaining = Math.max(0, maxAllowedSlots - totalAreaOffers);

    return res.status(200).json({
      success: true,
      meta: {
        resolved_area: {
          _id: targetAreaId,
          name: closestArea.name
        },
        coordinates_evaluated: {
          latitude: resolvedLat,
          longitude: resolvedLng
        },
        date: targetDate.toISOString().split("T")[0],
        is_locked: isLockedByAdmin,
        resolved_via: fallbackUsed ? "merchant_shop_fallback" : "explicit_params"
      },
      data: {
        max_slots: maxAllowedSlots,                 
        total_booked: totalAreaOffers,              
        slots_remaining: isLockedByAdmin ? 0 : slotsRemaining, 
        merchant_booked_count: merchantSpecificOffers 
      }
    });

  } catch (error) {
    console.error("Merchant Slot Query Coordinates Processing Error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while compiling regional calendar parameters using geospatial coordinates."
    });
  }
};
export const createOffer = async (req, res) => {
  try {
    const data = { ...req.body };
    const merchantId = req.merchant._id; // Extracted from auth middleware token validation

    // Extract explicit latitude/longitude from either the query params or the request body
    const lat = req.query.lat || req.body.lat;
    const lng = req.query.lng || req.body.lng;

    if (lat === undefined || lng === undefined || lat === "" || lng === "") {
      return res.status(400).json({
        success: false,
        message: "Explicit 'lat' and 'lng' positional coordinate parameters are required to deploy an offer."
      });
    }

    const resolvedLat = Number(lat);
    const resolvedLng = Number(lng);

    if (isNaN(resolvedLat) || isNaN(resolvedLng)) {
      return res.status(400).json({
        success: false,
        message: "Provided geographic coordinates are invalid numbers."
      });
    }

    // 1. Process File Upload path from Multer if a background asset was included
    if (req.file) {
      data.thumbnail = `/uploads/${req.file.filename}`;
    }

    const { display_type, start_date, end_date } = data;

    // Standardize input fields into timezone-safe clean UTC Date instances
    const finalStartDate = start_date ? new Date(start_date) : undefined;
    const finalEndDate = end_date ? new Date(end_date) : undefined;
    
    if (finalStartDate) finalStartDate.setUTCHours(0, 0, 0, 0);
    if (finalEndDate) finalEndDate.setUTCHours(23, 59, 59, 999);

    let targetAreaId = null;

    // --- GEOLOCATION BOUNDARY RESOLUTION ---
    // Look up the closest active system geofenced Area using an aggregation pipeline
    const geoResults = await Area.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [resolvedLng, resolvedLat] // [longitude, latitude]
          },
          distanceField: "distance_meters",
          spherical: true,
          query: { is_active: true }
        }
      },
      { $limit: 1 }
    ]);

    const closestArea = geoResults.length > 0 ? geoResults[0] : null;

    if (!closestArea) {
      return res.status(404).json({
        success: false,
        message: "The provided coordinates do not map into any active operational geofenced Area boundaries."
      });
    }

    targetAreaId = closestArea._id;

    // Map coordinates into a standard GeoJSON Point object for the final Offer schema
    data.location = {
      type: "Point",
      coordinates: [resolvedLng, resolvedLat]
    };

    // --- START: CONDITIONAL CALENDAR CAPACITY VALIDATIONS ---
    if (display_type === "calendar") {
      if (!finalStartDate || !finalEndDate) {
        return res.status(400).json({
          success: false,
          message: "Both start and end dates must be selected to request a calendar visibility slot.",
        });
      }

      if (finalStartDate > finalEndDate) {
        return res.status(400).json({
          success: false,
          message: "The start date cannot occur after the campaign end date.",
        });
      }

      // --- CRITICAL RULE CHECK: Merchant Overlapping Window + 24-Hour Cooldown Guard ---
      const msIn24Hours = 24 * 60 * 60 * 1000;
      const startWithBuffer = new Date(finalStartDate.getTime() - msIn24Hours);
      const endWithBuffer = new Date(finalEndDate.getTime() + msIn24Hours);

      const existingOverlappingOffer = await Offer.findOne({
        merchant_id: merchantId,
        display_type: "calendar",
        is_active: true,
        is_deleted: false,
        $or: [
          {
            start_date: { $lte: endWithBuffer },
            end_date: { $gte: startWithBuffer }
          }
        ]
      });

      if (existingOverlappingOffer) {
        return res.status(400).json({
          success: false,
          message: "Validation Error: You already have a calendar campaign running in this time block, or you are violating the mandatory 24-hour cool-down period.",
        });
      }

      // --- REGIONAL CAPACITY SLOTS VERIFICATION ---
      const globalDefaultLimit = 5;
      const targetDateLookup = new Date(finalStartDate);

      // Find all shops registered in this specific resolved Area perimeter
      const areaMerchantIds = await mongoose.model("MerchantShop").find({ area_id: targetAreaId }).distinct("merchantId");

      // Concurrently query active regional booking metrics 
      const [dateRule, currentAreaBookingsCount] = await Promise.all([
        CalendarConfig.findOne({ area_id: targetAreaId, date: targetDateLookup }).lean(),
        
        Offer.countDocuments({
          display_type: "calendar",
          start_date: targetDateLookup,
          is_active: true,
          is_deleted: false,
          merchant_id: { $in: areaMerchantIds }
        })
      ]);

      if (dateRule) {
        if (dateRule.is_locked) {
          return res.status(400).json({
            success: false,
            message: "Campaign creations for this specific date have been closed by the administrator in this area.",
          });
        }

        const effectiveBooked = Math.max(currentAreaBookingsCount, dateRule.current_booked_count || 0);
        if (effectiveBooked >= dateRule.max_allowed_offers) {
          return res.status(400).json({
            success: false,
            message: `The calendar limit for this date in your region has been reached (${dateRule.max_allowed_offers} offers max). Please select another day.`,
          });
        }
      } else {
        if (currentAreaBookingsCount >= globalDefaultLimit) {
          return res.status(400).json({
            success: false,
            message: `All standard default localized slots (${globalDefaultLimit}) for this start date are full in your sector.`,
          });
        }
      }
    }
    // --- END: CONDITIONAL CALENDAR LIMITATION VALIDATION ---

    // 2. Process Array Strings (Convert comma-separated tags from form-data arrays)
    if (typeof data.tags === "string") {
      data.tags = data.tags.split(",").map(tag => tag.trim()).filter(Boolean);
    }

    // 3. Process product_id mapping array transformations
    if (data.product_id) {
      if (typeof data.product_id === "string") {
        data.product_id = data.product_id.split(",").map(id => id.trim()).filter(Boolean);
      } else if (!Array.isArray(data.product_id)) {
        data.product_id = [data.product_id];
      }
    }

    // 4. Instantiate and Save the Document
    const newOffer = new Offer({
      ...data,
      merchant_id: merchantId,
      start_date: finalStartDate,
      end_date: finalEndDate,
      location: data.location, // Injects verified [lng, lat] point object structures securely
      discount_percentage: data.discount_percentage ? Number(data.discount_percentage) : null,
      discount_value: data.discount_value ? Number(data.discount_value) : null,
      minimum_purchase_amount: data.minimum_purchase_amount ? Number(data.minimum_purchase_amount) : 0,
      number_of_winners: data.number_of_winners ? Number(data.number_of_winners) : null,
      free_quantity: data.free_quantity ? Number(data.free_quantity) : null,
      max_free_quantity: data.max_free_quantity ? Number(data.max_free_quantity) : null,
      tags: data.tags || [],
      product_id: data.product_id || []
    });

    await newOffer.save();

    // 5. Post-Save Step: Increment regional slot counters on config matrix tracking entries
    if (display_type === "calendar") {
      const targetDateLookup = new Date(finalStartDate);
      await CalendarConfig.findOneAndUpdate(
        { area_id: targetAreaId, date: targetDateLookup },
        { $inc: { current_booked_count: 1 } },
        { 
          upsert: true, 
          new: true, 
          setDefaultsOnInsert: true 
        } 
      );
    }

    return res.status(201).json({
      success: true,
      message: "Offer campaign submitted and listed successfully.",
      data: newOffer,
    });

  } catch (error) {
    console.error("Create Offer Coordinate Mapping Structural Failure Exception:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};



// Helper to normalize dates to strict UTC midnight
const normalizeDate = (dateString) => {
  if (!dateString) return null;
  const d = new Date(dateString);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

// --- 1. READ: Get All Active Offers (Merchant Dashboard View) ---
export const getMerchantOffers = async (req, res) => {
  try {
    const { display_type, search } = req.query;
    
    // Base filter: Only fetch non-deleted offers belonging to this logged-in merchant
    let query = { merchant_id: req.merchant._id, is_deleted: false };

    if (display_type && display_type !== "all") {
      query.display_type = display_type;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { tags: { $in: [search.toLowerCase()] } }
      ];
    }

    const offers = await Offer.find(query)
      .populate("offer_type_id", "label value")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: offers.length, data: offers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- 2. READ: Get Single Offer Details ---
export const getOfferDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const offer = await Offer.findOne({ _id: id, is_deleted: false })
      .populate("offer_type_id", "label value");

    if (!offer) {
      return res.status(404).json({ success: false, message: "Offer campaign not found." });
    }

    
    res.status(200).json({ success: true, data: offer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- 3. UPDATE: Modify Offer Campaign ---
export const updateOffer = async (req, res) => {
  try {
    const { id } = req.params;
    let updates = { ...req.body };

    // Find the original offer to evaluate slot adjustments if data shifts
    const existingOffer = await Offer.findOne({ _id: id, merchant_id: req.merchant._id, is_deleted: false });
    if (!existingOffer) {
      return res.status(404).json({ success: false, message: "Offer asset not found or unauthorized access." });
    }

    // Handle Multipart Image Replacement 
    if (req.file) {
      updates.thumbnail = `/uploads/${req.file.filename}`;
    }

    // Handle stringified tags array from frontend FormData 
    if (typeof updates.tags === "string") {
      updates.tags = updates.tags.split(",").map(t => t.trim()).filter(Boolean);
    }

    // Parse primitive numeric strings explicitly for validation
    if (updates.discount_percentage) updates.discount_percentage = Number(updates.discount_percentage);
    if (updates.discount_value) updates.discount_value = Number(updates.discount_value);
    if (updates.minimum_purchase_amount) updates.minimum_purchase_amount = Number(updates.minimum_purchase_amount);
    if (updates.number_of_winners) updates.number_of_winners = Number(updates.number_of_winners);

    // --- STRAT: CALENDAR SLOT TIMELINE RE-CALCULATION LOGIC ---
    const oldDisplayType = existingOffer.display_type;
    const newDisplayType = updates.display_type || oldDisplayType;
    
    const oldDateKey = existingOffer.start_date ? existingOffer.start_date.toISOString().split("T")[0] : null;
    const newDateKey = updates.start_date ? new Date(updates.start_date).toISOString().split("T")[0] : oldDateKey;

    // Check availability parameters IF the offer is shifting TO calendar, or CHANGING calendar dates
    if (newDisplayType === "calendar" && (oldDisplayType !== "calendar" || oldDateKey !== newDateKey)) {
      if (!updates.start_date && !existingOffer.start_date) {
        return res.status(400).json({ success: false, message: "A start date is mandatory for calendar positions." });
      }

      const targetDate = normalizeDate(updates.start_date || existingOffer.start_date);
      const dateRule = await CalendarConfig.findOne({ date: targetDate });
      const globalDefaultLimit = 5;

      if (dateRule) {
        if (dateRule.is_locked) {
          return res.status(400).json({ success: false, message: "The selected date is closed by administration." });
        }
        if (dateRule.current_booked_count >= dateRule.max_allowed_offers) {
          return res.status(400).json({ success: false, message: "Target date allocation limit is fully complete." });
        }
      } else {
        const liveCount = await Offer.countDocuments({ display_type: "calendar", start_date: targetDate, is_deleted: false, is_active: true });
        if (liveCount >= globalDefaultLimit) {
          return res.status(400).json({ success: false, message: "All default open positions for this date are full." });
        }
      }
    }
    // --- END: CALENDAR SLOT TIMELINE RE-CALCULATION LOGIC ---

    // Finalize date updates structures securely
    if (updates.start_date) {
      updates.start_date = normalizeDate(updates.start_date);
    }
    if (updates.end_date) {
      const parsedEnd = new Date(updates.end_date);
      parsedEnd.setUTCHours(23, 59, 59, 999);
      updates.end_date = parsedEnd;
    }

    // Execute database changes
    const updatedOffer = await Offer.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    // --- START: ADJUST BOOKING TRACKER COUNTERS POST-UPDATE ---
    // Scenario A: Swapped execution dates within calendar channels
    if (oldDisplayType === "calendar" && newDisplayType === "calendar" && oldDateKey !== newDateKey) {
      await CalendarConfig.findOneAndUpdate({ date: normalizeDate(oldDateKey) }, { $inc: { current_booked_count: -1 } });
      await CalendarConfig.findOneAndUpdate({ date: normalizeDate(newDateKey) }, { $inc: { current_booked_count: 1 } }, { upsert: true });
    }
    // Scenario B: Transformed from general asset to calendar layout position
    else if (oldDisplayType !== "calendar" && newDisplayType === "calendar") {
      await CalendarConfig.findOneAndUpdate({ date: normalizeDate(newDateKey) }, { $inc: { current_booked_count: 1 } }, { upsert: true });
    }
    // Scenario C: Removed from calendar layout structure, converting back to default
    else if (oldDisplayType === "calendar" && newDisplayType !== "calendar") {
      await CalendarConfig.findOneAndUpdate({ date: normalizeDate(oldDateKey) }, { $inc: { current_booked_count: -1 } });
    }
    // --- END: ADJUST BOOKING TRACKER COUNTERS POST-UPDATE ---

    res.status(200).json({ success: true, message: "Offer data updated correctly", data: updatedOffer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// --- 4. DELETE: Soft Delete Offer Campaign ---
export const deleteOffer = async (req, res) => {
  try {
    const { id } = req.params;

    const offer = await Offer.findOne({ _id: id, merchant_id: req.merchant._id, is_deleted: false });
    if (!offer) {
      return res.status(404).json({ success: false, message: "Offer not found or unauthorized." });
    }

    // Flag soft delete state parameters
    offer.is_deleted = true;
    offer.is_active = false;
    await offer.save();

    // If a calendar campaign is deleted, free up a slot on the admin grid
    if (offer.display_type === "calendar" && offer.start_date) {
      const targetDate = normalizeDate(offer.start_date);
      await CalendarConfig.findOneAndUpdate(
        { date: targetDate },
        { $inc: { current_booked_count: -1 } }
      );
    }

    res.status(200).json({ success: true, message: "Campaign dropped and removed from visibility pools." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const searchOffersByDisplayType = async (req, res) => {
  try {
    const { display_type } = req.params; // e.g., /api/offers/search/calendar
    const { q, page = 1, limit = 10 } = req.query; // e.g., ?q=sale&page=1&limit=10

    // 1. Validate display_type against your Mongoose Schema enum bounds
    const validDisplayTypes = ["banner", "calendar", "all"];
    if (!validDisplayTypes.includes(display_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid display type. Must be one of: ${validDisplayTypes.join(", ")}`
      });
    }

    // 2. Build the query object leveraging indexes
    // Only fetch non-deleted, active offers belonging to the logged-in merchant
    let query = {
      merchant_id: req.merchant._id,
      display_type: display_type,
      is_deleted: false,
      is_active: true
    };

    // 3. Add optional text/tag search if string 'q' is present
    if (q && q.trim() !== "") {
      const searchRegex = new RegExp(q.trim(), "i");
      query.$or = [
        { title: { $regex: searchRegex } },
        { description: { $regex: searchRegex } },
        { tags: { $in: [q.trim().toLowerCase()] } }
      ];
    }

    // 4. Implement Pagination for scalable frontend performance
    const skip = (Number(page) - 1) * Number(limit);

    const [offers, totalCount] = await Promise.all([
      Offer.find(query)
        .populate("offer_type_id", "label value")
        .sort({ start_date: 1, createdAt: -1 }) // Ordered chronologically
        .skip(skip)
        .limit(Number(limit)),
      Offer.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: offers.length,
      pagination: {
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: Number(page),
        limit: Number(limit)
      },
      data: offers
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Get Active Present-Day Campaigns (Customer View) ---
// --- Get Active Present-Day Campaigns (Customer View optimized for IST) ---
// --- Get Active Present-Day Campaigns (Customer View optimized for IST) ---
export const getActiveOffersForToday = async (req, res) => {
  try {
    const { display_type } = req.query; // Optional filter: 'banner', 'calendar', or 'all'
    
    // 1. Calculate Today's start and end boundaries explicitly in IST (+5:30)
    const now = new Date();
    
    
    // Convert current UTC time to IST components
    const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    
    // Create the exact start boundary of "Today" in IST (00:00:00.000)
    const todayStartIST = new Date(Date.UTC(
      istTime.getUTCFullYear(),
      istTime.getUTCMonth(),
      istTime.getUTCDate(),
      0, 0, 0, 0
    ));

    // Shift back by 5.5 hours to get the exact UTC timestamp for IST midnight
    const searchThresholdUTC = new Date(todayStartIST.getTime() - (5.5 * 60 * 60 * 1000));

    // 2. Build the query object
    // Rules: 
    // - Must be active and not deleted
    // - start_date must be less than or equal to current time (it has already started)
    // - end_date must be greater than or equal to the START of today in IST (it hasn't expired before today)
    let query = {
      is_deleted: false,
      is_active: true,
      start_date: { $lte: now },                  // Campaign has officially kicked off
      end_date: { $gte: searchThresholdUTC }      // Campaign ends sometime today or anytime in the future
    };

    // 3. Handle optional display layout structures
    if (display_type && display_type !== "all") {
      query.display_type = display_type;
    }

    // 4. Execute lookups
    const liveOffers = await Offer.find(query)
      .populate("merchant_id", "store_name logo address contact_phone")
      .populate("offer_type_id", "label value")
      .sort({ is_featured: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: liveOffers.length,
      timezone: "IST (Asia/Kolkata)",
      evaluated_date_start: searchThresholdUTC.toISOString(),
      data: liveOffers
    });

  } catch (error) {
    console.error("IST Daily Offers Extraction Failure:", error);
    res.status(500).json({ 
      success: false, 
      message: "Unable to retrieve today's campaign catalog streams." 
    });
  }
};

// ==========================================
// ADMINISTRATIVE PLATFORM OVERVIEWS
// ==========================================

// --- 1. Read Master Offers Queue (Admin Dashboard view) ---
export const getAllOffersAdmin = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = "", 
      display_type, 
      status // e.g. 'active' or 'expired'
    } = req.query;

    // Base query filter tracking non-deleted system entries
    let query = { is_deleted: false };

    // Handle optional text queries matching title parameters or tag flags
    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [
        { title: { $regex: searchRegex } },
        { description: { $regex: searchRegex } },
        { tags: { $in: [search.trim().toLowerCase()] } }
      ];
    }

    // Apply layout presentation constraints if passed
    if (display_type && display_type !== "all") {
      query.display_type = display_type;
    }

    // Filter by live temporal execution timelines
    const now = new Date();
    if (status === "active") {
      query.is_active = true;
      query.start_date = { $lte: now };
      query.end_date = { $gte: now };
    } else if (status === "expired") {
      query.$or = [
        { is_active: false },
        { end_date: { $lt: now } }
      ];
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    // Run parallel aggregation tasks to prevent bottleneck queries
    const [offers, totalCount] = await Promise.all([
      Offer.find(query)
        .populate("merchant_id", "name email phone logo")
        .populate("offer_type_id", "label value")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Offer.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: offers.length,
      pagination: {
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
        currentPage: Number(page)
      },
      data: offers
    });

  } catch (error) {
    console.error("Admin Catalog Retrieval Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- 2. Read Deep Offer & Merchant Correlation (Admin Detail View) ---
export const getOfferDetailWithMerchantAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // Finds target campaign and resolves full parent entity parameters
    const offerDetails = await Offer.findOne({ _id: id, is_deleted: false })
      .populate({
        path: "merchant_id",
        select: "store_name owner_name email contact_phone alternative_phone address business_type is_verified createdAt"
      })
      .populate("offer_type_id", "label value");

    if (!offerDetails) {
      return res.status(404).json({ 
        success: false, 
        message: "The requested campaign data footprint does not exist or has been deleted." 
      });
    }

    res.status(200).json({
      success: true,
      data: offerDetails
    });

  } catch (error) {
    console.error("Admin Complete Identity Resolve Failure:", error);
    res.status(500).json({ success: false, message: "Internal metadata populating routine error." });
  }
};

// --- Revive Past/Archived Offer Campaign (Merchant Action) ---
export const revivePastOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.body;

    if (!start_date || !end_date) {
      return res.status(400).json({ 
        success: false, 
        message: "Both new start and end dates are required to revive a campaign." 
      });
    }

    // 1. Isolate target offer and ensure it belongs to the logged-in merchant
    const existingOffer = await Offer.findOne({ _id: id, merchant_id: req.merchant._id });
    if (!existingOffer) {
      return res.status(404).json({ success: false, message: "Target campaign asset not found." });
    }

    // 2. Strict Timezone Normalization matching BachatBazarr engine rules
    const finalStartDate = new Date(start_date);
    finalStartDate.setUTCHours(0, 0, 0, 0);

    const finalEndDate = new Date(end_date);
    finalEndDate.setUTCHours(23, 59, 59, 999);

    if (finalEndDate < finalStartDate) {
      return res.status(400).json({ success: false, message: "End date cannot occur before the start date." });
    }

    // 3. Conditional Calendar Allocation Check (Only if layout configuration is 'calendar')
    if (existingOffer.display_type === "calendar") {
      const dateRule = await CalendarConfig.findOne({ date: finalStartDate });
      const globalDefaultLimit = 5;

      if (dateRule) {
        if (dateRule.is_locked) {
          return res.status(400).json({ 
            success: false, 
            message: "Campaign creations for this target date have been locked by administration." 
          });
        }
        if (dateRule.current_booked_count >= dateRule.max_allowed_offers) {
          return res.status(400).json({ 
            success: false, 
            message: `The calendar limit for this date has been reached (${dateRule.max_allowed_offers} max). Please pick a different day.` 
          });
        }
      } else {
        const activeLiveBookings = await Offer.countDocuments({
          display_type: "calendar",
          start_date: finalStartDate,
          is_active: true,
          is_deleted: false
        });

        if (activeLiveBookings >= globalDefaultLimit) {
          return res.status(400).json({ 
            success: false, 
            message: `All standard baseline slots (${globalDefaultLimit}) for this date are full.` 
          });
        }
      }
    }

    // 4. Perform atomic update: Reset flags, clear deletion status, and load new timestamps
    existingOffer.start_date = finalStartDate;
    existingOffer.end_date = finalEndDate;
    existingOffer.is_active = true;
    existingOffer.is_deleted = false; // Restores item cleanly if it was previously trashed

    await existingOffer.save();

    // 5. Increment tracker ticker if slot is a calendar position
    if (existingOffer.display_type === "calendar") {
      await CalendarConfig.findOneAndUpdate(
        { date: finalStartDate },
        { $inc: { current_booked_count: 1 } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    res.status(200).json({
      success: true,
      message: "Campaign revived and re-listed successfully.",
      data: existingOffer
    });

  } catch (error) {
    console.error("Offer Revival Processing Failure:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};



export const getOffersStatsSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Both startDate and endDate parameters are required to calculate range metrics.",
      });
    }

    const currentStart = new Date(startDate);
    const currentEnd = new Date(endDate);
    currentEnd.setUTCHours(23, 59, 59, 999); // Cover the full boundary of the final day

    // --- AUTOMATIC TREND RANGE COMPUTATION ---
    // Calculate the length of the selected window in milliseconds to dynamically compute the historical comparison baseline
    const timeFrameDelta = currentEnd.getTime() - currentStart.getTime();
    const previousStart = new Date(currentStart.getTime() - timeFrameDelta);
    const previousEnd = new Date(currentStart.getTime() - 1); // Up to the millisecond before the current range

    // --- AGGREGATION PIPELINE FOR THE CURRENT WINDOW ---
    const currentStatsArray = await Offer.aggregate([
      {
        $match: {
          is_deleted: false,
          createdAt: { $gte: currentStart, $lte: currentEnd }
        }
      },
      {
        $group: {
          _id: null,
          totalOffers: { $sum: 1 },
          activeOffers: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$is_active", true] },
                    { $lte: ["$start_date", currentEnd] },
                    { $gte: ["$end_date", currentStart] }
                  ]
                },
                1,
                0
              ]
            }
          },
          hotOffers: {
            // Hot Offers metrics computed by identifying campaigns containing specific priority layout configurations or winners limits
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$is_active", true] },
                    { $gt: ["$number_of_winners", 0] }
                  ]
                },
                1,
                0
              ]
            }
          },
          // Aggregate potential or documented winner metrics as high fidelity redemption counters
          offersRedeemed: { $sum: { $ifNull: ["$number_of_winners", 0] } }
        }
      }
    ]);

    // --- AGGREGATION PIPELINE FOR THE HISTORICAL WORKSPACE WINDOW ---
    const previousStatsArray = await Offer.aggregate([
      {
        $match: {
          is_deleted: false,
          createdAt: { $gte: previousStart, $lte: previousEnd }
        }
      },
      {
        $group: {
          _id: null,
          totalOffers: { $sum: 1 },
          activeOffers: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$is_active", true] },
                    { $lte: ["$start_date", previousEnd] },
                    { $gte: ["$end_date", previousStart] }
                  ]
                },
                1,
                0
              ]
            }
          },
          hotOffers: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$is_active", true] },
                    { $gt: ["$number_of_winners", 0] }
                  ]
                },
                1,
                0
              ]
            }
          },
          offersRedeemed: { $sum: { $ifNull: ["$number_of_winners", 0] } }
        }
      }
    ]);

    // Extract computed buckets or default to zero structure arrays
    const current = currentStatsArray[0] || { totalOffers: 0, activeOffers: 0, hotOffers: 0, offersRedeemed: 0 };
    const previous = previousStatsArray[0] || { totalOffers: 0, activeOffers: 0, hotOffers: 0, offersRedeemed: 0 };

    // --- MATRICES TREND CALCULATOR FUNCTION ---
    const calculateTrend = (currentVal, previousVal) => {
      if (!previousVal || previousVal === 0) {
        return { value: currentVal > 0 ? "+100%" : "0%", isPositive: currentVal > 0 };
      }
      const percentageChange = (((currentVal - previousVal) / previousVal) * 100).toFixed(1);
      const isPositive = currentVal >= previousVal;
      return {
        value: `${isPositive ? "+" : ""}${percentageChange}%`,
        isPositive
      };
    };

    // Compile dynamic trends map
    const responsePayload = {
      totalOffers: current.totalOffers,
      activeOffers: current.activeOffers,
      hotOffers: current.hotOffers,
      offersRedeemed: current.offersRedeemed,
      trends: {
        total: calculateTrend(current.totalOffers, previous.totalOffers),
        active: calculateTrend(current.activeOffers, previous.activeOffers),
        hot: calculateTrend(current.hotOffers, previous.hotOffers),
        redeemed: calculateTrend(current.offersRedeemed, previous.offersRedeemed)
      }
    };

    res.status(200).json({
      success: true,
      data: responsePayload
    });

  } catch (error) {
    console.error("Analytics Aggregation Failure:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};