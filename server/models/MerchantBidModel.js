import mongoose from "mongoose";

const merchantBidSchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BestPriceRequest",
      required: [true, "Parent customer request tracking target reference is required."],
      index: true
    },
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: [true, "Bidding merchant authentication identifier is required."],
      index: true
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MerchantShop",
    //   required: [true, "The physical storefront source origin parameter is required."],
      index: true
    },
    offerPrice: {
      type: Number,
      required: [true, "Bidding price offer amount value is required."],
      min: [1, "Offer valuation baseline cannot be less than 1."]
    },
    additionalOfferNotes: {
      type: String,
      trim: true,
      maxLength: [500, "Additional deal footnotes cannot exceed 500 characters."],
      default: ""
    },
    status: {
        type: String,
        enum: ["submitted", "accepted", "rejected", "withdrawn","closed"],
        default: "submitted",
        index: true
    },
    
    // ✓ CHANGED: Now structured as an array of ObjectIds to permit multiple template select flows
    quickTemplateIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "QuickOfferTemplate"
        }
      ],
      default: []
    },
    
    status: {
      type: String,
      enum: ["submitted", "accepted", "rejected", "withdrawn"],
      default: "submitted",
      index: true
    }
  },
  { timestamps: true }
);

// --- COMPOSITE UNIQUE IDENTIFIER CONSTRAINTS ---
merchantBidSchema.index({ requestId: 1, shopId: 1 }, { unique: true });

// --- LIFECYCLE HOOKS: Automatically increment counter caches ---
merchantBidSchema.post("save", async function (doc) {
  try {
    await mongoose.model("BestPriceRequest").findByIdAndUpdate(doc.requestId, {
      $inc: { bidCount: 1 }
    });
  } catch (err) {
    console.error("Failed to execute atomic calculation hooks on parent request record:", err);
  }
});

const MerchantBid = mongoose.models.MerchantBid || mongoose.model("MerchantBid", merchantBidSchema);
export default MerchantBid;