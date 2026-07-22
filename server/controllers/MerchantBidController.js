import BestPriceRequest from "../models/BestPriceModel.js";
import MerchantShop from "../models/merchantShopModel.js";

/**
 * GET /api/merchant/nearby-customer-requests
 * Scans for active user price requests within a 20km radius of the merchant's storefront location
 * that explicitly match the business category of that shop.
 */
export const getNearbyCustomerRequestsForMerchant = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    // 1. Context Check: Guard against unauthenticated merchant executions
    // Assumes your merchant authentication middleware populates req.merchant
    if (!req.merchant) {
      return res.status(401).json({
        success: false,
        message: "Access Denied: Missing authenticated merchant profile context."
      });
    }

    // 2. Fetch the Merchant's unique shop profile to look up location & category parameters
    const merchantShop = await MerchantShop.findOne({ merchantId: req.merchant._id });

    if (!merchantShop) {
      return res.status(404).json({
        success: false,
        message: "Store profile configuration not found. Please set up your shop details first."
      });
    }

    const centerLat = merchantShop.latitude;
    const centerLng = merchantShop.longitude;
    const shopCategory = merchantShop.categoryId;

    if (!centerLat || !centerLng) {
      return res.status(400).json({
        success: false,
        message: "Store coordinates missing. Please pinpoint your store location map parameters to parse local requests."
      });
    }

    if (!shopCategory) {
      return res.status(400).json({
        success: false,
        message: "Store category assignment missing. Your shop must be bound to a business vertical category to see relevant bids."
      });
    }

    const rightNow = new Date();
    const targetRadiusKm = 20; // 20km Business Sector Matrix Target Radius

    // --- GEOSPATIAL BOUNDING BOX CALCULATION MATRIX (20KM THRESHOLD) ---
    const kmPerDegreeLat = 111.1;
    const kmPerDegreeLng = 111.1 * Math.cos(centerLat * (Math.PI / 180));

    const latDelta = targetRadiusKm / kmPerDegreeLat;
    const lngDelta = targetRadiusKm / kmPerDegreeLng;

    // 3. Build Core Query targeting active, unexpired requests matching the shop's category
    const requestQuery = {
      categoryId: shopCategory,
      status: "active",
      expiresAt: { $gt: rightNow },
      // Apply the rough bounding box numeric box parameters
      latitude: { $gte: centerLat - latDelta, $lte: centerLat + latDelta },
      longitude: { $gte: centerLng - lngDelta, $lte: centerLng + lngDelta }
    };

    // Pagination variables setup
    const currentLimit = Number(limit);
    const skip = (Math.max(1, Number(page)) - 1) * currentLimit;

    // Fetch candidate customer requests within that region frame
    const rawRequests = await BestPriceRequest.find(requestQuery)
      .populate("userId", "name profileImage")
      .populate("categoryId", "label")
      .lean();

    if (rawRequests.length === 0) {
      return res.status(200).json({
        success: true,
        shopDetails: { shopName: merchantShop.shopName, city: merchantShop.city },
        totalRequests: 0,
        data: []
      });
    }

    // 4. Exact In-Memory Haversine Verification Filter (Cleans out bounding-box corners)
    const validRequestsInRadius = [];

    rawRequests.forEach((request) => {
      if (request.latitude && request.longitude) {
        const R = 6371; // Earth's mean radius constants in kilometers
        const dLat = (request.latitude - centerLat) * (Math.PI / 180);
        const dLng = (request.longitude - centerLng) * (Math.PI / 180);
        
        const a = 
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(centerLat * (Math.PI / 180)) * Math.cos(request.latitude * (Math.PI / 180)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
          
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceKm = R * c;

        if (distanceKm <= targetRadiusKm) {
          request.distanceFromShopKm = Number(distanceKm.toFixed(2));
          validRequestsInRadius.push(request);
        }
      }
    });

    // 5. Sort closest customer request straight to the top
    validRequestsInRadius.sort((a, b) => a.distanceFromShopKm - b.distanceFromShopKm);

    // 6. Manual slice segment to apply clean pagination matching the filtered lists
    const totalWithinRadius = validRequestsInRadius.length;
    const paginatedRequests = validRequestsInRadius.slice(skip, skip + currentLimit);

    return res.status(200).json({
      success: true,
      shopDetails: {
        shopName: merchantShop.shopName,
        categoryApplied: merchantShop.categoryId?.label || "Store Category",
        city: merchantShop.city
      },
      totalRequests: totalWithinRadius,
      pages: Math.ceil(totalWithinRadius / currentLimit) || 1,
      currentPage: Number(page),
      searchRadius: `${targetRadiusKm}km`,
      data: paginatedRequests
    });

  } catch (error) {
    console.error("Merchant Proximity Request Extraction Exception:", error);
    return res.status(500).json({
      success: false,
      message: "An internal processing error occurred while scanning for localized customer requests.",
      error: error.message
    });
  }
};

import MerchantBid from "../models/MerchantBidModel.js";



// ==========================================
//   MERCHANT SIDE CONTROLLERS
// ==========================================

/**
 * POST /api/bids/submit
 * Allows an authenticated merchant to submit a price counter-offer/bid for a customer request
 */
export const submitMerchantBid = async (req, res) => {
  try {
    const { requestId, offerPrice, additionalOfferNotes, quickTemplateIds } = req.body;

    // 1. Context Authorization Check
    if (!req.merchant) {
      return res.status(401).json({
        success: false,
        message: "Access Denied: Merchant authentication context missing."
      });
    }

    if (!requestId || !offerPrice) {
      return res.status(400).json({
        success: false,
        message: "Missing parameters. Required fields: requestId, offerPrice."
      });
    }

    // 2. Fetch the Merchant's physical shop profile
    const shop = await MerchantShop.findOne({ merchantId: req.merchant._id });
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Store configuration parameters not found. You must configure your storefront before pitching offers."
      });
    }

    // 3. Verify target consumer request state rules
    const targetRequest = await BestPriceRequest.findById(requestId);
    if (!targetRequest) {
      return res.status(404).json({
        success: false,
        message: "The customer request you are trying to bid on does not exist."
      });
    }

    if (targetRequest.status !== "active" || targetRequest.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: "This price request pipeline is no longer active or has expired."
      });
    }

    // 4. Check for duplicate bids manually to send clean error messages
    const duplicateCheck = await MerchantBid.findOne({ requestId, shopId: shop._id });
    if (duplicateCheck) {
      return res.status(409).json({
        success: false,
        message: "Conflict: Your storefront has already submitted a counter-offer for this request."
      });
    }

    // 5. Instantiation layer
    const newBid = new MerchantBid({
      requestId,
      merchantId: req.merchant._id,
      shopId: shop._id,
      offerPrice: Number(offerPrice),
      additionalOfferNotes: additionalOfferNotes || "",
      quickTemplateIds: Array.isArray(quickTemplateIds) ? quickTemplateIds : [],
      status: "submitted"
    });

    await newBid.save();

    return res.status(201).json({
      success: true,
      message: "Your price counter-offer bid has been successfully pushed to the user's dashboard.",
      data: newBid
    });

  } catch (error) {
    console.error("Submit Merchant Bid Processing Error:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while processing your bid registry.",
      error: error.message
    });
  }
};

/**
 * GET /api/bids/merchant/history
 * Fetches all past and current bids made by the logged-in merchant storefront profile
 */
export const getMerchantBidsHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    if (!req.merchant) {
      return res.status(401).json({
        success: false,
        message: "Access Denied: Invalid merchant validation parameters."
      });
    }

    const query = { merchantId: req.merchant._id };
    if (status) {
      query.status = status;
    }

    const currentLimit = Number(limit);
    const skip = (Math.max(1, Number(page)) - 1) * currentLimit;

    const total = await MerchantBid.countDocuments(query);
    const bidsList = await MerchantBid.find(query)
      .populate({
        path: "requestId",
        select: "title budget timeframe status expiresAt description",
        populate: { path: "categoryId", select: "label" }
      })
      .populate("quickTemplateIds", "title messageContent")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(currentLimit)
      .lean();

    return res.status(200).json({
      success: true,
      total,
      pages: Math.ceil(total / currentLimit) || 1,
      currentPage: Number(page),
      data: bidsList
    });

  } catch (error) {
    console.error("Get Merchant Bids History Exception:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load storefront outbound bid logs.",
      error: error.message
    });
  }
};


// ==========================================
//   USER / CUSTOMER SIDE CONTROLLERS
// ==========================================

/**
 * GET /api/bids/request/:requestId
 * Fetches all incoming merchant bids for a specific user request
 */
export const getBidsForUserRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Access Denied: Unauthenticated user configuration context."
      });
    }

    // Secure request confirmation: Make sure the requesting user actually owns the parent request
    const requestVerification = await BestPriceRequest.findOne({ _id: requestId, userId: req.user._id });
    if (!requestVerification) {
      return res.status(403).json({
        success: false,
        message: "Access Forbidden: You do not possess access credentials for this request log."
      });
    }

    const incomingBids = await MerchantBid.find({ requestId })
      .populate({
        path: "shopId",
        select: "shopName address city phone logo banner latitude longitude"
      })
      .populate("quickTemplateIds", "title messageContent")
      .sort({ offerPrice: 1 }) // List the cheapest offer price configurations first
      .lean();

    return res.status(200).json({
      success: true,
      requestDetails: {
        title: requestVerification.title,
        userBudget: requestVerification.budget,
        status: requestVerification.status
      },
      totalBidsReceived: incomingBids.length,
      data: incomingBids
    });

  } catch (error) {
    console.error("Get Customer Request Bids Segment Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to extract active inbound bids for this request profile.",
      error: error.message
    });
  }
};

/**
 * PATCH /api/bids/:bidId/status
 * Handles manual deal acceptances or rejections directly from the consumer interface
 */
export const updateUserBidStatus = async (req, res) => {
  try {
    const { bidId } = req.params;
    const { status } = req.body; // Expects "accepted" or "rejected"

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Access Denied: Missing customer validation metadata."
      });
    }

    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid action state choice. You must define status as 'accepted' or 'rejected'."
      });
    }

    // Fetch bid parameters along with parent request validation objects
    const matchedBid = await MerchantBid.findById(bidId).populate("requestId");
    if (!matchedBid) {
      return res.status(404).json({
        success: false,
        message: "Target merchant bid document records not found."
      });
    }

    // Verify ownership of the parent request
    if (matchedBid.requestId.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access Forbidden: You do not own the parent request attached to this bid."
      });
    }

    if (matchedBid.requestId.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "This price request deal pipeline has already been completed with a partner storefront."
      });
    }

    if (status === "accepted") {
      // 1. Update this chosen bid status
      matchedBid.status = "accepted";
      await matchedBid.save();

      // 2. Mark the parent request as completed
      await BestPriceRequest.findByIdAndUpdate(matchedBid.requestId._id, { status: "completed" });

      // 3. Reject all other competitive pending bids running for this request
      await MerchantBid.updateMany(
        { requestId: matchedBid.requestId._id, _id: { $ne: matchedBid._id } },
        { $set: { status: "rejected" } }
      );
    } else {
      // Just reject this single bid
      matchedBid.status = "rejected";
      await matchedBid.save();
    }

    return res.status(200).json({
      success: true,
      message: `The merchant counter-offer bid was successfully marked ${status}.`,
      data: matchedBid
    });

  } catch (error) {
    console.error("Update User Bid Status Pipeline Exception:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while modifying structural deal profiles.",
      error: error.message
    });
  }
};



/**
 * PATCH /api/bids/merchant/close/:bidId
 * Allows an authenticated merchant to withdraw/close their active bid
 */
export const closeMerchantBid = async (req, res) => {
  try {
    const { bidId } = req.params;

    // 1. Context Authorization Check
    if (!req.merchant) {
      return res.status(401).json({
        success: false,
        message: "Access Denied: Merchant authentication context missing."
      });
    }

    // 2. Fetch merchant storefront
    const shop = await MerchantShop.findOne({ merchantId: req.merchant._id });
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Store profile configuration not found."
      });
    }

    // 3. Locate target bid and verify ownership
    const bid = await MerchantBid.findOne({ _id: bidId, shopId: shop._id });

    if (!bid) {
      return res.status(404).json({
        success: false,
        message: "Bid record not found or does not belong to your storefront."
      });
    }

    // 4. State validation check
    if (bid.status === "closed") {
      return res.status(400).json({
        success: false,
        message: "This bid has already been closed/withdrawn."
      });
    }

    if (bid.status === "accepted") {
      return res.status(400).json({
        success: false,
        message: "Cannot withdraw this bid because it has already been accepted by the customer."
      });
    }

    if (bid.status === "rejected") {
      return res.status(400).json({
        success: false,
        message: "Cannot withdraw a bid that was already rejected."
      });
    }

    // 5. Update state to 'withdrawn'
    bid.status = "closed";
    await bid.save();

    return res.status(200).json({
      success: true,
      message: "Your bid has been successfully closed and withdrawn.",
      data: bid
    });

  } catch (error) {
    console.error("Close Merchant Bid Processing Exception:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while withdrawing the bid.",
      error: error.message
    });
  }
};