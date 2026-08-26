import BestPriceRequest from "../models/BestPriceModel.js";
import Category from "../models/categoryModel.js"; // Optional validation target
import MerchantBid from '../models/MerchantBidModel.js';
import { notifyNearbyMerchantsForPriceRequest } from "../utils/bestPriceNotificationHelper.js";
import MerchantShop from '../models/merchantShopModel.js';
import Notification from "../models/Notification.js";

export const createBestPriceRequest = async (req, res) => {
  try {
    const { title, description, categoryId, budget, timeframe, formattedAddress } = req.body;

    // 1. Core Profile Context Check
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Access Denied: Unauthenticated user transaction routing profile.",
      });
    }

    // 2. Structural Parameter Verification Matrix
    if (!title || !categoryId || !budget || !timeframe) {
      return res.status(400).json({
        success: false,
        message: "Required parameters missing. Provide title, categoryId, budget, and timeframe.",
      });
    }

    const userLat = req.user.latitude;
    const userLng = req.user.longitude;
    const userCity = req.user.city;

    if (userLat === undefined || userLng === undefined || userLat === null || userLng === null) {
      return res.status(400).json({
        success: false,
        message:
          "Profile location parameters missing. Please set your account profile coordinates before requesting deals.",
      });
    }

    // 3. Save the Best Price Request Document
    const newRequest = new BestPriceRequest({
      userId: req.user._id,
      title: title.trim(),
      description: description ? description.trim() : "",
      categoryId,
      budget: Number(budget),
      timeframe,
      latitude: userLat,
      longitude: userLng,
      city: userCity || "unknown",
      formattedAddress: formattedAddress || "",
      status: "active",
    });

    await newRequest.save();

    // 4. Background Geospatial Search: Find matching category shops within 15 km
    (async () => {
      try {
        const targetRadiusKm = 15;
        const kmPerDegreeLat = 111.1;
        const kmPerDegreeLng = 111.1 * Math.cos(userLat * (Math.PI / 180));

        const latDelta = targetRadiusKm / kmPerDegreeLat;
        const lngDelta = targetRadiusKm / kmPerDegreeLng;

        // Bounding box query filtered by the exact categoryId
        const candidateShops = await MerchantShop.find({
          categoryId,
          latitude: { $gte: userLat - latDelta, $lte: userLat + latDelta },
          longitude: { $gte: userLng - lngDelta, $lte: userLng + lngDelta },
        })
          .select("merchantId latitude longitude")
          .lean();

        // Filter through precise Haversine distance (<= 15 km)
        const validMerchantIds = candidateShops
          .filter((shop) => {
            if (shop.latitude && shop.longitude && shop.merchantId) {
              const distance = getDistanceKm(userLat, userLng, shop.latitude, shop.longitude);
              return distance <= targetRadiusKm;
            }
            return false;
          })
          .map((shop) => shop.merchantId);

        // Deduplicate merchant IDs (in case a merchant has multiple branches)
        const uniqueMerchantIds = [...new Set(validMerchantIds.map((id) => id.toString()))];

        if (uniqueMerchantIds.length > 0) {
          const categoryDoc = await Category.findById(categoryId).select("label").lean();

          await notifyNearbyMerchantsForPriceRequest({
            merchantIds: uniqueMerchantIds,
            requestTitle: newRequest.title,
            budget: newRequest.budget,
            requestId: newRequest._id,
            categoryName: categoryDoc?.label || "",
          });
        }
      } catch (err) {
        console.error("Background Merchant Notification Error:", err.message);
      }
    })();

    return res.status(201).json({
      success: true,
      message: "Your best price offer search pipeline request was created successfully.",
      data: newRequest,
    });
  } catch (error) {
    console.error("Create Best Price Request Exception Pipeline:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while creating your price search pipeline.",
      error: error.message,
    });
  }
};

/**
 * GET /api/best-price-requests/my-requests
 * Fetches all RFQ pipeline structures requested specifically by the logged-in user (with pagination)
 */
export const getUserBestPriceRequests = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Access Denied: Missing user authentication profile signature keys."
      });
    }

    // Build query block targeting the specific user
    const query = { userId: req.user._id };

    // Allow user to filter their history lists by status (active, completed, cancelled)
    if (status) {
      query.status = status;
    }

    const currentLimit = Number(limit);
    const skip = (Math.max(1, Number(page)) - 1) * currentLimit;

    const total = await BestPriceRequest.countDocuments(query);

    const requestsList = await BestPriceRequest.find(query)
      .populate("categoryId", "label value image")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(currentLimit)
      .lean();

    return res.status(200).json({
      success: true,
      total,
      pages: Math.ceil(total / currentLimit) || 1,
      currentPage: Number(page),
      data: requestsList
    });

  } catch (error) {
    console.error("Get User Best Price Requests Processing Fault:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve your personal best price request logs.",
      error: error.message
    });
  }
};

/**
 * PUT /api/best-price-requests/cancel/:id
 * Allows a user to close or cancel their deal request pipeline manually
 */
export const cancelBestPriceRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Access Denied: Missing profile parameters mapping contexts."
      });
    }

    // Find request document and verify ownership
    const requestItem = await BestPriceRequest.findOne({ _id: id, userId: req.user._id });

    if (!requestItem) {
      return res.status(404).json({
        success: false,
        message: "The requested best price profile registry was not found or access is restricted."
      });
    }

    if (requestItem.status === "completed" || requestItem.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: `This lookup target pipeline cannot be altered because its current state is already marked as ${requestItem.status}.`
      });
    }

    requestItem.status = "cancelled";
    await requestItem.save();

    return res.status(200).json({
      success: true,
      message: "The price request pipeline has been successfully closed and marked cancelled.",
      data: requestItem
    });

  } catch (error) {
    console.error("Cancel Best Price Request Execution Failure:", error);
    return res.status(500).json({
      success: false,
      message: "An internal processing error occurred while altering status profiles.",
      error: error.message
    });
  }
};


export const updateBestPriceRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, categoryId, budget, timeframe, formattedAddress } = req.body;

    // 1. Core Profile Context Check
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Access Denied: Unauthenticated user transaction routing profile."
      });
    }

    // 2. Find request document and verify ownership
    const requestItem = await BestPriceRequest.findOne({ _id: id, userId: req.user._id });

    if (!requestItem) {
      return res.status(404).json({
        success: false,
        message: "The requested best price request was not found or access is restricted."
      });
    }

    // 3. State Validation Check: Do not allow editing completed or cancelled requests
    if (requestItem.status === "completed" || requestItem.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: `This price request cannot be updated because its status is '${requestItem.status}'.`
      });
    }

    // 4. Optionally update categoryId validation
    if (categoryId) {
      const categoryExists = await Category.findById(categoryId);
      if (!categoryExists) {
        return res.status(404).json({
          success: false,
          message: "The specified categoryId does not exist."
        });
      }
      requestItem.categoryId = categoryId;
    }

    // 5. Apply partial field updates
    if (title !== undefined) requestItem.title = title.trim();
    if (description !== undefined) requestItem.description = description;
    if (budget !== undefined) requestItem.budget = Number(budget);
    if (timeframe !== undefined) requestItem.timeframe = timeframe;
    if (formattedAddress !== undefined) requestItem.formattedAddress = formattedAddress;

    // Save updated request document
    await requestItem.save();

    // Populate category metadata for response payload consistency
    await requestItem.populate("categoryId", "label value image");

    return res.status(200).json({
      success: true,
      message: "Your best price request was updated successfully.",
      data: requestItem
    });

  } catch (error) {
    console.error("Update Best Price Request Exception Pipeline:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while updating your price search request.",
      error: error.message
    });
  }
};

export const deleteBestPriceRequest = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Core Profile Context Check
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Access Denied: Unauthenticated user transaction routing profile."
      });
    }

    // 2. Locate request document and verify user ownership
    const requestItem = await BestPriceRequest.findOne({ _id: id, userId: req.user._id });

    if (!requestItem) {
      return res.status(404).json({
        success: false,
        message: "The requested best price request was not found or access is restricted."
      });
    }

    // 3. Remove the parent request document from database indexes
    await BestPriceRequest.findByIdAndDelete(id);

    // 4. Cascade cleanup: Delete all merchant bids associated with this request
    await MerchantBid.deleteMany({ requestId: id });

    return res.status(200).json({
      success: true,
      message: "Your best price request and all associated merchant bids have been permanently deleted."
    });

  } catch (error) {
    console.error("Delete Best Price Request Exception Pipeline:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while deleting your price search request.",
      error: error.message
    });
  }
};

export const closeBestPriceRequest = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Core Profile Context Check
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Access Denied: Unauthenticated user transaction routing profile."
      });
    }

    // 2. Find request document and verify ownership
    const requestItem = await BestPriceRequest.findOne({ _id: id, userId: req.user._id });

    if (!requestItem) {
      return res.status(404).json({
        success: false,
        message: "The requested best price request was not found or access is restricted."
      });
    }

    // 3. State Validation Check: Cannot close if already completed, cancelled, or closed
    if (["completed", "cancelled", "closed"].includes(requestItem.status)) {
      return res.status(400).json({
        success: false,
        message: `This price request cannot be closed because its current status is already '${requestItem.status}'.`
      });
    }

    // 4. Update status to closed
    requestItem.status = "closed";
    await requestItem.save();

    // Optionally populate category metadata for response consistency
    await requestItem.populate("categoryId", "label value image");

    return res.status(200).json({
      success: true,
      message: "Your best price request has been successfully marked as closed.",
      data: requestItem
    });

  } catch (error) {
    console.error("Close Best Price Request Exception Pipeline:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while closing your price search request.",
      error: error.message
    });
  }
};