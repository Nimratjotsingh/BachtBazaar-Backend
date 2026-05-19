import CalendarConfig from "../models/calenderConfigModel.js";
import Offer from "../models/offerModel.js";

// Helper to clean up time data and set it strictly to UTC Midnight
const normalizeToMidnight = (dateString) => {
  if (!dateString) return null;
  const targetDate = new Date(dateString);
  targetDate.setUTCHours(0, 0, 0, 0);
  return targetDate;
};

// --- Create or Update a Daily Slot Limit (Admin Only) ---
export const setDailySlotLimit = async (req, res) => {
  try {
    const { date, max_allowed_offers, notes, is_locked } = req.body;

    if (!date) {
      return res.status(400).json({ success: false, message: "A targeted date is required." });
    }

    const targetDate = normalizeToMidnight(date);

    // Find if a rule configuration already exists for this day
    let dateRule = await CalendarConfig.findOne({ date: targetDate });

    if (dateRule) {
      // Update existing day configuration rule
      if (max_allowed_offers !== undefined) dateRule.max_allowed_offers = max_allowed_offers;
      if (notes !== undefined) dateRule.notes = notes;
      if (is_locked !== undefined) dateRule.is_locked = is_locked;
      
      await dateRule.save();
      return res.status(200).json({ success: true, message: "Daily slot rule modified.", data: dateRule });
    }

    // Otherwise, create a brand new rule configuration for this date
    // Calculate current bookings reactively if offers already exist for this date
    const preExistingBookings = await Offer.countDocuments({
      display_type: "calendar",
      start_date: targetDate,
      is_deleted: false,
      is_active: true
    });

    const newRule = new CalendarConfig({
      date: targetDate,
      max_allowed_offers: max_allowed_offers ?? 5,
      current_booked_count: preExistingBookings,
      notes: notes?.trim(),
      is_locked: is_locked ?? false
    });

    await newRule.save();
    res.status(201).json({ success: true, message: "Daily slot rule configured successfully.", data: newRule });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// --- Get Calendar Slot List / View Schedule (Admin View) ---
export const getCalendarScheduleAdmin = async (req, res) => {
  try {
    const { start, end } = req.query;
    let query = {};

    // Allow filtering down to a specific date range window (e.g., viewing a specific month)
    if (start && end) {
      query.date = {
        $gte: normalizeToMidnight(start),
        $lte: normalizeToMidnight(end)
      };
    }

    const schedule = await CalendarConfig.find(query).sort({ date: 1 });
    res.status(200).json({ success: true, data: schedule });
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