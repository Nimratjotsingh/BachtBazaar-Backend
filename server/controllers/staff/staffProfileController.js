import Staff from "../../models/staffModel.js";

// GET /api/staff/profile
export const getStaffProfile = async (req, res) => {
  try {
    // req.staff is populated by the protectStaff middleware
    const staff = await Staff.findById(req.staff._id).select("-password").lean();

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff profile not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        staff,
        dashboardAccess: {
          role: staff.role,
          permissions: staff.permissions || [],
        },
      },
    });
  } catch (error) {
    console.error("Get Staff Profile Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching staff profile.",
      error: error.message,
    });
  }
};