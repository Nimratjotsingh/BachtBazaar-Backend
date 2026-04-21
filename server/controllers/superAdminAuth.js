import SuperAdmin from "../models/adminModel.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/generateToken.js";

export const loginSuperAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await SuperAdmin.findOne({ email });

    
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = generateToken(admin._id, {
      type: "SUPER_ADMIN"
    });

    res.json({
      success: true,
      token,
      admin
    });

  } catch (error) {
    console.log(error)
    res.status(500).json({ message: "Login failed" });
  }
};