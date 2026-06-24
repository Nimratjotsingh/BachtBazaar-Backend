import CalendarConfig from "../models/calenderConfigModel.js"; // Pointing to your refactored model referencing Area
import Offer from "../models/offerModel.js";
import Area from "../models/adminModel.js";
import mongoose from "mongoose";

// Helper to clean up time data and set it strictly to UTC Midnight
const normalizeToMidnight = (dateString) => {
  if (!dateString) return null;

  const cleanDateString = dateString.includes("T") 
    ? dateString.split("T")[0] 
    : dateString;

  const [year, month, day] = cleanDateString.split("-").map(Number);
  const targetDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  
  return targetDate;
};

// ====================================================================
// --- 1. CREATE OR UPDATE DAILY AREA SLOT LIMIT (Admin Only) ---------
// ====================================================================
export const setDailySlotLimit = async (req, res) => {
  try {
    const { area_id, date, max_allowed_offers, notes, is_locked } = req.body;

    if (!area_id || !date) {
      return res.status(400).json({ 
        success: false, 
        message: "Both area_id and a targeted configuration date are required." 
      });
    }

    if (!mongoose.Types.ObjectId.isValid(area_id)) {
      return res.status(400).json({ success: false, message: "Invalid Area ID format." });
    }

    const targetDate = normalizeToMidnight(date);

    // Find if a rule configuration already exists for this day in this specific area
    let dateRule = await CalendarConfig.findOne({ area_id, date: targetDate });

    if (dateRule) {
      // Update existing day area configuration safely
      if (max_allowed_offers !== undefined) dateRule.max_allowed_offers = Number(max_allowed_offers);
      if (notes !== undefined) dateRule.notes = notes;
      if (is_locked !== undefined) dateRule.is_locked = is_locked;
      
      await dateRule.save();
      return res.status(200).json({ success: true, message: "Daily area slot rule modified.", data: dateRule });
    }

    // Otherwise, check for active offers from merchants belonging to this Area
    // Trace merchants through the MerchantShop mapping
    const activeOffersInAreaCount = await Offer.countDocuments({
      display_type: "calendar",
      start_date: targetDate,
      is_deleted: false,
      is_active: true,
      merchant_id: { 
        $in: await mongoose.model("MerchantShop").find({ area_id }).distinct("merchantId") 
      }
    });

    const newRule = new CalendarConfig({
      area_id,
      date: targetDate,
      max_allowed_offers: max_allowed_offers !== undefined ? Number(max_allowed_offers) : 5,
      current_booked_count: activeOffersInAreaCount,
      notes: notes?.trim() || "",
      is_locked: is_locked ?? false
    });

    await newRule.save();
   
    res.status(201).json({ success: true, message: "Daily slot rule configured successfully for Area.", data: newRule });
  } catch (error) {
    console.error("Set Daily Area Slot Limit Error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// ====================================================================
// --- 2. GET CALENDAR SCHEDULE BY AREA (Admin View) -----------------
// ====================================================================
export const getCalendarScheduleAdmin = async (req, res) => {
  try {
    const { area_id, start, end } = req.query;
    
    if (!area_id || !start || !end) {
      return res.status(400).json({ 
        success: false, 
        message: "area_id, start, and end dates are required query fields." 
      });
    }

    const startDate = normalizeToMidnight(start);
    const endDate = normalizeToMidnight(end);

    // 1. Fetch any explicit override configs saved by the admin for this specific Area
    const adminConfigs = await CalendarConfig.find({
      area_id,
      date: { $gte: startDate, $lte: endDate }
    });

    // Extract all merchant IDs inside this area zone perimeter
    const areaMerchantIds = await mongoose.model("MerchantShop").find({ area_id }).distinct("merchantId");

    // 2. Aggregate live merchant bookings running during this month window in this Area
    const liveOffersAggregation = await Offer.aggregate([
      {
        $match: {
          display_type: "calendar",
          is_deleted: false,
          is_active: true,
          start_date: { $gte: startDate, $lte: endDate },
          merchant_id: { $in: areaMerchantIds }
        }
      },
      {
        $group: {
          _id: "$start_date",
          count: { $sum: 1 }
        }
      }
    ]);

    const liveBookingsMap = {};
    liveOffersAggregation.forEach(item => {
      if (item._id) {
        const dateString = new Date(item._id).toISOString().split("T")[0];
        liveBookingsMap[dateString] = item.count;
      }
    });

    const configMap = {};
    adminConfigs.forEach(config => {
      const dateString = new Date(config.date).toISOString().split("T")[0];
      configMap[dateString] = config;
    });

    // 3. Build a complete schedule grid array per day
    const comprehensiveSchedule = [];
    let currentStepDate = new Date(startDate);

    while (currentStepDate <= endDate) {
      const dateKey = currentStepDate.toISOString().split("T")[0];
      const savedConfig = configMap[dateKey];
      const liveBookingVolume = liveBookingsMap[dateKey] || 0;

      comprehensiveSchedule.push({
        date: currentStepDate.toISOString(),
        area_id,
        max_allowed_offers: savedConfig ? savedConfig.max_allowed_offers : 5, 
        current_booked_count: Math.max(liveBookingVolume, savedConfig ? savedConfig.current_booked_count : 0),
        notes: savedConfig ? savedConfig.notes : "",
        is_locked: savedConfig ? savedConfig.is_locked : false
      });

      currentStepDate.setUTCDate(currentStepDate.getUTCDate() + 1);
    }

    res.status(200).json({ success: true, data: comprehensiveSchedule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ====================================================================
// --- 3. CHECK SPECIFIC AREA AVAILABILITY (Merchant Form UI Guard) ---
// ====================================================================
export const checkDateAvailability = async (req, res) => {
  try {
    const { area_id, date } = req.query;
    if (!area_id || !date) {
      return res.status(400).json({ success: false, message: "Both area_id and date parameters are missing." });
    }

    const targetDate = normalizeToMidnight(date);
    const globalDefaultLimit = 5; 

    const dateRule = await CalendarConfig.findOne({ area_id, date: targetDate });

    if (dateRule) {
      return res.status(200).json({
        success: true,
        date: targetDate,
        area_id,
        is_locked: dateRule.is_locked,
        max_slots: dateRule.max_allowed_offers,
        booked_slots: dateRule.current_booked_count,
        slots_remaining: Math.max(0, dateRule.max_allowed_offers - dateRule.current_booked_count)
      });
    }

    // Trace regional counts natively if explicit override configs don't exist yet
    const areaMerchantIds = await mongoose.model("MerchantShop").find({ area_id }).distinct("merchantId");
    const liveBookedCount = await Offer.countDocuments({
      display_type: "calendar",
      start_date: targetDate,
      is_deleted: false,
      is_active: true,
      merchant_id: { $in: areaMerchantIds }
    });

    res.status(200).json({
      success: true,
      date: targetDate,
      area_id,
      is_locked: false,
      max_slots: globalDefaultLimit,
      booked_slots: liveBookedCount,
      slots_remaining: Math.max(0, globalDefaultLimit - liveBookedCount)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ====================================================================
// --- 4. RECALCULATE TICKER COUNTS (Sync Safeguard Utility) ---------
// ====================================================================
export const syncCalendarCounts = async (req, res) => {
  try {
    const { area_id, date } = req.body;
    if (!area_id || !date) return res.status(400).json({ message: "Both area_id and date are required." });

    const targetDate = normalizeToMidnight(date);
    const areaMerchantIds = await mongoose.model("MerchantShop").find({ area_id }).distinct("merchantId");

    const actualCount = await Offer.countDocuments({
      display_type: "calendar",
      start_date: targetDate,
      is_deleted: false,
      is_active: true,
      merchant_id: { $in: areaMerchantIds }
    });

    const updatedConfig = await CalendarConfig.findOneAndUpdate(
      { area_id, date: targetDate },
      { $set: { current_booked_count: actualCount } },
      { new: true, upsert: true } // Creates placeholder if missing
    );

    res.status(200).json({ success: true, message: "Area counter synchronized successfully.", data: updatedConfig });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ====================================================================
// --- 5. GET CALENDAR SCHEDULE BY ROUTE PARAMS (Admin Range View) ----
// ====================================================================
export const getCalendarScheduleByParams = async (req, res) => {
  try {
    const { areaId, start, end } = req.params; 
    
    if (!areaId || !start || !end) {
      return res.status(400).json({ 
        success: false, 
        message: "areaId, start, and end dates must be provided within the URL parameter paths." 
      });
    }

    const startDate = normalizeToMidnight(start);
    const endDate = normalizeToMidnight(end);

    const adminConfigs = await CalendarConfig.find({
      area_id: areaId,
      date: { $gte: startDate, $lte: endDate }
    });

    const areaMerchantIds = await mongoose.model("MerchantShop").find({ area_id: areaId }).distinct("merchantId");

    const liveOffersAggregation = await Offer.aggregate([
      {
        $match: {
          display_type: "calendar",
          is_deleted: false,
          is_active: true,
          start_date: { $gte: startDate, $lte: endDate },
          merchant_id: { $in: areaMerchantIds }
        }
      },
      {
        $group: {
          _id: "$start_date",
          count: { $sum: 1 }
        }
      }
    ]);

    const liveBookingsMap = {};
    liveOffersAggregation.forEach(item => {
      if (item._id) {
        const dateString = new Date(item._id).toISOString().split("T")[0];
        liveBookingsMap[dateString] = item.count;
      }
    });

    const configMap = {};
    adminConfigs.forEach(config => {
      const dateString = new Date(config.date).toISOString().split("T")[0];
      configMap[dateString] = config;
    });

    const comprehensiveSchedule = [];
    let currentStepDate = new Date(startDate);

    while (currentStepDate <= endDate) {
      const dateKey = currentStepDate.toISOString().split("T")[0];
      const savedConfig = configMap[dateKey];
      const liveBookingVolume = liveBookingsMap[dateKey] || 0;

      comprehensiveSchedule.push({
        date: currentStepDate.toISOString(),
        area_id: areaId,
        max_allowed_offers: savedConfig ? savedConfig.max_allowed_offers : 5, 
        current_booked_count: Math.max(liveBookingVolume, savedConfig ? savedConfig.current_booked_count : 0),
        notes: savedConfig ? savedConfig.notes : "",
        is_locked: savedConfig ? savedConfig.is_locked : false
      });

      currentStepDate.setUTCDate(currentStepDate.getUTCDate() + 1);
    }

    return res.status(200).json({ success: true, data: comprehensiveSchedule });
  } catch (error) {
    console.error("Parametric Range Area Audit Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};