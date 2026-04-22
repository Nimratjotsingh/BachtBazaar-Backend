import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import SuperAdmin from "../models/adminModel.js";

dotenv.config();

const seedSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(process.env.MONGO_URI)
    console.log("✅ DB Connected");

    // 🔒 STRICT CHECK → only one admin allowed
    const adminExists = await SuperAdmin.findOne({email:'superadmin@example.com'});

    if (adminExists) {
      console.log("⛔ Super Admin already exists. Only one allowed.");
      
    }else{

    // 🔐 Hash password
    const hashedPassword = await bcrypt.hash("Admin@123", 10);

    // 🧱 Create ONLY admin
    const admin = await SuperAdmin.create({
      phone: "+919876543210",
      email: "superadmin@example.com",
      password: hashedPassword,
      name: "Super Admin",
      isVerified: true
    });

    console.log("🔥 Super Admin created successfully!");
    console.log("📱 Phone:", admin.phone);
  }

  } catch (error) {
    console.error("❌ Seeding failed:", error.message);
    process.exit(1);
  }
};

export default seedSuperAdmin;