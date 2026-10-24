import MerchantEditRequest from "../models/MerchantEditRequestModel.js";
import Merchant from "../models/merchantModel.js";
import MerchantShop from "../models/merchantShopModel.js";
import MerchantBusinessDoc from "../models/merchantBusinessDocModel.js";
import MerchantPersonalDoc from "../models/merchantPersonalDocModel.js";

/**
 * 1. List All Merchant Edit Requests (with filters & pagination)
 * GET /api/admin/merchant-edit-requests
 */
export const listMerchantEditRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = {};

    if (status) {
      query.status = status; // "pending", "allowed", "rejected", "consumed"
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    const [requests, total] = await Promise.all([
      MerchantEditRequest.find(query)
        .populate("merchantId", "name phone email city status")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      MerchantEditRequest.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: requests,
      total,
      pages: Math.ceil(total / limit) || 1,
      currentPage: Number(page),
    });
  } catch (error) {
    console.error("List Merchant Edit Requests Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch merchant edit requests.",
      error: error.message,
    });
  }
};

/**
 * 2. Review (Allow or Decline) a Merchant Edit Request
 * PATCH /api/admin/merchant-edit-requests/:requestId/review
 */
export const reviewMerchantEditRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action, adminNotes } = req.body; // action: "allowed" or "rejected"

    if (!["allowed", "rejected"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid action. Allowed values: 'allowed' or 'rejected'.",
      });
    }

    const editRequest = await MerchantEditRequest.findById(requestId);
    if (!editRequest) {
      return res.status(404).json({
        success: false,
        message: "Edit request not found.",
      });
    }

    if (editRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `This edit request has already been ${editRequest.status}.`,
      });
    }

    editRequest.status = action;
    editRequest.adminNotes = adminNotes ? adminNotes.trim() : null;
    editRequest.reviewedBy = req.admin?._id || req.user?._id; // Adjust based on your admin auth middleware
    editRequest.reviewedAt = new Date();

    await editRequest.save();

    return res.status(200).json({
      success: true,
      message: `Merchant edit request has been successfully ${action === "allowed" ? "allowed" : "declined"}.`,
      data: editRequest,
    });
  } catch (error) {
    console.error("Review Merchant Edit Request Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process edit request review.",
      error: error.message,
    });
  }
};

/**
 * 3. View Complete Merchant Details for Admin (Profile, Shops, Business & Personal Docs)
 * GET /api/admin/merchants/:id/complete-details
 */
export const getMerchantCompleteDetailsForAdmin = async (req, res) => {
  try {
    const { id: merchantId } = req.params;

    if (!merchantId) {
      return res.status(400).json({
        success: false,
        message: "Merchant ID parameter is required.",
      });
    }

    const merchant = await Merchant.findById(merchantId).select("-password").lean();
    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: "Merchant account not found.",
      });
    }

    // Fetch related records in parallel
    const [shops, businessDocs, personalDocs, editRequests] = await Promise.all([
      MerchantShop.find({ merchantId }).lean(),
      MerchantBusinessDoc.findOne({ merchantId }).lean(),
      MerchantPersonalDoc.findOne({ merchantId }).lean(),
      MerchantEditRequest.find({ merchantId }).sort({ createdAt: -1 }).lean(),
    ]);

    // Sanitize binary buffers for clean JSON delivery
    const sanitizedPersonalDocs = personalDocs ? {
      ...personalDocs,
      aadharImage: personalDocs.aadharImage?.data ? { contentType: personalDocs.aadharImage.contentType, uploaded: true } : null,
      panImage: personalDocs.panImage?.data ? { contentType: personalDocs.panImage.contentType, uploaded: true } : null,
      udhyamImage: personalDocs.udhyamImage?.data ? { contentType: personalDocs.udhyamImage.contentType, uploaded: true } : null,
    } : null;

    return res.status(200).json({
      success: true,
      data: {
        merchant,
        shops,
        businessDocs: businessDocs || null,
        personalDocs: sanitizedPersonalDocs,
        editRequests,
      },
    });
  } catch (error) {
    console.error("Get Merchant Complete Details For Admin Error:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while retrieving merchant profile details.",
      error: error.message,
    });
  }
};