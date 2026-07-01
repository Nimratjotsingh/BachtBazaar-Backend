import jwt from "jsonwebtoken";
import SuperAdmin from "../models/adminModel.js";

export const protectSuperAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    

    if (!token) {
      return res.status(401).json({ message: "No token" });
    }

    const decoded = await jwt.verify(token, process.env.JWT_SECRET);


    const admin = await SuperAdmin.findById(decoded.id);

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    req.admin = admin;
    next();

  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
  }
};