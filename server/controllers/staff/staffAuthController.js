import Staff from "../../models/staffModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const staffLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    // Find staff member by email
    const staff = await Staff.findOne({
      email: email.toLowerCase().trim(),
      isDeleted: false,
    });

    if (!staff) {
      return res.status(401).json({
        success: false,
        message: "Invalid login credentials.",
      });
    }

    // Check if staff account is blocked
    if (staff.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your staff account has been restricted by management.",
      });
    }

    // Verify password
    const isPasswordMatch = await bcrypt.compare(password, staff.password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid login credentials.",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: staff._id, role: staff.role },
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: "7d" }
    );

    const staffObject = staff.toObject();
    delete staffObject.password;

    return res.status(200).json({
      success: true,
      message: "Staff login successful.",
      token,
      staff: staffObject,
    });
  } catch (error) {
    console.error("Staff Login Error:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred during login.",
      error: error.message,
    });
  }
};