import mongoose from "mongoose";

const calendarConfigSchema = new mongoose.Schema(
  {
    area_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Area",
      required: [true, "A parent target area association is required"],
      index: true,
    },
    date: {
      type: Date,
      required: [true, "The targeted calendar schedule lock date is required"],
      index: true,
    },
    max_allowed_offers: {
      type: Number,
      required: true,
      default: 5,
    },
    current_booked_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    is_locked: {
      type: Boolean,
      default: false,
    }
  },
  { timestamps: true }
);

// Compound Index Optimization: Restricts duplicate configuration rules to a single rule per area per day
calendarConfigSchema.index({ area_id: 1, date: 1 }, { unique: true });

const CalendarConfig = mongoose.model("CalendarConfig", calendarConfigSchema);
export default CalendarConfig;