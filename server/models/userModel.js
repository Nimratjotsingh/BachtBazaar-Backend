import mongoose from "mongoose";
import { ROLES } from "../constants/roles.js";

const userSchema = new mongoose.Schema({
  phone: {
    type: String,
    unique: true,
    sparse: true // Kept sparse to prevent duplicate null issues during Google Auth logins
  },
  password: {
    type: String
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: [ROLES.USER, ROLES.SUPER_ADMIN],
    default: ROLES.USER
  },
  name: {
    type: String
  },
  gender: {
    type: String,
    enum: ["male", "female", "other"]
  },
  
  // --- INTEGRATED LOCALIZATION & GEOSPATIAL FIELDS ---
  city: {
    type: String,
    trim: true,
    lowercase: true // Helps keep querying consistent across different inputs
  },
  latitude: {
    type: Number,
    default: null
  },
  longitude: {
    type: Number,
    default: null
  },
  
  address: {
    type: String
  },
  email: {
    unique: true,
    type: String,
    lowercase: true,
    trim: true
  },
  profileImage: {
    data: Buffer,
    contentType: String
  },
  status: {
    type: String,
    enum: ["active", "banned"],
    default: "active"
  },
  bannedReason: {
    type: String,
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

// --- PERFORMANCE INDEX CONFIGURATION ---
// Speeds up matching logic when querying users based on geographic coordinates
userSchema.index({ latitude: 1, longitude: 1 });
userSchema.index({ city: 1 });

export default mongoose.model("User", userSchema);