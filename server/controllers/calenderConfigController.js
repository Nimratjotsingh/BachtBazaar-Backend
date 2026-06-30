import CalendarConfig from "../models/calenderConfigModel.js"; // Pointing to your refactored model referencing Area
import Offer from "../models/offerModel.js";
import Area from "../models/AreaModel.js";
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
// const normalizeToMidnight = (dateString) => {
//   if (!dateString) return null;
//   const cleanDateString = dateString.includes("T") ? dateString.split("T")[0] : dateString;
//   const [year, month, day] = cleanDateString.split("-").map(Number);
//   return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
// };

export const checkDateAvailability = async (req, res) => {
  try {
    const { area_id, start, end } = req.query;
    
    if (!area_id || !start || !end) {
      return res.status(400).json({ 
        success: false, 
        message: "area_id, start date, and end date query parameters are all required." 
      });
    }

    if (!mongoose.Types.ObjectId.isValid(area_id)) {
      return res.status(400).json({ success: false, message: "Invalid Area ID format." });
    }

    const startDate = normalizeToMidnight(start);
    const endDate = normalizeToMidnight(end);

    if (endDate < startDate) {
      return res.status(400).json({ 
        success: false, 
        message: "The end date perimeter cannot be chronologically before the start date." 
      });
    }

    const globalDefaultLimit = 5; 

    // 1. Fetch any explicit admin override configurations saved for this Area within the range
    const adminConfigs = await CalendarConfig.find({
      area_id,
      date: { $gte: startDate, $lte: endDate }
    }).lean();

    // Convert admin configs to a simple string key lookup map: { 'YYYY-MM-DD': configObject }
    const configMap = {};
    adminConfigs.forEach(config => {
      const dateKey = new Date(config.date).toISOString().split("T")[0];
      configMap[dateKey] = config;
    });

    // 2. Fetch all merchant IDs mapped to this specific Area zone footprint
    const areaMerchantIds = await mongoose.model("MerchantShop").find({ area_id }).distinct("merchantId");

    // 3. Aggregate active organic merchant bookings running during this date frame window
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

    // Map live counts into a fast lookup dictionary: { 'YYYY-MM-DD': count }
    const liveBookingsMap = {};
    liveOffersAggregation.forEach(item => {
      if (item._id) {
        const dateKey = new Date(item._id).toISOString().split("T")[0];
        liveBookingsMap[dateKey] = item.count;
      }
    });

    // 4. Loop day-by-day to assemble a flawless, gap-free calendar schedule grid array
    const rangeAvailabilitySchedule = [];
    let currentStepDate = new Date(startDate);

    while (currentStepDate <= endDate) {
      const dateKey = currentStepDate.toISOString().split("T")[0];
      
      const savedConfig = configMap[dateKey];
      const liveBookingVolume = liveBookingsMap[dateKey] || 0;

      // Decide parameters based on whether the admin specified unique override values
      const maxSlots = savedConfig ? savedConfig.max_allowed_offers : globalDefaultLimit;
      const isLocked = savedConfig ? savedConfig.is_locked : false;
      
      // Use the max value between the explicit counter or real database counts to ensure absolute accuracy
      const bookedSlots = Math.max(liveBookingVolume, savedConfig ? savedConfig.current_booked_count : 0);
      const slotsRemaining = isLocked ? 0 : Math.max(0, maxSlots - bookedSlots);

      rangeAvailabilitySchedule.push({
        date: currentStepDate.toISOString(), // ISO String representation for frontend parsing
        dateString: dateKey,                // Clean 'YYYY-MM-DD' literal format
        is_locked: isLocked,
        max_slots: maxSlots,
        booked_slots: bookedSlots,
        slots_remaining: slotsRemaining
      });

      // Safely advance calendar pointer step by exactly 1 day UTC
      currentStepDate.setUTCDate(currentStepDate.getUTCDate() + 1);
    }

    // 5. Deliver complete structured status stream payload
    return res.status(200).json({
      success: true,
      area_id,
      range: { start: dateKeyString(startDate), end: dateKeyString(endDate) },
      totalDaysTracked: rangeAvailabilitySchedule.length,
      schedule: rangeAvailabilitySchedule
    });

  } catch (error) {
    console.error("Range Availability Core Calculation Pipeline Failure:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Quick structural internal string formatter utility
const dateKeyString = (dateObj) => dateObj.toISOString().split("T")[0];

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


export const checkDateAvailabilityRangeByCoords = async (req, res) => {
  try {
    const { lat, lng, start, end } = req.query;
    
    // 1. Initial parameter sanity checks
    if (lat === undefined || lng === undefined || !start || !end) {
      return res.status(400).json({ 
        success: false, 
        message: "lat, lng, start date, and end date query parameters are all strictly required." 
      });
    }

    const startDate = normalizeToMidnight(start);
    const endDate = normalizeToMidnight(end);

    console.log(startDate,endDate)

    if (endDate < startDate) {
      return res.status(400).json({ 
        success: false, 
        message: "The end date parameter window cannot be chronologically older than the start date." 
      });
    }

    console.log(lat,lng,start,end)
    // 2. Geospatial Lookups: Resolve coordinates map location back to an active system Area
    const closestArea = await Area.findOne({
  is_active: true,
  center_location: {
    $nearSphere: {
      $geometry: {
        type: "Point",
        // Force conversion to numbers to eliminate string type coercion issues
        coordinates: [Number(lng), Number(lat)] 
      }
    }
  }
}).select("_id name radius_km");

    console.log(closestArea)
    

    if (!closestArea) {
      return res.status(404).json({
        success: false,
        message: "The requested shop coordinates do not map into any active BachatBazarr operation boundaries."
      });
    }

    const targetAreaId = closestArea._id;
    const globalDefaultLimit = 5; 

    // 3. Concurrently pull administration configs and merchant bookings
    // Pulls all matching shop identifiers in that region zone footprint
    const areaMerchantIds = await mongoose.model("MerchantShop").find({ area_id: targetAreaId }).distinct("merchantId");

    const [adminConfigs, liveOffersAggregation] = await Promise.all([
      // A. Fetch explicit override rules set by the administration
      CalendarConfig.find({
        area_id: targetAreaId,
        date: { $gte: startDate, $lte: endDate }
      }).lean(),

      // B. Aggregate actual database metrics counts running during this range frame segment
      Offer.aggregate([
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
      ])
    ]);

    // 4. Map query returns into dictionary maps for instantaneous day array verification lookups
    const configMap = {};
    adminConfigs.forEach(config => {
      const dateKey = new Date(config.date).toISOString().split("T")[0];
      configMap[dateKey] = config;
    });

    const liveBookingsMap = {};
    liveOffersAggregation.forEach(item => {
      if (item._id) {
        const dateKey = new Date(item._id).toISOString().split("T")[0];
        liveBookingsMap[dateKey] = item.count;
      }
    });

    // 5. Loop step pointer chronologically to map out the response schedule list grid array
    const rangeAvailabilitySchedule = [];
    let currentStepDate = new Date(startDate);

    while (currentStepDate <= endDate) {
      const dateKey = currentStepDate.toISOString().split("T")[0];
      
      const savedConfig = configMap[dateKey];
      const liveBookingVolume = liveBookingsMap[dateKey] || 0;

      const maxSlots = savedConfig ? savedConfig.max_allowed_offers : globalDefaultLimit;
      const isLocked = savedConfig ? savedConfig.is_locked : false;
      
      const bookedSlots = Math.max(liveBookingVolume, savedConfig ? savedConfig.current_booked_count : 0);
      const slotsRemaining = isLocked ? 0 : Math.max(0, maxSlots - bookedSlots);

      rangeAvailabilitySchedule.push({
        date: currentStepDate.toISOString(),
        dateString: dateKey,
        is_locked: isLocked,
        max_slots: maxSlots,
        booked_slots: bookedSlots,
        slots_remaining: slotsRemaining
      });

      currentStepDate.setUTCDate(currentStepDate.getUTCDate() + 1);
    }

    // 6. Return response array transmission payload
    return res.status(200).json({
      success: true,
      resolved_area: {
        _id: targetAreaId,
        name: closestArea.name,
        radius_km: closestArea.radius_km
      },
      totalDaysTracked: rangeAvailabilitySchedule.length,
      schedule: rangeAvailabilitySchedule
    });

  } catch (error) {
    // console.error("Geospatial Range Availability Core Calculation Failure Exception:", error);
    return res.status(500).json({ success: false, message: "Internal application token processing state pipeline fault." });
  }
};