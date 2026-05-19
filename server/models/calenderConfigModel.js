import mongoose from "mongoose";

const calendarConfigSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: [true, "The targeted restriction date is required"],
      unique: true, // Prevents duplicate configuration rules for the same day
      index: true,
    },
    max_allowed_offers: {
      type: Number,
      required: [true, "Maximum slot allocation count is required"],
      min: [0, "Allowed offer slots cannot be negative"],
      default: 5, // A sensible system fallback
    },
    current_booked_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    notes: {
      type: String,
      trim: true, // e.g., "Christmas peak traffic restriction"
    },
    is_locked: {
      type: Boolean,
      default: false, // If true, admins can block creations entirely for a specific day
    }
  },
  { timestamps: true }
);

// Pre-save sanity check to strip time details from the incoming date object.
// This ensures everything matches at exactly midnight (00:00:00.000Z).
// calendarConfigSchema.pre("save", function (next) {
//   if (this.date) {
//     const pureDate = new Date(this.date);
//     pureDate.setUTCHours(0, 0, 0, 0);
//     this.date = pureDate;
//   }
//   next();
// });

const CalendarConfig = mongoose.model("CalendarConfig", calendarConfigSchema);
export default CalendarConfig;