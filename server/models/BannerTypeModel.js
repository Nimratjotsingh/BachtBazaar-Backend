import mongoose from "mongoose";

const bannerTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Banner name is required"],
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    img: {
      type: String,
      default: ""
    },
    description: {
      type: String,
      trim: true,
      default: ""
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  { timestamps: true }
);

// Automatically generate an API-safe slug from the name before validating


const BannerType =mongoose.model("BannerType", bannerTypeSchema);
export default BannerType;