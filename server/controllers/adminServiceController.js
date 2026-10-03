import Service from "../models/serviceModel.js";
import ServiceReference from "../models/serviceSuggestionModel.js";

// 1. List All Merchant Services (All Statuses, Full Filters)
export const getAllServicesAdmin = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      approval_status,
      merchant_id,
      category_id,
      is_active,
    } = req.query;

    const query = { is_deleted: false };

    if (search) {
      query.$or = [
        { name: { $regex: search,$options: "i" } },
        { "service_provider.name": { $regex: search,$options: "i" } },
      ];
    }

    if (approval_status) query.approval_status = approval_status; // "pending", "approved", "rejected"
    if (merchant_id) query.merchant_id = merchant_id;
    if (category_id) query.category_id = category_id;
    if (is_active !== undefined) query.is_active = is_active === "true";

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const total = await Service.countDocuments(query);

    const services = await Service.find(query)
      .populate("merchant_id", "name businessName email phone")
      .populate("category_id", "label")
      .populate("subcategory_id", "label")
      .populate("service_id", "name status")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    return res.status(200).json({
      success: true,
      services,
      total,
      pages: Math.ceil(total / limit) || 1,
      currentPage: Number(page),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve services.",
      error: error.message,
    });
  }
};

// 2. Get Single Service by ID (Admin View)
export const getServiceDetailsAdmin = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate("merchant_id", "name businessName email phone profileImage")
      .populate("category_id", "label")
      .populate("subcategory_id", "label")
      .populate("service_id");

    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found." });
    }

    return res.status(200).json({ success: true, service });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error retrieving service details.",
      error: error.message,
    });
  }
};

// 3. Approve or Reject a Service
export const verifyServiceListing = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, rejection_reason, addToMasterCatalog = true } = req.body;

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid action. Allowed values: 'approve' or 'reject'.",
      });
    }

    if (action === "reject" && !rejection_reason) {
      return res.status(400).json({
        success: false,
        message: "A rejection reason is required when rejecting a service.",
      });
    }

    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found." });
    }

    if (action === "approve") {
      service.approval_status = "approved";
      service.is_active = true;
      service.rejection_reason = null;

      // Update or promote the associated reference in master suggestions
      if (service.service_id) {
        await ServiceReference.findByIdAndUpdate(service.service_id, {
          status: "approved",
          is_active: addToMasterCatalog,
        });
      }
    } else {
      service.approval_status = "rejected";
      service.is_active = false;
      service.rejection_reason = rejection_reason.trim();

      if (service.service_id) {
        await ServiceReference.findByIdAndUpdate(service.service_id, {
          status: "rejected",
          rejection_reason: rejection_reason.trim(),
        });
      }
    }

    await service.save();

    return res.status(200).json({
      success: true,
      message: `Service has been ${action}d successfully.`,
      service,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update service status.",
      error: error.message,
    });
  }
};

// 4. Force Update a Service as Admin
export const updateServiceAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    let updates = { ...req.body };

    if (req.files && req.files.thumbnail) {
      updates.thumbnail = `/uploads/${req.files.thumbnail[0].filename}`;
    }

    if (req.files && req.files.images) {
      updates.images = req.files.images.map((file) => `/uploads/${file.filename}`);
    }

    if (updates.price) updates.price = Number(updates.price);
    if (updates.discounted_price) updates.discounted_price = Number(updates.discounted_price);

    const service = await Service.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Service updated by administrator.",
      service,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Failed to update service.",
      error: error.message,
    });
  }
};

// 5. Delete Service as Admin (Soft Delete)
export const deleteServiceAdmin = async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { is_deleted: true, is_active: false },
      { new: true }
    );

    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Service listing moved to trash by administrator.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete service.",
      error: error.message,
    });
  }
};