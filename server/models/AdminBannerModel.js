import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Banner promotional title is required"],
      trim: true,
    },
    subtitle: {
      type: String,
      trim: true,
      default: null,
    },
    // The storage path string or cloud URL for the image file
    image: {
      type: String,
      required: [true, "Banner target layout graphics image is required"],
    },
    // Where the user lands when they click the banner (e.g., "offer", "shop", "external_link")
    click_action_type: {
      type: String,
      enum: ["offer", "shop", "external_url", "none"],
      default: "none",
    },
    // Corresponding ID reference or raw web link string based on click_action_type chosen above
    target_destination: {
      type: String,
      default: null,
    },
    // Allows admins to order banners in carousels explicitly (e.g., 1, 2, 3)
    sort_order: {
      type: Number,
      default: 0,
    },
    start_date: {
      type: Date,
      required: [true, "Campaign initialization start date is required"],
      index: true,
    },
    end_date: {
      type: Date,
      required: [true, "Campaign expiration end date is required"],
      index: true,
    },
    // Quick visibility toggle flag 
    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },
    // Target city filtering to run localized banner matrices
    target_city: {
      type: String,
      default: "all", // Can hold specific string targets like "Bathinda" or default to global fallback "all"
      lowercase: true,
      trim: true,
      index: true,
    }
  },
  {
    timestamps: true,
  }
);

// --- Optimization Compound Index ---
// Speeds up matching live banners running inside active runtime windows for specific cities
bannerSchema.index({ is_active: 1, target_city: 1, start_date: 1, end_date: 1 });

const Banner = mongoose.model("Banner", bannerSchema);
export default Banner;