import mongoose from "mongoose";

const imageSchema = new mongoose.Schema({
  data: Buffer,
  contentType: String
}, { _id: false });

const merchantPersonalDocSchema = new mongoose.Schema({
  merchantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Merchant",
    required: true,
    unique: true
  },
  
  aadharNumber: String,
  aadharImage: imageSchema,
  panNumber: String,
  panImage: imageSchema,
  
  // --- Newly Added Udyam Fields ---
  udhyamNumber: {
    type: String,
    trim: true,
    uppercase: true,
  },
  udhyamImage: imageSchema,

}, { timestamps: true });

export default mongoose.models.MerchantPersonalDoc || mongoose.model("MerchantPersonalDoc", merchantPersonalDocSchema);