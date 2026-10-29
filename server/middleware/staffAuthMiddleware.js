import jwt from "jsonwebtoken";
import Staff from "../models/staffModel.js";

export const protectStaff = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, token missing.",
      });
    }

    // Verify token (Ensure you use your secret or env variable)
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret");

    // Fetch staff member
    const staff = await Staff.findOne({ _id: decoded.id, isDeleted: false }).select("-password");

    if (!staff) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, staff member not found.",
      });
    }

    if (staff.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Your staff account has been restricted.",
      });
    }

    // Attach staff object to request
    req.staff = staff;
    next();
  } catch (error) {
    console.error("Staff Auth Middleware Error:", error.message);
    return res.status(401).json({
      success: false,
      message: "Not authorized, token failed.",
    });
  }
};