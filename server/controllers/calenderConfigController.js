import CalendarConfig from "../models/calenderConfigModel.js";
import Offer from "../models/offerModel.js";

// Helper to clean up time data and set it strictly to UTC Midnight
// --- FIXED TIMEZONE-SAFE HELPER ---
const normalizeToMidnight = (dateString) => {
  if (!dateString) return null;

  // If the frontend sends a full ISO string (contains 'T'), isolate the date segment
  const cleanDateString = dateString.includes("T") 
    ? dateString.split("T")[0] 
    : dateString;

  // Split by '-' and force integers to build an absolute UTC date profile.
  // This completely eliminates local server timezone distortion offsets.
  const [year, month, day] = cleanDateString.split("-").map(Number);
  
  // Create a strict UTC date constructor instance matching the exact inputs
  const targetDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  
  return targetDate;
};

// --- Create or Update a Daily Slot Limit (Admin Only) ---
export const setDailySlotLimit = async (req, res) => {
  try {
    const { date, max_allowed_offers, notes, is_locked } = req.body;

    console.log(date)

    if (!date) {
      return res.status(400).json({ success: false, message: "A targeted date is required." });
    }

    // Process the input date safely without shifting days backward or forward
    const targetDate = normalizeToMidnight(date);

    // Find if a rule configuration already exists for this day
    let dateRule = await CalendarConfig.findOne({ date: targetDate });

    if (dateRule) {
      // Update existing day configuration rule safely
      if (max_allowed_offers !== undefined) dateRule.max_allowed_offers = Number(max_allowed_offers);
      if (notes !== undefined) dateRule.notes = notes;
      if (is_locked !== undefined) dateRule.is_locked = is_locked;
      
      await dateRule.save();
      return res.status(200).json({ success: true, message: "Daily slot rule modified.", data: dateRule });
    }

    // Otherwise, calculate current bookings reactively if offers already exist for this exact date
    const preExistingBookings = await Offer.countDocuments({
      display_type: "calendar",
      start_date: targetDate,
      is_deleted: false,
      is_active: true
    });

    const newRule = new CalendarConfig({
      date: targetDate,
      max_allowed_offers: max_allowed_offers !== undefined ? Number(max_allowed_offers) : 5,
      current_booked_count: preExistingBookings,
      notes: notes?.trim() || "",
      is_locked: is_locked ?? false
    });

    await newRule.save();
   
    res.status(201).json({ success: true, message: "Daily slot rule configured successfully.", data: newRule });
  } catch (error) {
    console.error("Set Daily Slot Limit Error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// --- Get Calendar Slot List / View Schedule (Admin View) ---
export const getCalendarScheduleAdmin = async (req, res) => {
  console.log('hi')
  try {
    const { start, end } = req.query;
    if (!start || !end) {
      return res.status(400).json({ success: false, message: "Start and end dates are required query fields." });
    }

    const startDate = normalizeToMidnight(start);
    const endDate = normalizeToMidnight(end);

    // 1. Fetch any explicit override configs saved by the admin
    const adminConfigs = await CalendarConfig.find({
      date: { $gte: startDate, $lte: endDate }
    });

    // 2. Aggregate organic live merchant bookings running during this month window
    const liveOffersAggregation = await Offer.aggregate([
      {
        $match: {
          display_type: "calendar",
          is_deleted: false,
          is_active: true,
          start_date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: "$start_date",
          count: { $sum: 1 }
        }
      }
    ]);

    // Map live aggregations into a convenient map dictionary: { 'YYYY-MM-DD': count }
    const liveBookingsMap = {};
    liveOffersAggregation.forEach(item => {
      if (item._id) {
        const dateString = new Date(item._id).toISOString().split("T")[0];
        liveBookingsMap[dateString] = item.count;
      }
    });

    // Map administrative configurations into a dictionary: { 'YYYY-MM-DD': configObject }
    const configMap = {};
    adminConfigs.forEach(config => {
      const dateString = new Date(config.date).toISOString().split("T")[0];
      configMap[dateString] = config;
    });

    // 3. Build a complete layout grid array for every day within the query frame range
    const comprehensiveSchedule = [];
    let currentStepDate = new Date(startDate);

    while (currentStepDate <= endDate) {
      const dateKey = currentStepDate.toISOString().split("T")[0];
      const savedConfig = configMap[dateKey];
      const liveBookingVolume = liveBookingsMap[dateKey] || 0;
  


      comprehensiveSchedule.push({
        date: currentStepDate.toISOString(),
        max_allowed_offers: savedConfig ? savedConfig.max_allowed_offers : '5', // fallback global limit
        current_booked_count: Math.max(liveBookingVolume, savedConfig ? savedConfig.current_booked_count : 0),
        notes: savedConfig ? savedConfig.notes : "",
        is_locked: savedConfig ? savedConfig.is_locked : false
      });

      // Advance by 1 day cleanly
      currentStepDate.setUTCDate(currentStepDate.getUTCDate() + 1);
    }

    res.status(200).json({ success: true, data: comprehensiveSchedule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// --- Check specific availability availability (Called by Merchant Form UI) ---
export const checkDateAvailability = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ success: false, message: "Date parameter is missing." });
    }

    const targetDate = normalizeToMidnight(date);
    const globalDefaultLimit = 5; // Fallback cap if admin hasn't created a rule yet

    const dateRule = await CalendarConfig.findOne({ date: targetDate });

    if (dateRule) {
      return res.status(200).json({
        success: true,
        date: targetDate,
        is_locked: dateRule.is_locked,
        max_slots: dateRule.max_allowed_offers,
        booked_slots: dateRule.current_booked_count,
        slots_remaining: Math.max(0, dateRule.max_allowed_offers - dateRule.current_booked_count)
      });
    }

    // If no configuration document exists yet, check database counts directly against fallback
    const liveBookedCount = await Offer.countDocuments({
      display_type: "calendar",
      start_date: targetDate,
      is_deleted: false,
      is_active: true
    });

    res.status(200).json({
      success: true,
      date: targetDate,
      is_locked: false,
      max_slots: globalDefaultLimit,
      booked_slots: liveBookedCount,
      slots_remaining: Math.max(0, globalDefaultLimit - liveBookedCount)
    });
  } catch (error) {
    console.log(error)
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Recalculate Ticker Counts (Sync Safeguard Utility) ---
export const syncCalendarCounts = async (req, res) => {
  try {
    const { date } = req.body;
    if (!date) return res.status(400).json({ message: "Date is required." });

    const targetDate = normalizeToMidnight(date);

    const actualCount = await Offer.countDocuments({
      display_type: "calendar",
      start_date: targetDate,
      is_deleted: false,
      is_active: true
    });

    const updatedConfig = await CalendarConfig.findOneAndUpdate(
      { date: targetDate },
      { $set: { current_booked_count: actualCount } },
      { new: true }
    );

    res.status(200).json({ success: true, message: "Counter synced successfully.", data: updatedConfig });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Get Calendar Schedule by Route Parameters (Admin Dynamic View) ---
// Route shape example: /api/calendar-config/admin/schedule/:start/:end
export const getCalendarScheduleByParams = async (req, res) => {
  try {
    const { start, end } = req.params; // Read from path parameters instead of queries
    
    if (!start || !end) {
      return res.status(400).json({ 
        success: false, 
        message: "Start and end dates must be provided within the URL path layout rules." 
      });
    }

    const startDate = normalizeToMidnight(start);
    const endDate = normalizeToMidnight(end);

    if (endDate < startDate) {
      return res.status(400).json({ 
        success: false, 
        message: "The end date perimeter cannot be historically behind the start date." 
      });
    }

    // 1. Fetch explicit override configs saved by the admin within this range
    const adminConfigs = await CalendarConfig.find({
      date: { $gte: startDate, $lte: endDate }
    });

    // 2. Aggregate organic live merchant bookings running during this window
    const liveOffersAggregation = await Offer.aggregate([
      {
        $match: {
          display_type: "calendar",
          is_deleted: false,
          is_active: true,
          start_date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: "$start_date",
          count: { $sum: 1 }
        }
      }
    ]);

    // Map live aggregations into a lookup dictionary: { 'YYYY-MM-DD': count }
    const liveBookingsMap = {};
    liveOffersAggregation.forEach(item => {
      if (item._id) {
        const dateString = new Date(item._id).toISOString().split("T")[0];
        liveBookingsMap[dateString] = item.count;
      }
    });

    // Map administrative configurations into a dictionary: { 'YYYY-MM-DD': configObject }
    const configMap = {};
    adminConfigs.forEach(config => {
      const dateString = new Date(config.date).toISOString().split("T")[0];
      configMap[dateString] = config;
    });

    // 3. Build the complete grid layout output
    const comprehensiveSchedule = [];
    let currentStepDate = new Date(startDate);

    while (currentStepDate <= endDate) {
      const dateKey = currentStepDate.toISOString().split("T")[0];
      const savedConfig = configMap[dateKey];
      const liveBookingVolume = liveBookingsMap[dateKey] || 0;

      comprehensiveSchedule.push({
        date: currentStepDate.toISOString(),
        max_allowed_offers: savedConfig ? savedConfig.max_allowed_offers : 5, // safe integer fallback
        current_booked_count: Math.max(liveBookingVolume, savedConfig ? savedConfig.current_booked_count : 0),
        notes: savedConfig ? savedConfig.notes : "",
        is_locked: savedConfig ? savedConfig.is_locked : false
      });

      // Advance by 1 day cleanly via UTC date boundaries
      currentStepDate.setUTCDate(currentStepDate.getUTCDate() + 1);
    }

    return res.status(200).json({ success: true, data: comprehensiveSchedule });
  } catch (error) {
    console.error("Parametric Range Range Audit Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};