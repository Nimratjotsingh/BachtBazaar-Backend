import CallbackRequest from "../models/CallBackRequestModel.js";

// POST /api/callbacks/user
export const createUserCallback = async (req, res) => {
  try {
    const userId = req.user._id;
    const { contactName, contactPhone, contactEmail, topic, message, preferredCallTime } = req.body;

    const phone = contactPhone || req.user.phone;
    const name = contactName || req.user.name;

    if (!phone || !topic) {
      return res.status(400).json({
        success: false,
        message: "Contact phone and topic are mandatory.",
      });
    }

    const callback = await CallbackRequest.create({
      requesterType: "USER",
      requesterId: userId,
      requesterModel: "User",
      contactName: name || "User",
      contactPhone: String(phone).trim(),
      contactEmail: contactEmail || req.user.email || null,
      topic: String(topic).trim(),
      message: message ? String(message).trim() : "",
      preferredCallTime: preferredCallTime || null,
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Callback request lodged successfully.",
      data: callback,
    });
  } catch (error) {
    console.error("Create User Callback Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/callbacks/merchant
export const createMerchantCallback = async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    const { contactName, contactPhone, contactEmail, topic, message, preferredCallTime } = req.body;

    const phone = contactPhone || req.merchant.phone;
    const name = contactName || req.merchant.name || req.merchant.businessName;

    if (!phone || !topic) {
      return res.status(400).json({
        success: false,
        message: "Contact phone and topic are mandatory.",
      });
    }

    const callback = await CallbackRequest.create({
      requesterType: "MERCHANT",
      requesterId: merchantId,
      requesterModel: "Merchant",
      contactName: name || "Merchant",
      contactPhone: String(phone).trim(),
      contactEmail: contactEmail || req.merchant.email || null,
      topic: String(topic).trim(),
      message: message ? String(message).trim() : "",
      preferredCallTime: preferredCallTime || null,
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Callback request lodged successfully.",
      data: callback,
    });
  } catch (error) {
    console.error("Create Merchant Callback Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};