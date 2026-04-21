import mongoose from "mongoose";

const superAdminSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    unique: true
  },

  email: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true
  },

  password: {
    type: String,
    required: true
  },

  name: {
    type: String,
    default: "Super Admin"
  },

  isVerified: {
    type: Boolean,
    default: true
  },
  singleton: {
    type: String,
    default: "ONLY_ONE",
    unique: true   // 💥 THIS ENFORCES SINGLE ADMIN
  }
}, { timestamps: true });

export default mongoose.model("SuperAdmin", superAdminSchema);