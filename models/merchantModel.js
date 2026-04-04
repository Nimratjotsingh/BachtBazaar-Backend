import mongoose from "mongoose";



const personalDocsSchema = new mongoose.Schema({
  aadharNumber: String,
  aadharImage: String,

  panNumber: String,
  panImage: String
}, { _id: false });



const businessDocsSchema = new mongoose.Schema({
  gstNumber: String,
  gstImage: String,

  tradeLicenseNumber: String,
  tradeLicenseImage: String,

  shopRegistrationNumber: String,
  shopRegistrationImage: String,

  fssaiNumber: String,
  fssaiImage: String
}, { _id: false });



const shopSchema = new mongoose.Schema({
  shopName: {
    type: String,
    trim: true
  },

  category: {
    type: String,
    enum: ["restaurant", "clothing", "salon", "grocery", "electronics", "pharmacy"]
  },

  subCategory: {
    type: String,
    enum: ["fast-food", "fine-dining", "cafe", "bakery", "takeaway"]
  },

  address: String,

  city: String,

  logo: String,
  banner: String,
  phone: String,

  description: String,

 openingHours: {
  type: Map,
  of: {
    open: String,   // "09:00"
    close: String,  // "22:00"
    isClosed: {
      type: Boolean,
      default: false
    }
  }
},

  businessDocs:{
    type:businessDocsSchema,
    default:{}
  } 

}, { _id: false });



const merchantSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    unique: true
  },

  password: {
    type: String
  },

  isVerified: {
    type: Boolean,
    default: false
  },

  name: String,

  gender: {
    type: String,
    enum: ["male", "female", "other"]
  },

  city: String,

  profileImage: {
    type: String,
    default: ""
  },

  email: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true
  },

 
  personalDocs:{
    type:personalDocsSchema,
    default:{}
  } ,


  shop:{
    type:shopSchema,
    default:{}
  } 
}, { timestamps: true });


export default mongoose.model("Merchant", merchantSchema);