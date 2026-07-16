import mongoose from "mongoose";

const quickOfferTemplateSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Template title identifier is required (e.g., 'Free Delivery Hook')."],
      trim: true
    },
    messageContent: {
      type: String,
      required: [true, "The actual text content injected into the merchant text fields is required."],
      trim: true,
      maxLength: [300, "Canned template messages cannot exceed 300 characters."]
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  { timestamps: true }
);

const QuickOfferTemplate = mongoose.models.QuickOfferTemplate || mongoose.model("QuickOfferTemplate", quickOfferTemplateSchema);
export default QuickOfferTemplate;