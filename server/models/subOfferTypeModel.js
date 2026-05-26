import mongoose from "mongoose";

const subOfferTypeSchema = new mongoose.Schema(
  {
    offertype_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OfferType", // Strict relational link to your parent model collection
      required: true,
    },
    value: {
      type: String,
      trim: true,
      lowercase: true,
      required: true,
    },
    label: {
      type: String,
      trim: true,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    // Modified: Stores local server file relative storage path strings cleanly
    icon: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Optimized performance for querying sub-categories belonging to a parent category
subOfferTypeSchema.index({ offertype_id: 1, value: 1 }, { unique: true });

const SubOfferType = mongoose.model("SubOfferType", subOfferTypeSchema);
export default SubOfferType;