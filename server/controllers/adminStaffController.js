import Staff from "../models/staffModel.js";
import bcrypt from "bcryptjs";

// 1. Create Staff
export const createStaff = async (req, res) => {
  try {
    const { name, email, phone, password, role, permissions } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing: name, email, phone, and password are required.",
      });
    }

    const existingStaff = await Staff.findOne({ $or: [{ email }, { phone }] });
    if (existingStaff) {
      return res.status(400).json({
        success: false,
        message: "Staff member with this email or phone already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newStaff = new Staff({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      password: hashedPassword,
      role: role || "support",
      permissions: permissions || [],
    });

    await newStaff.save();

    const staffResponse = newStaff.toObject();
    delete staffResponse.password;

    return res.status(201).json({
      success: true,
      message: "Staff member created successfully.",
      data: staffResponse,
    });
  } catch (error) {
    console.error("Create Staff Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while creating staff.",
      error: error.message,
    });
  }
};

// 2. List All Staff
export const listStaff = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role } = req.query;
    const query = { isDeleted: false };

    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    const [staffList, total] = await Promise.all([
      Staff.find(query).select("-password").sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Staff.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: staffList,
      total,
      pages: Math.ceil(total / limit) || 1,
      currentPage: Number(page),
    });
  } catch (error) {
    console.error("List Staff Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch staff members.",
      error: error.message,
    });
  }
};

// 3. Get Single Staff By ID
export const getStaffById = async (req, res) => {
  try {
    const { id } = req.params;
    const staff = await Staff.findOne({ _id: id, isDeleted: false }).select("-password").lean();

    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff member not found." });
    }

    return res.status(200).json({ success: true, data: staff });
  } catch (error) {
    console.error("Get Staff By ID Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch staff details.", error: error.message });
  }
};

// 4. Update Staff
export const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, password, role, permissions, isBlocked } = req.body;

    const staff = await Staff.findOne({ _id: id, isDeleted: false });
    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff member not found." });
    }

    if (name) staff.name = name.trim();
    if (email) staff.email = email.toLowerCase().trim();
    if (phone) staff.phone = phone.trim();
    if (role) staff.role = role;
    if (permissions) staff.permissions = permissions;
    if (isBlocked !== undefined) staff.isBlocked = Boolean(isBlocked);

    if (password && password.trim() !== "") {
      staff.password = await bcrypt.hash(password, 10);
    }

    await staff.save();

    const updatedStaff = staff.toObject();
    delete updatedStaff.password;

    return res.status(200).json({
      success: true,
      message: "Staff member updated successfully.",
      data: updatedStaff,
    });
  } catch (error) {
    console.error("Update Staff Error:", error);
    return res.status(500).json({ success: false, message: "Failed to update staff member.", error: error.message });
  }
};

// 5. Delete Staff (Soft Delete)
export const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const staff = await Staff.findOne({ _id: id, isDeleted: false });

    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff member not found." });
    }

    staff.isDeleted = true;
    staff.isBlocked = true;
    await staff.save();

    return res.status(200).json({
      success: true,
      message: "Staff member deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Staff Error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete staff member.", error: error.message });
  }
};