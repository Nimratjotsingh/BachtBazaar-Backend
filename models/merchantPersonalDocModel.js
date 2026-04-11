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
  panImage: imageSchema
}, { timestamps: true });

export default mongoose.model("MerchantPersonalDoc", merchantPersonalDocSchema);
