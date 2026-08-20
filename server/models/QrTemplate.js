import mongoose from "mongoose";

const qrTemplateSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Template title is required"],
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    // The background frame image URL (uploaded to S3/Cloudinary/Local)
    templateImageUrl: {
      type: String,
      required: [true, "Template background image is required"],
    },
    // Optional preview thumbnail
    previewThumbnailUrl: {
      type: String,
      default: null,
    },
    category: {
      type: String,
      enum: ["STAND_BANNER", "TABLE_TOP", "STICKER", "FESTIVE", "GENERAL"],
      default: "GENERAL",
      index: true,
    },
    // Dimensions or layout ratio metadata for mobile/web canvas positioning
    qrPlacementConfig: {
      qrBoxPositionX: { type: Number, default: 50 }, // Percentage or pixel coordinates
      qrBoxPositionY: { type: Number, default: 50 },
      qrBoxWidth: { type: Number, default: 200 },
      qrBoxHeight: { type: Number, default: 200 },
      showShopName: { type: Boolean, default: true },
      showLogo: { type: Boolean, default: true },
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

qrTemplateSchema.index({ isActive: 1, category: 1, createdAt: -1 });

const QrTemplate =
  mongoose.models.QrTemplate || mongoose.model("QrTemplate", qrTemplateSchema);

export default QrTemplate;