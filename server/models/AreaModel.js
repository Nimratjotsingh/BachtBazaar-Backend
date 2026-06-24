import mongoose from "mongoose";

const areaSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Area zone location name is required"],
      trim: true,
    },
    city: {
      type: String,
      required: [true, "Target area city framework mapping is required"],
      lowercase: true,
      trim: true,
      index: true,
    },
    // The central coordinate marker of the hyper-local zone perimeter
    center_location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number], // [longitude, latitude] -> Note: Longitude ALWAYS comes first in GeoJSON
        required: true
      }
    },
    // Maximum operational discovery boundary radius in kilometers
    radius_km: {
      type: Number,
      required: [true, "Geofencing constraint radius limit is required"],
      default: 5,
    },
    is_active: {
      type: Boolean,
      default: true,
    }
  },
  { timestamps: true }
);

// High-performance spatial indexing for radius proximity searches ($near / $geoWithin)
areaSchema.index({ center_location: "2dsphere" });

const Area = mongoose.model("Area", areaSchema);
export default Area;