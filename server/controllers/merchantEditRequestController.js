import MerchantEditRequest from "../models/MerchantEditRequestModel.js";
import Merchant from "../models/merchantModel.js";
import MerchantShop from "../models/merchantShopModel.js";

/**
 * 1. Submit a New Edit Request
 * POST /api/merchant/edit-requests
 */
export const createMerchantEditRequest = async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    

  

    // Check if the merchant already has a pending request
    const existingPending = await MerchantEditRequest.findOne({
      merchantId,
      status: "pending",
    });

    if (existingPending) {
      return res.status(400).json({
        success: false,
        message: "You already have a pending edit request awaiting admin review.",
      });
    }

    const editRequest = new MerchantEditRequest({
      merchantId,
      targetModel: "Merchant",
      targetId: null,
      status: "pending",
    });

    await editRequest.save();

    return res.status(201).json({
      success: true,
      message: "Edit request submitted successfully. Awaiting administrator review.",
      data: editRequest,
    });
  } catch (error) {
    console.error("Create Merchant Edit Request Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit edit request.",
      error: error.message,
    });
  }
};

/**
 * 2. View All Submitted Edit Requests & Statuses
 * GET /api/merchant/edit-requests
 */
export const getMerchantEditRequests = async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    
    const requests = await MerchantEditRequest.find({ merchantId })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    console.error("Get Merchant Edit Requests Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch edit requests.",
      error: error.message,
    });
  }
};

/**
 * 3. Apply Approved Edit (Consumes the 'allowed' request)
 * POST /api/merchant/edit-requests/:requestId/apply
 */
export const applyMerchantEdit = async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    const { requestId } = req.params;

    // Find an 'allowed' request for this merchant
    const editRequest = await MerchantEditRequest.findOne({
      _id: requestId,
      merchantId,
      status: "allowed",
    });

    if (!editRequest) {
      return res.status(403).json({
        success: false,
        message: "No approved edit request found with this ID, or it has already been consumed.",
      });
    }

    // Apply changes based on targetModel
    if (editRequest.targetModel === "Merchant") {
      await Merchant.findByIdAndUpdate(merchantId, {
        $set: editRequest.proposedChanges,
      });
    } else if (editRequest.targetModel === "MerchantShop" && editRequest.targetId) {
      await MerchantShop.findOneAndUpdate(
        { _id: editRequest.targetId, merchantId },
        { $set: editRequest.proposedChanges }
      );
    }

    // Mark request as consumed so it cannot be reused
    editRequest.status = "consumed";
    await editRequest.save();

    return res.status(200).json({
      success: true,
      message: "Changes applied successfully. Further edits will require a new request submission.",
      data: editRequest,
    });
  } catch (error) {
    console.error("Apply Merchant Edit Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to apply edit changes.",
      error: error.message,
    });
  }
};