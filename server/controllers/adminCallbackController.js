import CallbackRequest from "../models/CallBackRequestModel.js";

// GET /api/admin/callbacks
export const listCallbacksAdmin = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status, // "pending" | "resolved"
      requesterType, // "USER" | "MERCHANT"
      search,
    } = req.query;

    const query = {};

    if (status && ["pending", "resolved"].includes(status)) {
      query.status = status;
    }

    if (requesterType && ["USER", "MERCHANT"].includes(requesterType.toUpperCase())) {
      query.requesterType = requesterType.toUpperCase();
    }

    if (search) {
      query = [
        { contactName: { $regex: search,$options: "i" } },
        { contactPhone: { $regex: search,$options: "i" } },
        { topic: { $regex: search,$options: "i" } },
      ];
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const total = await CallbackRequest.countDocuments(query);

    const callbacks = await CallbackRequest.find(query)
      .populate("requesterId", "name businessName email phone")
      .populate("resolvedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    return res.status(200).json({
      success: true,
      total,
      pages: Math.ceil(total / Number(limit)) || 1,
      currentPage: Number(page),
      data: callbacks,
    });
  } catch (error) {
    console.error("List Admin Callbacks Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/admin/callbacks/:id/status
export const updateCallbackStatusAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;
    const adminId = req.user._id;

    if (!["pending", "resolved"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Allowed values are 'pending' or 'resolved'.",
      });
    }

    const updateFields = {
      status,
      adminNotes: adminNotes ?? undefined,
    };

    if (status === "resolved") {
      updateFields.resolvedBy = adminId;
      updateFields.resolvedAt = new Date();
    } else {
      updateFields.resolvedBy = null;
      updateFields.resolvedAt = null;
    }

    const callback = await CallbackRequest.findByIdAndUpdate(
      id,
      { set: updateFields },
      { new: true, runValidators: true }
    );

    if (!callback) {
      return res.status(404).json({
        success: false,
        message: "Callback request not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Callback marked as ${status}.`,
      data: callback,
    });
  } catch (error) {
    console.error("Update Admin Callback Status Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};