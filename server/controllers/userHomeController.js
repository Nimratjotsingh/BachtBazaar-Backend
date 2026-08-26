import MerchantShop from "../models/merchantShopModel.js";
import Product from "../models/productModel.js";
import Service from "../models/serviceModel.js";
import Offer from '../models/offerModel.js';
import Merchant from '../models/merchantModel.js';
import Category from '../models/categoryModel.js';
import mongoose from "mongoose";
import Area from "../models/AreaModel.js";
import Wishlist from "../models/wishlistModel.js";
import {trackDailyMetric,trackDailyMetric2, trackOfferMetric} from '../utils/analyticsTracker.js';
import { onOfferClickedHook } from "../hooks/mileStoneProgressHooks.js";





export const getAllShops = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      category,
      lat,
      lng,
      maxDistanceKm = 10 
    } = req.query;

    if (lat === undefined || lng === undefined || lat === "" || lng === "") {
      return res.status(400).json({
        success: false,
        message: "Explicit 'lat' and 'lng' parameters are required to locate nearby shops."
      });
    }

    const centerLat = Number(lat);
    const centerLng = Number(lng);

    if (isNaN(centerLat) || isNaN(centerLng)) {
      return res.status(400).json({
        success: false,
        message: "Provided 'lat' and 'lng' coordinates must be valid numeric values."
      });
    }

    // --- GEOSPATIAL BOUNDING BOX CALCULATION MATRIX ---
    const kmPerDegreeLat = 111.1;
    const kmPerDegreeLng = 111.1 * Math.cos(centerLat * (Math.PI / 180));

    const latDelta = Number(maxDistanceKm) / kmPerDegreeLat;
    const lngDelta = Number(maxDistanceKm) / kmPerDegreeLng;

    const query = {
      latitude: { $gte: centerLat - latDelta, $lte: centerLat + latDelta },
      longitude: { $gte: centerLng - lngDelta, $lte: centerLng + lngDelta }
    };

    if (search) {
      query.shopName = { $regex: search, $options: "i" };
    }

    if (category) {
      query.categoryId = category;
    }

    // Pagination Logic Setup
    const currentLimit = Number(limit);
    const skip = (Math.max(1, Number(page)) - 1) * currentLimit;

    const total = await MerchantShop.countDocuments(query);
    
    const shops = await MerchantShop.find(query)
      .populate("merchantId", "name email profileImage")
      .populate("categoryId", "label")
      .populate("subCategoryId", "label")
      .select("-logo.data -banner.data")
      .skip(skip)
      .limit(currentLimit)
      .lean();

    if (shops.length > 0) {
      shops.forEach(shop => {
        if (shop.latitude && shop.longitude) {
          const R = 6371; 
          const dLat = (shop.latitude - centerLat) * (Math.PI / 180);
          const dLng = (shop.longitude - centerLng) * (Math.PI / 180);
          const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(centerLat * (Math.PI / 180)) * Math.cos(shop.latitude * (Math.PI / 180)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          shop.distanceKm = Number((R * c).toFixed(2));
        } else {
          shop.distanceKm = null;
        }
      });

      shops.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));

      const merchantIds = shops
        .map(shop => shop.merchantId?._id || shop.merchantId)
        .filter(Boolean);

      const liveOffers = await Offer.find({
        merchant_id: { $in: merchantIds },
        is_active: true,
        is_deleted: false,
        start_date: { $lte: new Date() },
        $or: [
          { end_date: { $exists: false } },
          { end_date: null },
          { end_date: { $gte: new Date() } }
        ]
      })
      .select("title description thumbnail display_type discount_percentage discount_value merchant_id start_date end_date")
      .sort({ createdAt: -1 })
      .lean();

      // Index current running items safely matching your merchant parameters
      const offersByMerchantMap = {};
      liveOffers.forEach(offer => {
        // ✓ FIX: Safety check ensures broken/corrupted offer entries do not crash string assignment loops
        if (!offer.merchant_id) return; 

        const mId = offer.merchant_id.toString();
        if (!offersByMerchantMap[mId]) {
          offersByMerchantMap[mId] = [];
        }
        offersByMerchantMap[mId].push(offer);
      });

      // Bind records cleanly back to parent storefront collections objects
      shops.forEach(shop => {
        const actualMerchantId = shop.merchantId?._id || shop.merchantId;
        const lookupKey = actualMerchantId ? actualMerchantId.toString() : null;
        
        // ✓ FIX: Standardized fallback guarantees structural consistency for your frontend JSON maps
        shop.offers = lookupKey ? (offersByMerchantMap[lookupKey] || []) : [];
      });
    }

    return res.status(200).json({
      success: true,
      total,
      pages: Math.ceil(total / currentLimit) || 1,
      currentPage: Number(page),
      data: shops
    });

  } catch (error) {
    console.error("Bounding Box Fetch All Shops Error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to retrieve localized storefront records.",
      error: error.message
    });
  }
};
// --- Get Single Shop Details ---

export const getShopDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const rightNow = new Date();

    // 1. Fetch Shop Details
    const shopDoc = await MerchantShop.findById(id)
      .populate("merchantId", "name email phone profileImage status")
      .populate("categoryId", "label")
      .populate("subCategoryId", "label")
      .lean();

    if (!shopDoc) {
      return res.status(404).json({ success: false, message: "Shop not found." });
    }

    // Safety fallback check: If the merchant account has been restricted by an admin, block access
    if (shopDoc.merchantId?.status === "banned" || shopDoc.merchantId?.isBlocked === true) {
      return res.status(403).json({ success: false, message: "This merchant profile has been restricted." });
    }

    const merchantId = shopDoc.merchantId._id;

    // 2. Fetch Products, Services, Active Offers, and User Wishlist in parallel
    const [products, services, offers, userWishlist] = await Promise.all([
      Product.find({ 
        merchant_id: merchantId, 
        is_deleted: false, 
        is_active: true 
      })
      .select("name price discounted_price thumbnail stock is_featured")
      .sort({ createdAt: -1 })
      .lean(),

      Service.find({ 
        merchant_id: merchantId, 
        is_deleted: false, 
        is_active: true 
      })
      .select("name price discounted_price thumbnail pricing_type is_featured")
      .sort({ createdAt: -1 })
      .lean(),

      // Dynamic Active Offers Lookup
      Offer.find({
        merchant_id: merchantId,
        is_active: true,
        is_deleted: false,
        start_date: { $lte: rightNow },
        end_date: { $gte: rightNow }
      })
      .select("title description thumbnail display_type discount_percentage discount_value minimum_purchase_amount end_date code")
      .populate("offer_type_id", "label value")
      .sort({ createdAt: -1 })
      .lean(),

      // User Wishlist Lookup
      req.user ? Wishlist.findOne({ userId: req.user._id }).lean() : null
    ]);

    // 3. Create Wishlist Lookup Sets for O(1) performance
    const wishlistedShopsSet = new Set((userWishlist?.shops || []).map((sId) => sId.toString()));
    const wishlistedProductsSet = new Set((userWishlist?.products || []).map((pId) => pId.toString()));
    const wishlistedOffersSet = new Set((userWishlist?.offers || []).map((oId) => oId.toString()));

    // 4. Attach isWishlisted flags
    const shop = {
      ...shopDoc,
      isWishlisted: wishlistedShopsSet.has(shopDoc._id.toString())
    };

    const formattedProducts = products.map((product) => ({
      ...product,
      isWishlisted: wishlistedProductsSet.has(product._id.toString())
    }));

    const formattedServices = services.map((service) => ({
      ...service,
    }));

    const formattedOffers = offers.map((offer) => ({
      ...offer,
      isWishlisted: wishlistedOffersSet.has(offer._id.toString())
    }));

    // 5. Track metric
    //trackDailyMetric(shopDoc._id, merchantId, "totalViewers", req.user?._id);

    // 6. Construct the synchronized response payload
    return res.status(200).json({
      success: true,
      data: {
        shop,
        inventory: {
          productCount: formattedProducts.length,
          serviceCount: formattedServices.length,
          offerCount: formattedOffers.length,
          products: formattedProducts,
          services: formattedServices,
          offers: formattedOffers
        }
      }
    });

  } catch (error) {
    console.error("Shop Details Matrix Aggregation Error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Error retrieving shop inventory parameters package.",
      error: error.message
    });
  }
};

// ====================================================================
// --- Global Unified Search Controller (Shops, Products & Services) ---
// ====================================================================


// Haversine Distance Helper Function


const calculateHaversineDistance = (lat1, lon1, lat2, lng2) => {
  if (!lat1 || !lon1 || !lat2 || !lng2) return null;
  const R = 6371; // Earth's mean radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
};

export const searchGlobalCatalog = async (req, res) => {
  try {
    const {
      q = "",
      city,
      lat,
      lng,
      limit = 5,
      type = "all",          // 'all' | 'shop' | 'product' | 'service' | 'offer'
      offerType,             // 'banner' | 'calendar' | 'all' or explicit ObjectId
      offer_type_id,         // Explicit ObjectId for OfferType schema
    } = req.query;

    const searchKeyword = q.trim();
    if (!searchKeyword) {
      return res.status(400).json({
        success: false,
        message: "Search query parameter string cannot be empty.",
      });
    }

    const centerLat = lat ? Number(lat) : req.user?.latitude;
    const centerLng = lng ? Number(lng) : req.user?.longitude;
    const hasCoordinates =
      centerLat !== null && centerLng !== null && !isNaN(centerLat) && !isNaN(centerLng);

    const regexSearch = { $regex: searchKeyword, $options: "i" };
    const maxResults = Math.max(1, Number(limit));
    const rightNow = new Date();

    // --- 1. CONSTRUCT SEARCH PIPELINES ---

    // A. Shop Search Query
    const shopQuery = { shopName: regexSearch };
    if (city) {
      shopQuery.city = { $regex: city.trim(), $options: "i" };
    }

    // B. Product & Service Search Query
    const itemQuery = {
      is_deleted: false,
      is_active: true,
      $or: [{ name: regexSearch }, { description: regexSearch }],
    };

    // C. Offer Search Query (Aligned with Offer Schema)
    const offerQuery = {
      is_deleted: false,
      is_draft: false,
      is_active: true,
      start_date: { $lte: rightNow },
      $or: [
        { end_date: { $exists: false } },
        { end_date: null },
        { end_date: { $gte: rightNow } },
      ],
      $and: [
        {
          $or: [
            { title: regexSearch },
            { description: regexSearch },
            { tags: regexSearch },
          ],
        },
      ],
    };

    // Handle `offer_type_id` / `offerType` Filter Parameter
    const targetOfferTypeId = offer_type_id || offerType;

    if (targetOfferTypeId) {
      if (mongoose.Types.ObjectId.isValid(targetOfferTypeId)) {
        // Query by exact OfferType ObjectId reference
        offerQuery.offer_type_id = new mongoose.Types.ObjectId(targetOfferTypeId);
      } else if (["banner", "calendar", "all"].includes(targetOfferTypeId.toLowerCase())) {
        // Query by display_type string
        offerQuery.display_type = targetOfferTypeId.toLowerCase();
      }
    }

    // --- 2. EXECUTE ASYNCHRONOUS QUERIES IN PARALLEL ---
    const searchTasks = [];

    // 1. Shops Task
    if (type === "all" || type === "shop") {
      searchTasks.push(
        MerchantShop.find(shopQuery)
          .populate("merchantId", "name email profileImage status isBlocked")
          .populate("categoryId", "label")
          .select("-logo.data -banner.data")
          .limit(maxResults)
          .lean()
      );
    } else {
      searchTasks.push(Promise.resolve([]));
    }

    // 2. Products Task
    if (type === "all" || type === "product") {
      searchTasks.push(
        Product.find(itemQuery)
          .select("name price discounted_price thumbnail stock is_featured merchant_id description")
          .limit(maxResults)
          .lean()
      );
    } else {
      searchTasks.push(Promise.resolve([]));
    }

    // 3. Services Task
    if (type === "all" || type === "service") {
      searchTasks.push(
        Service.find(itemQuery)
          .populate("merchant_id", "name store_name")
          .select("name price discounted_price thumbnail pricing_type is_featured merchant_id description")
          .limit(maxResults)
          .lean()
      );
    } else {
      searchTasks.push(Promise.resolve([]));
    }

    // 4. Offers Task
    if (type === "all" || type === "offer") {
      searchTasks.push(
        Offer.find(offerQuery)
          .populate("merchant_id", "name store_name email profileImage")
          .populate("offer_type_id", "label value")
          .populate("sub_offer_type_id", "label value")
          .select(
            "title description thumbnail display_type discount_percentage discount_value merchant_id start_date end_date offer_type_id location minimum_purchase_amount"
          )
          .limit(maxResults)
          .lean()
      );
    } else {
      searchTasks.push(Promise.resolve([]));
    }

    // Execute queries
    const [shops, products, services, offers] = await Promise.all(searchTasks);

    // --- 3. STORE LOCATION LOOKUP FOR ITEMS & OFFERS ---
    const allMerchantIds = [
      ...new Set([
        ...products.map((p) => p.merchant_id?.toString()).filter(Boolean),
        ...services.map((s) => (s.merchant_id?._id || s.merchant_id)?.toString()).filter(Boolean),
        ...offers.map((o) => (o.merchant_id?._id || o.merchant_id)?.toString()).filter(Boolean),
      ]),
    ];

    let merchantShopsMap = {};
    if (allMerchantIds.length > 0) {
      const relatedShops = await MerchantShop.find({ merchantId: { $in: allMerchantIds } })
        .select("merchantId latitude longitude shopName city")
        .lean();

      relatedShops.forEach((s) => {
        if (s.merchantId) {
          merchantShopsMap[s.merchantId.toString()] = s;
        }
      });
    }

    // --- 4. FORMAT RESULTS & ATTACH DISTANCE (distanceKm) ---

    // Process Shops
    const formattedShops = shops.map((shop) => {
      const distanceKm = hasCoordinates
        ? calculateHaversineDistance(centerLat, centerLng, shop.latitude, shop.longitude)
        : null;
      return { ...shop, distanceKm };
    });

    // Process Products
    const formattedProducts = products.map((product) => {
      const mId = product.merchant_id?.toString();
      const shop = mId ? merchantShopsMap[mId] : null;
      const distanceKm =
        hasCoordinates && shop
          ? calculateHaversineDistance(centerLat, centerLng, shop.latitude, shop.longitude)
          : null;

      return {
        ...product,
        shopName: shop?.shopName || null,
        distanceKm,
      };
    });

    // Process Services
    const formattedServices = services.map((service) => {
      const mId = (service.merchant_id?._id || service.merchant_id)?.toString();
      const shop = mId ? merchantShopsMap[mId] : null;
      const distanceKm =
        hasCoordinates && shop
          ? calculateHaversineDistance(centerLat, centerLng, shop.latitude, shop.longitude)
          : null;

      return {
        ...service,
        shopName: shop?.shopName || null,
        distanceKm,
      };
    });

    // Process Offers (Using shop coordinates or fallback to Offer.location Point)
    const formattedOffers = offers.map((offer) => {
      const mId = (offer.merchant_id?._id || offer.merchant_id)?.toString();
      const shop = mId ? merchantShopsMap[mId] : null;

      let distanceKm = null;
      if (hasCoordinates) {
        if (shop?.latitude && shop?.longitude) {
          distanceKm = calculateHaversineDistance(centerLat, centerLng, shop.latitude, shop.longitude);
        } else if (
          offer.location?.coordinates &&
          Array.isArray(offer.location.coordinates) &&
          (offer.location.coordinates[0] !== 0 || offer.location.coordinates[1] !== 0)
        ) {
          // GeoJSON Point array: [lng, lat]
          const [offLng, offLat] = offer.location.coordinates;
          distanceKm = calculateHaversineDistance(centerLat, centerLng, offLat, offLng);
        }
      }

      return {
        ...offer,
        shopName: shop?.shopName || null,
        distanceKm,
      };
    });

    // Sort by proximity when coordinates are present
    if (hasCoordinates) {
      formattedShops.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
      formattedProducts.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
      formattedServices.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
      formattedOffers.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    }

    // --- 5. RESPONSE PAYLOAD ---
    return res.status(200).json({
      success: true,
      query: searchKeyword,
      filters: {
        city: city || "all",
        type,
        offer_type_id: targetOfferTypeId || "all",
        coordinates: hasCoordinates ? { lat: centerLat, lng: centerLng } : null,
      },
      results: {
        totalShopsFound: formattedShops.length,
        totalProductsFound: formattedProducts.length,
        totalServicesFound: formattedServices.length,
        totalOffersFound: formattedOffers.length,
        shops: formattedShops,
        products: formattedProducts,
        services: formattedServices,
        offers: formattedOffers,
      },
    });
  } catch (error) {
    console.error("Global Catalog Search Error:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while scanning catalog registries.",
      error: error.message,
    });
  }
};


// ====================================================================
// --- GET LIVE CAMPAIGNS FOR APP USER FEED (Organized by 3 Types) ---
// ====================================================================
export const getActiveUserOffers = async (req, res) => {
  try {
    const { city, categoryId } = req.query;
    const rightNow = new Date();

    // 1. Establish strict live availability baseline rules using exact schema keys
    const campaignQuery = {
      is_active: true,
      is_deleted: false,
      start_date: { $lte: rightNow },
      end_date: { $gte: rightNow }
    };

    // 2. Filter dynamically by Category if selected on the mobile frontend
    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      campaignQuery.category_id = new mongoose.Types.ObjectId(categoryId);
    }

    // 3. Location Filter Strategy (Filter campaigns based on Merchant Shop City limits)
    if (city) {
      // Find all merchant IDs operating in the target city boundary pool
      // Note: populate/query uses 'merchantId' from your merchantShopModel fields
      const activeShopsInCity = await MerchantShop.find({
        city: { $regex: `^${city.trim()}$`, $options: "i" }
      }).select("merchantId");

      const validMerchantIds = activeShopsInCity.map(shop => shop.merchantId);
      
      // Pin down query scope to match only local city merchants
      campaignQuery.merchant_id = { $in: validMerchantIds };
    }

    // 4. Fetch matching live offer profiles using lean queries for rapid runtime performance
    const activeOffersPool = await Offer.find()
      .populate({
        path: "merchant_id",
        select: "name store_name email profileImage _id city merchant_id",
        model: "Merchant" // Ensures it points exactly to your user model export
      })
      .populate("offer_type_id", "label value icon") // References parent template option
      .populate("sub_offer_type_id", "label value icon") // Standalone sub-tier template option
      .populate("product_id", "name price discounted_price thumbnail stock") // Hydrates array of products
      .sort({ createdAt: -1 })
      .lean();

     

    // 5. Separate the consolidated pool into the three target front-end structures
    const banners = [];
    const calendarSlots = [];
    const standardOffers = [];

    activeOffersPool.forEach((offer) => {
      // Safeguard: If the merchant account is banned or blocked by admin, drop campaign dynamically
      if (offer.merchant_id?.status === "banned" || offer.merchant_id?.isBlocked === true) {
        return; 
      }

      // Format dynamic expression badges cleanly based on rules configured inside document
      let expressionBadge = "Special Offer";
      if (offer.discount_percentage !== null) {
        expressionBadge = `${offer.discount_percentage}% OFF`;
      } else if (offer.discount_value !== null) {
        expressionBadge = `₹${offer.discount_value} OFF`;
      } else if (offer.free_quantity) {
        expressionBadge = `Get ${offer.free_quantity} Free`;
      }

      const normalizedPayload = {
        _id: offer._id,
        title: offer.title,
        description: offer.description || "",
        code: offer.code || offer._id.toString().substring(18).toUpperCase(),
        thumbnail: offer.thumbnail || "",
        discountExpression: expressionBadge,
        minPurchase: offer.minimum_purchase_amount || 0,
        endDate: offer.end_date,
        remainingDays: Math.ceil((new Date(offer.end_date) - rightNow) / (1000 * 60 * 60 * 24)),
        merchant: {
          _id: offer.merchant_id?._id,
          name: offer.merchant_id?.store_name || offer.merchant_id?.name || "BachatBazarr Partner",
          avatar: offer.merchant_id?.profileImage || null
        },
        mechanicType: offer.offer_type_id?.label || "General Deal",
        subMechanicType: offer.sub_offer_type_id?.label || null,
        linkedProductsCount: offer.product_id?.length || 0,
        products: offer.product_id || [], // Available nested inventory array
        restrictions: {
          walkInOnly: offer.only_for_walk_in_customers,
          qrRequired: offer.qr_redemption_required,
          nearbyOnly: offer.show_to_users_nearby_only
        }
      };

      // Sort into target layout locations based on exact schema 'display_type' parameters
      if (offer.display_type === "banner") {
        banners.push(normalizedPayload);
      } else if (offer.display_type === "calendar") {
        calendarSlots.push(normalizedPayload);
      } else {
        // Fallback or explicit 'all' value maps straight into scrollable general feed grid
        standardOffers.push(normalizedPayload);
      }
    });

    // 6. Return response package optimized for fast feed painting
    return res.status(200).json({
      success: true,
      data: {
        totalLiveCampaigns: banners.length + calendarSlots.length + standardOffers.length,
        counts: {
          bannerCount: banners.length,
          calendarCount: calendarSlots.length,
          standardCount: standardOffers.length
        },
        payload: {
          banners,        // Carousel Banner items
          calendarSlots,  // Limited Availability Calendar Deals
          standardOffers  // Scrollable General Feed Offers Grid
        }
      }
    });

  } catch (error) {
    console.error("User-facing offers extraction breaking exception:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to assemble active product campaign streams catalog."
    });
  }
};

export const getAllOffers= async(req,res)=>{
  const result = await Offer.find();
  console.log(result)
  return res.json(result.data)
}

export const getOfferDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate the incoming ObjectId to prevent database casting exceptions
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid offer identifier token format."
      });
    }

    // Query and trace relational tables in a single operation block
    const offer = await Offer.findById(id)
      .populate({
        path: "merchant_id",
        select: "name store_name email phone profileImage status isBlocked",
        model: "Merchant" // Points to your underlying user/merchant profile model
      })
      .populate("offer_type_id", "label value icon description")
      .populate("sub_offer_type_id", "label value icon description")
      .populate("product_id", "name price discounted_price thumbnail stock is_active description")
      .lean();

    // Guard: Return 404 if the offer does not exist or has been soft-deleted
    if (!offer || offer.is_deleted === true) {
      return res.status(404).json({
        success: false,
        message: "The requested promotional campaign could not be located."
      });
    }

    // Safety Layer: Automatically restrict visibility if the merchant has been blocked
    if (offer.merchant_id?.status === "banned" || offer.merchant_id?.isBlocked === true) {
      return res.status(403).json({
        success: false,
        message: "Access to this offer is restricted because the merchant account has been deactivated."
      });
    }

    
    
    await onOfferClickedHook(offer.merchant_id, userId);
    await trackOfferMetric(offer._id, offer.merchant_id._id, "clicks", req.user._id);

    const rightNow = new Date();
    
    // Compute dynamic layout tags on the fly
    const labelBadge = offer.discount_percentage !== null
      ? `${offer.discount_percentage}% OFF`
      : offer.discount_value !== null
      ? `₹${offer.discount_value} OFF`
      : `Get ${offer.free_quantity || 1} Free`;

    // Package a clean, normalized structure tailored for front-end interface consumers
    const formattedDetails = {
      _id: offer._id,
      title: offer.title,
      description: offer.description || "No description provided.",
      code: offer.code || offer._id.toString().substring(18).toUpperCase(),
      thumbnail: offer.thumbnail || "",
      displayType: offer.display_type,
      discountExpression: labelBadge,
      minimumPurchaseAmount: offer.minimum_purchase_amount || 0,
      
      // Validity Context Timeline Data
      timeline: {
        startDate: offer.start_date,
        endDate: offer.end_date,
        isExpired: new Date(offer.end_date) < rightNow,
        isUpcoming: new Date(offer.start_date) > rightNow,
        remainingDays: Math.max(0, Math.ceil((new Date(offer.end_date) - rightNow) / (1000 * 60 * 60 * 24)))
      },

      // Hydrated Merchant details Sub-object
      merchant: {
        _id: offer.merchant_id?._id,
        storeName: offer.merchant_id?.store_name || offer.merchant_id?.name || "BachatBazarr Partner",
        ownerName: offer.merchant_id?.name,
        email: offer.merchant_id?.email,
        phone: offer.merchant_id?.phone || offer.merchant_id?.contact_phone,
        avatar: offer.merchant_id?.profileImage || null
      },

      // Mechanics templates metadata parameters
      mechanics: {
        parentType: offer.offer_type_id || null,
        subType: offer.sub_offer_type_id || null,
        freeQuantity: offer.free_quantity,
        maxFreeLimit: offer.max_free_quantity,
        campaignPoolWinners: offer.number_of_winners
      },

      // Directly mapped products inventory array list
      linkedProducts: offer.product_id || [],
      
      // Context access constraints
      operationalRules: {
        walkInOnly: offer.only_for_walk_in_customers,
        qrRequired: offer.qr_redemption_required,
        nearbyOnly: offer.show_to_users_nearby_only
      },
      isActive: offer.is_active,
      createdAt: offer.createdAt
    };

    return res.status(200).json({
      success: true,
      data: formattedDetails
    });

  } catch (error) {
    console.error("Single Offer Breakdown Retrieval Failure Exception:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while scanning campaign specifications."
    });
  }
};




export const getCityBannerOffers = async (req, res) => {
  try {
    const { city, category_id } = req.query;
    const rightNow = new Date();

    // 1. Core input parameter validation check
    if (!city) {
      return res.status(400).json({
        success: false,
        message: "City parameter query string is required."
      });
    }

    // 2. Trace verified, unblocked merchants registered inside the target city limits
    const activeMerchantsInCity = await Merchant.find({
      city: { $regex: `^${city.trim()}$`, $options: "i" },
      // status: "verified",       
      // isBlocked: false          
    }).select("_id");

    

    // If no merchants are logged inside this city boundary, return empty dataset immediately
    if (activeMerchantsInCity.length === 0) {
      return res.status(200).json({
        success: true,
        city: city.trim(),
        totalBanners: 0,
        data: []
      });
    }

    const validMerchantIds = activeMerchantsInCity.map(merchant => merchant._id);

    // 3. Construct core active banner conditions parameters matrix
    const bannerQuery = {
      display_type: "banner",
      is_active: true,
      is_deleted: false,
      merchant_id: { $in: validMerchantIds },
      start_date: { $lte: rightNow },
      end_date: { $gte: rightNow }
    };

    // --- NEW: Category Filtration Injection ---
    // If category_id exists in req.query and is a valid format, bind it into the mongo query block
    if (category_id && mongoose.Types.ObjectId.isValid(category_id)) {
      bannerQuery.category_id = new mongoose.Types.ObjectId(category_id);
    }

    // 4. Extract campaigns out using lean profiles for low latency data streaming
    const liveBannersPool = await Offer.find(bannerQuery)
      .populate({
        path: "merchant_id",
        select: "name city status isBlocked",
        model: "Merchant" 
      })
      .populate({
        path: "category_id",
        select: "label value type image"
      })
      .sort({ createdAt: -1 })
      .lean();

    // 5. Clean, format, and map output records payload arrays
    const formattedBanners = liveBannersPool.map((offer) => {
      const badgeText = offer.discount_percentage !== null
        ? `${offer.discount_percentage}% OFF`
        : offer.discount_value !== null
        ? `₹${offer.discount_value} OFF`
        : "Exclusive Deal";

      return {
        _id: offer._id,
        title: offer.title,
        description: offer.description || "",
        thumbnail: offer.thumbnail || "",
        discountBadge: badgeText,
        minimumPurchaseAmount: offer.minimum_purchase_amount || 0,
        claimLimit: offer.claim_limit,
        perUserLimit: offer.per_user_limit || 1,
        endDate: offer.end_date,
        location: offer.location, // GeoJSON [lng, lat] format payload
        merchant: {
          _id: offer.merchant_id?._id,
          name: offer.merchant_id?.name || "BachatBazarr Partner"
        },
        category: offer.category_id ? {
          _id: offer.category_id._id,
          label: offer.category_id.label,
          value: offer.category_id.value
        } : null
      };
    });

    // 6. Return response transmission data deck
    return res.status(200).json({
      success: true,
      city: city.trim(),
      categoryFiltered: category_id ? true : false,
      totalBanners: formattedBanners.length,
      data: formattedBanners
    });

  } catch (error) {
    console.error("City Category Banner Stream Query Processing Fault Exception:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while building local category carousel banner pipelines."
    });
  }
};



export const getCityBannerOffers2 = async (req, res) => {
  try {
    const { lat, lng, category_id } = req.query;
    const rightNow = new Date();

    if (lat === undefined || lng === undefined || lat === "" || lng === "") {
      return res.status(400).json({
        success: false,
        message: "Explicit 'lat' and 'lng' positional coordinates are required."
      });
    }

    const resolvedLat = Number(lat);
    const resolvedLng = Number(lng);

    if (isNaN(resolvedLat) || isNaN(resolvedLng)) {
      return res.status(400).json({
        success: false,
        message: "Provided geographic coordinates are invalid numbers."
      });
    }

    // 1. Geospatial Resolution: Locate the precise active geofenced Area radius zone
    const geoResults = await Area.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [resolvedLng, resolvedLat]
          },
          distanceField: "distance_meters",
          spherical: true,
          query: { is_active: true }
        }
      },
      { $limit: 1 }
    ]);

    const targetArea = geoResults.length > 0 ? geoResults[0] : null;

    if (!targetArea) {
      return res.status(200).json({
        success: true,
        resolvedArea: null,
        totalBanners: 0,
        data: []
      });
    }

    // 2. Compute Radians for the circular boundary mapping matrix
    const areaRadiusInKm = targetArea.radius_km || 5; 
    const radiusInRadians = areaRadiusInKm / 6378.1;
    const [centerLng, centerLat] = targetArea.center_location.coordinates;

    // 3. Build core query targeting active banners within the spatial radius range
    const bannerQuery = {
      display_type: "banner",
      is_active: true,
      is_deleted: false,
      start_date: { $lte: rightNow },
      end_date: { $gte: rightNow },
      location: {
        $geoWithin: {
          $centerSphere: [[centerLng, centerLat], radiusInRadians]
        }
      }
    };

    // 4. Extract active campaigns using lean profiles
    const liveBannersPool = await Offer.find(bannerQuery)
      .populate({
        path: "merchant_id",
        select: "name city status isBlocked",
        model: "Merchant" 
      })
      .populate({
        path: "banner_type_id",
        select: "name slug img description"
      })
      .populate({
        path: "category_id",
        select: "label value type image"
      })
      .sort({ createdAt: -1 })
      .lean();

    // -----------------------------------------------------------------
    // HIGH-PERFORMANCE PIEGEON-HOLE STITCHING + CATEGORY FILTRATION
    // -----------------------------------------------------------------
    let shopsMap = {};
    if (liveBannersPool.length > 0) {
      const uniqueMerchantIds = [
        ...new Set(
          liveBannersPool
            .map((offer) => offer.merchant_id?._id || offer.merchant_id)
            .filter(Boolean)
        ),
      ];

      // Build the storefront query footprint
      const shopQuery = { merchantId: { $in: uniqueMerchantIds } };

      // ✓ MOVED RULE: Inject category limitation directly into the MerchantShop query
      if (category_id && mongoose.Types.ObjectId.isValid(category_id)) {
        shopQuery.categoryId = new mongoose.Types.ObjectId(category_id); 
        // Note: Check your model if it's named 'categoryId' or 'category_id' and update to match.
      }

      const associatedShops = await MerchantShop.find(shopQuery)
        .select("shopName address landMark city logo banner center_location location categoryId")
        .lean();

      // Map matching shops by their parent merchant reference
      associatedShops.forEach((shop) => {
        if (shop.merchantId) {
          shopsMap[shop.merchantId.toString()] = shop;
        }
      });
    }

    // 5. Format output records and strip out offers whose shops don't match the category query
    const formattedBanners = [];

    liveBannersPool.forEach((offer) => {
      const merchantIdStr = offer.merchant_id?._id?.toString() || offer.merchant_id?.toString();
      const matchedShop = merchantIdStr ? shopsMap[merchantIdStr] : null;

      // ✓ IF category filtration is on and no shop matched, exclude this banner from the stream
      if (category_id && !matchedShop) {
        return;
      }

      const badgeText = offer.discount_percentage !== null
        ? `${offer.discount_percentage}% OFF`
        : offer.discount_value !== null
        ? `₹${offer.discount_value} OFF`
        : "Exclusive Deal";

      formattedBanners.push({
        _id: offer._id,
        title: offer.title,
        description: offer.description || "",
        thumbnail: offer.thumbnail || "",
        discountBadge: badgeText,
        minimumPurchaseAmount: offer.minimum_purchase_amount || 0,
        claimLimit: offer.claim_limit,
        perUserLimit: offer.per_user_limit || 1,
        endDate: offer.end_date,
        location: offer.location, 
        merchant: {
          _id: offer.merchant_id?._id,
          name: offer.merchant_id?.name || "BachatBazarr Partner"
        },
        shop: matchedShop ? {
          _id: matchedShop._id,
          shopName: matchedShop.shopName,
          address: matchedShop.address || "",
          landMark: matchedShop.landMark || "",
          city: matchedShop.city || "",
          logo: matchedShop.logo || null,
          banner: matchedShop.banner || null
        } : null,
        bannerType: offer.banner_type_id ? {
          _id: offer.banner_type_id._id,
          name: offer.banner_type_id.name,
          slug: offer.banner_type_id.slug
        } : null,
        category: offer.category_id ? {
          _id: offer.category_id._id,
          label: offer.category_id.label,
          value: offer.category_id.value
        } : null
      });
    });

    return res.status(200).json({
      success: true,
      resolvedArea: {
        _id: targetArea._id,
        name: targetArea.name,
        city: targetArea.city,
        radius_km: areaRadiusInKm
      },
      categoryFiltered: !!category_id,
      totalBanners: formattedBanners.length,
      data: formattedBanners
    });

  } catch (error) {
    console.error("Geospatial Area Banner Stream Processing Exception:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while retrieving area banners."
    });
  }
};
export const getOffersByStoreId = async (req, res) => {
  try {
    const { storeId } = req.params;
    const rightNow = new Date();

    // Validate the storeId token format to prevent casting faults
    if (!mongoose.Types.ObjectId.isValid(storeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Store identifier parameter format."
      });
    }

    // 1. Locate the master shop document registry parameters
    const shop = await MerchantShop.findById(storeId).select("merchantId shopName");
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Target shop storefront location records not found."
      });
    }

    const merchantId = shop.merchantId;

    // 2. Aggregate valid campaigns mapped to this specific merchant profile owner
    const activeOffersPool = await Offer.find({
      merchant_id: merchantId,
      is_active: true,
      is_deleted: false,
      start_date: { $lte: rightNow },
      end_date: { $gte: rightNow }
    })
    .populate("offer_type_id", "label value")
    .populate("sub_offer_type_id", "label value")
    .sort({ createdAt: -1 })
    .lean();

    // --- WISHLIST LOOKUP BLOCK ---
    let wishlistedOfferIdsSet = new Set();
    if (req.user) {
      const userWishlist = await Wishlist.findOne({ userId: req.user._id }).lean();
      if (userWishlist?.offers) {
        wishlistedOfferIdsSet = new Set(
          userWishlist.offers.map((id) => id.toString())
        );
      }
    }

    // 3. Separate the matching pool streams natively into your 3 layout groups
    const banners = [];
    const calendarSlots = [];
    const standardOffers = [];

    activeOffersPool.forEach((offer) => {
      const offerIdStr = offer._id.toString();

      // Structure crisp presentation layers matching your customer feed views
      const labelBadge = offer.discount_percentage !== null
        ? `${offer.discount_percentage}% OFF`
        : offer.discount_value !== null
        ? `₹${offer.discount_value} OFF`
        : `Get ${offer.free_quantity || 1} Free`;

      const normalizedPayload = {
        _id: offer._id,
        title: offer.title,
        description: offer.description || "",
        code: offer.code || offer._id.toString().substring(18).toUpperCase(),
        thumbnail: offer.thumbnail || "",
        discountExpression: labelBadge,
        minimumPurchaseAmount: offer.minimum_purchase_amount || 0,
        endDate: offer.end_date,
        remainingDays: Math.max(0, Math.ceil((new Date(offer.end_date) - rightNow) / (1000 * 60 * 60 * 24))),
        mechanicType: offer.offer_type_id?.label || "General Deal",
        subMechanicType: offer.sub_offer_type_id?.label || null,
        isWishlisted: wishlistedOfferIdsSet.has(offerIdStr), // Dynamic wishlist status flag
        restrictions: {
          walkInOnly: offer.only_for_walk_in_customers,
          qrRequired: offer.qr_redemption_required
        }
      };

      // Map segments strictly onto your targeted frontend array components
      if (offer.display_type === "banner") {
        banners.push(normalizedPayload);
      } else if (offer.display_type === "calendar") {
        calendarSlots.push(normalizedPayload);
      } else {
        standardOffers.push(normalizedPayload);
      }
    });

    // 4. Send unified response payload
    return res.status(200).json({
      success: true,
      store: {
        _id: storeId,
        shopName: shop.shopName
      },
      data: {
        totalActiveOffers: activeOffersPool.length,
        payload: {
          banners,
          calendarSlots,
          standardOffers
        }
      }
    });

  } catch (error) {
    console.error("Store campaigns lookup error exception:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while compiling active storefront promotional lists.",
      error: error.message
    });
  }
};

export const getUserCategories = async (req, res) => {
  try {
    // 1. Fetch only active fields using lean execution for hyper-low latency streaming
    const activeCategories = await Category.find({ isActive: true })
      .select("value label type description image") // Excludes structural metadata fields like __v
      .sort({ label: 1 }) // Sort alphabetically by display label name (A-Z)
      .lean();

    // 2. Return the structured collection
    return res.status(200).json({
      success: true,
      count: activeCategories.length,
      data: activeCategories
    });

  } catch (error) {
    console.error("User Category Index Fetch Exception Error:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while retrieving categories."
    });
  }
};

export const getNearbyShops15KmForUser = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, category } = req.query;

    // 1. Context Check: Guard against unauthenticated executions
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Access Denied: Missing user authentication profile signature contextual keys."
      });
    }

    // 2. Extract and Validate coordinates saved directly on the user model object
    const centerLat = req.user.latitude;
    const centerLng = req.user.longitude;

    if (centerLat === undefined || centerLng === undefined || centerLat === null || centerLng === null) {
      return res.status(400).json({
        success: false,
        message: "Geographic missing block: Please update your user profile location parameters or toggle your device's GPS channels to look up nearby shops."
      });
    }

    // --- GEOSPATIAL BOUNDING BOX CALCULATION MATRIX (15KM THRESHOLD) ---
    const targetRadiusKm = 15;
    const kmPerDegreeLat = 111.1;
    const kmPerDegreeLng = 111.1 * Math.cos(centerLat * (Math.PI / 180));

    const latDelta = targetRadiusKm / kmPerDegreeLat;
    const lngDelta = targetRadiusKm / kmPerDegreeLng;

    // Fast numeric index lookup constraint block
    const query = {
      latitude: { $gte: centerLat - latDelta, $lte: centerLat + latDelta },
      longitude: { $gte: centerLng - lngDelta, $lte: centerLng + lngDelta }
    };

    // Integrate optional search descriptors or category tags seamlessly
    if (search) {
      query.shopName = { $regex: search, $options: "i" };
    }

    if (category) {
      query.categoryId = category;
    }

    // Pagination configuration
    const currentLimit = Number(limit);
    const skip = (Math.max(1, Number(page)) - 1) * currentLimit;

    // Fetch candidate list within the bounding box range frame
    const rawShops = await MerchantShop.find(query)
      .populate("merchantId", "name email profileImage")
      .populate("categoryId", "label")
      .populate("subCategoryId", "label")
      .select("-logo.data -banner.data")
      .lean();

    if (rawShops.length === 0) {
      return res.status(200).json({
        success: true,
        userLocation: { city: req.user.city, lat: centerLat, lng: centerLng },
        total: 0,
        pages: 1,
        currentPage: Number(page),
        data: []
      });
    }

    // 3. Exact In-Memory Haversine Calculation (Filters out bounding box corner leaks)
    const validShopsInRadius = [];

    rawShops.forEach((shop) => {
      if (shop.latitude && shop.longitude) {
        const R = 6371; // Earth's mean radius constants in kilometers
        const dLat = (shop.latitude - centerLat) * (Math.PI / 180);
        const dLng = (shop.longitude - centerLng) * (Math.PI / 180);
        
        const a = 
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(centerLat * (Math.PI / 180)) * Math.cos(shop.latitude * (Math.PI / 180)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
          
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceKm = R * c;

        if (distanceKm <= targetRadiusKm) {
          shop.distanceKm = Number(distanceKm.toFixed(2));
          validShopsInRadius.push(shop);
        }
      }
    });

    // Sort array closest proximity first
    validShopsInRadius.sort((a, b) => a.distanceKm - b.distanceKm);

    // 4. Complete custom page segments slice
    const totalWithinRadius = validShopsInRadius.length;
    const paginatedShops = validShopsInRadius.slice(skip, skip + currentLimit);

    // 5. Bulk Wishlist & Live Offers Lookup Pipeline
    if (paginatedShops.length > 0) {
      // --- WISHLIST LOOKUP BLOCK ---
      const userWishlist = await Wishlist.findOne({ userId: req.user._id }).lean();
      const wishlistedShopIdsSet = new Set(
        (userWishlist?.shops || []).map((id) => id.toString())
      );

      // --- LIVE OFFERS LOOKUP BLOCK ---
      const merchantIds = paginatedShops
        .map(shop => shop.merchantId?._id || shop.merchantId)
        .filter(Boolean);

      const liveOffers = await Offer.find({
        merchant_id: { $in: merchantIds },
        is_active: true,
        is_deleted: false,
        start_date: { $lte: new Date() },
        $or: [
          { end_date: { $exists: false } },
          { end_date: null },
          { end_date: { $gte: new Date() } }
        ]
      })
      .select("title description thumbnail display_type discount_percentage discount_value merchant_id start_date end_date")
      .sort({ createdAt: -1 })
      .lean();

      // Build safe lookup mapping index
      const offersMap = {};
      liveOffers.forEach(offer => {
        if (!offer.merchant_id) return;
        const mId = offer.merchant_id.toString();
        if (!offersMap[mId]) offersMap[mId] = [];
        offersMap[mId].push(offer);
      });

      // Stitch wishlist flag & offers back onto shop profiles
      paginatedShops.forEach(shop => {
        const shopIdStr = shop._id.toString();
        shop.isWishlisted = wishlistedShopIdsSet.has(shopIdStr);

        const lookupKey = shop.merchantId?._id?.toString() || shop.merchantId?.toString();
        shop.offers = lookupKey ? (offersMap[lookupKey] || []) : [];
      });
    }

    return res.status(200).json({
      success: true,
      userLocation: {
        city: req.user.city || "unknown",
        lat: centerLat,
        lng: centerLng
      },
      total: totalWithinRadius,
      pages: Math.ceil(totalWithinRadius / currentLimit) || 1,
      currentPage: Number(page),
      searchRadius: `${targetRadiusKm}km`,
      data: paginatedShops
    });

  } catch (error) {
    console.error("Authenticated 15Km Shop Discovery Exception:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while analyzing tracking sectors for your account profile layout.",
      error: error.message
    });
  }
};

export const getNearbyBannersForUser = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, banner_type_id } = req.query;

    // 1. Context Check: Guard against unauthenticated executions
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Access Denied: Missing authenticated user context profile."
      });
    }

    const centerLat = req.user.latitude;
    const centerLng = req.user.longitude;

    if (centerLat === undefined || centerLng === undefined || centerLat === null || centerLng === null) {
      return res.status(400).json({
        success: false,
        message: "Missing location bounds: Please save or enable your profile location to view nearby banners."
      });
    }

    const rightNow = new Date();
    const targetRadiusKm = 15;
    
    // --- GEOSPATIAL BOUNDING BOX CALCULATION MATRIX (15KM THRESHOLD) ---
    const kmPerDegreeLat = 111.1;
    const kmPerDegreeLng = 111.1 * Math.cos(centerLat * (Math.PI / 180));

    const latDelta = targetRadiusKm / kmPerDegreeLat;
    const lngDelta = targetRadiusKm / kmPerDegreeLng;

    // Fast numerical index query constraint box for nearby shops
    const shopQuery = {
      latitude: { $gte: centerLat - latDelta, $lte: centerLat + latDelta },
      longitude: { $gte: centerLng - lngDelta, $lte: centerLng + lngDelta }
    };

    // If an administrative category filter is requested, filter the shops by it
    if (category) {
      shopQuery.categoryId = category;
    }

    // Fetch candidate shops within the bounding box zone
    const rawShops = await MerchantShop.find(shopQuery)
      .populate("merchantId", "name email profileImage")
      .populate("categoryId", "label")
      .populate("subCategoryId", "label")
      .select("-logo.data -banner.data")
      .lean();

    if (rawShops.length === 0) {
      return res.status(200).json({
        success: true,
        userLocation: { city: req.user.city, lat: centerLat, lng: centerLng },
        totalBanners: 0,
        data: []
      });
    }

    // 2. Precise In-Memory Haversine Verification
    const validMerchantIds = [];
    const shopsMap = {};

    rawShops.forEach((shop) => {
      if (shop.latitude && shop.longitude && shop.merchantId) {
        const R = 6371; // Earth's mean radius in km
        const dLat = (shop.latitude - centerLat) * (Math.PI / 180);
        const dLng = (shop.longitude - centerLng) * (Math.PI / 180);
        
        const a = 
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(centerLat * (Math.PI / 180)) * Math.cos(shop.latitude * (Math.PI / 180)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
          
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceKm = R * c;

        // Keep only the shops inside the perfect 15km radius circle
        if (distanceKm <= targetRadiusKm) {
          shop.distanceKm = Number(distanceKm.toFixed(2));
          const mIdStr = shop.merchantId._id.toString();
          
          validMerchantIds.push(shop.merchantId._id);
          shopsMap[mIdStr] = shop; // Index by merchant ID for fast matching below
        }
      }
    });

    if (validMerchantIds.length === 0) {
      return res.status(200).json({
        success: true,
        totalBanners: 0,
        data: []
      });
    }

    // 3. Build Active Banner Query Framework
    const bannerQuery = {
      merchant_id: { $in: validMerchantIds },
      display_type: { $in: ["banner"] }, // Pull items specifically marked as banners
      is_active: true,
      is_deleted: false,
      start_date: { $lte: rightNow },
      $or: [
        { end_date: { $exists: false } },
        { end_date: null },
        { end_date: { $gte: rightNow } }
      ]
    };

    // If filtration by specific template layout configurations is active (e.g., category-slider vs hero)
    if (banner_type_id) {
      bannerQuery.banner_type_id = banner_type_id;
    }

    // Pagination Variables
    const currentLimit = Number(limit);
    const skip = (Math.max(1, Number(page)) - 1) * currentLimit;

    // 4. Fetch the total number of valid matching banners
    const totalBannersCount = await Offer.countDocuments(bannerQuery);

    // 5. Extract banner offers database rows
    const liveBannersPool = await Offer.find(bannerQuery)
      .populate({
        path: "banner_type_id",
        select: "name slug img description"
      })
      .populate({
        path: "category_id",
        select: "label value type image"
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(currentLimit)
      .lean();

    // 6. Format output array, embedding the matched store profile directly inside the banner object
    const formattedBanners = liveBannersPool.map((offer) => {
      const badgeText = offer.discount_percentage !== null
        ? `${offer.discount_percentage}% OFF`
        : offer.discount_value !== null
        ? `₹${offer.discount_value} OFF`
        : "Exclusive Deal";

      // Look up the pre-calculated localized store info using the map index
      const merchantIdStr = offer.merchant_id ? offer.merchant_id.toString() : "";
      const matchedShop = merchantIdStr ? shopsMap[merchantIdStr] : null;

      return {
        _id: offer._id,
        title: offer.title,
        description: offer.description || "",
        thumbnail: offer.thumbnail || "",
        discountBadge: badgeText,
        minimumPurchaseAmount: offer.minimum_purchase_amount || 0,
        claimLimit: offer.claim_limit,
        perUserLimit: offer.per_user_limit || 1,
        endDate: offer.end_date,
        location: offer.location, 
        distanceKm: matchedShop ? matchedShop.distanceKm : null,
        merchantId: offer.merchant_id,
        // Embedded associated shop properties
        shop: matchedShop ? {
          _id: matchedShop._id,
          shopName: matchedShop.shopName,
          address: matchedShop.address || "",
          city: matchedShop.city || "",
          latitude: matchedShop.latitude,
          longitude: matchedShop.longitude,
          logo: matchedShop.logo || null,
          banner: matchedShop.banner || null
        } : null,
        bannerType: offer.banner_type_id ? {
          _id: offer.banner_type_id._id,
          name: offer.banner_type_id.name,
          slug: offer.banner_type_id.slug
        } : null,
        category: offer.category_id ? {
          _id: offer.category_id._id,
          label: offer.category_id.label,
          value: offer.category_id.value
        } : null
      };
    });

    // 7. Optional: Sort the final banner offer results by closest store distance proximity
    formattedBanners.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));

    return res.status(200).json({
      success: true,
      userLocation: {
        city: req.user.city || "unknown",
        lat: centerLat,
        lng: centerLng
      },
      totalBanners: totalBannersCount,
      pages: Math.ceil(totalBannersCount / currentLimit) || 1,
      currentPage: Number(page),
      searchRadius: `${targetRadiusKm}km`,
      data: formattedBanners
    });

  } catch (error) {
    console.error("Geospatial Area Banner Offer Gathering Pipeline Error:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while retrieving nearby banner offers.",
      error: error.message
    });
  }
};


/**
 * GET /api/calendar-offers/nearby-authenticated
 * Scans the logged-in user's profile context for coordinates,
 * identifies shops within a 15km radius, and lists out their active calendar offers 
 * that overlap with the requested start_date and end_date timeframes.
 */
export const getNearbyCalendarOffersForUser = async (req, res) => {
  try {
    const { date, page = 1, limit = 10, category } = req.query;

    // 1. Context & Authentication Verification Check
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Access Denied: Missing authenticated user context profile attributes."
      });
    }

    const centerLat = req.user.latitude;
    const centerLng = req.user.longitude;

    if (centerLat === undefined || centerLng === undefined || centerLat === null || centerLng === null) {
      return res.status(400).json({
        success: false,
        message: "Missing location bounds: Please save your profile location coordinates to load calendar schedules."
      });
    }

    // 2. Validate Single Target Date
    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Explicit 'date' query parameter string is required (e.g., YYYY-MM-DD)."
      });
    }

    // Set boundaries for the specific single date (start of day to end of day)
    const targetDateStart = new Date(date);
    targetDateStart.setHours(0, 0, 0, 0);

    const targetDateEnd = new Date(date);
    targetDateEnd.setHours(23, 59, 59, 999);

    if (isNaN(targetDateStart.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Provided 'date' is formatted as an invalid date timestamp."
      });
    }

    const targetRadiusKm = 15;
    
    // --- GEOSPATIAL BOUNDING BOX CALCULATION MATRIX (15KM THRESHOLD) ---
    const kmPerDegreeLat = 111.1;
    const kmPerDegreeLng = 111.1 * Math.cos(centerLat * (Math.PI / 180));

    const latDelta = targetRadiusKm / kmPerDegreeLat;
    const lngDelta = targetRadiusKm / kmPerDegreeLng;

    // Numerical range index query constraints bound box configuration matching shops
    const shopQuery = {
      latitude: { $gte: centerLat - latDelta, $lte: centerLat + latDelta },
      longitude: { $gte: centerLng - lngDelta, $lte: centerLng + lngDelta }
    };

    if (category) {
      shopQuery.categoryId = category;
    }

    // Identify candidate shop entities
    const rawShops = await MerchantShop.find(shopQuery)
      .populate("merchantId", "name email profileImage")
      .populate("categoryId", "label")
      .populate("subCategoryId", "label")
      .select("-logo.data -banner.data")
      .lean();

    if (rawShops.length === 0) {
      return res.status(200).json({
        success: true,
        userLocation: { city: req.user.city, lat: centerLat, lng: centerLng },
        totalOffers: 0,
        data: []
      });
    }

    // 3. Exact In-Memory Haversine Verification Filter
    const validMerchantIds = [];
    const shopsMap = {};

    rawShops.forEach((shop) => {
      if (shop.latitude && shop.longitude && shop.merchantId) {
        const R = 6371; // Earth's mean radius in km
        const dLat = (shop.latitude - centerLat) * (Math.PI / 180);
        const dLng = (shop.longitude - centerLng) * (Math.PI / 180);
        
        const a = 
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(centerLat * (Math.PI / 180)) * Math.cos(shop.latitude * (Math.PI / 180)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
          
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceKm = R * c;

        // Strip box-corner overlaps exceeding true circular boundaries
        if (distanceKm <= targetRadiusKm) {
          shop.distanceKm = Number(distanceKm.toFixed(2));
          const mIdStr = shop.merchantId._id.toString();
          
          validMerchantIds.push(shop.merchantId._id);
          shopsMap[mIdStr] = shop; 
        }
      }
    });

    if (validMerchantIds.length === 0) {
      return res.status(200).json({
        success: true,
        totalOffers: 0,
        data: []
      });
    }

    // 4. Build Single Date Active Timeline Filters Matrix
    const calendarQuery = {
      merchant_id: { $in: validMerchantIds },
      display_type: { $in: ["calendar"] },
      is_deleted: false,
      start_date: { $lte: targetDateEnd },
      $or: [
        { end_date: { $exists: false } },
        { end_date: null },
        { end_date: { $gte: targetDateStart } }
      ]
    };

    const currentLimit = Number(limit);
    const skip = (Math.max(1, Number(page)) - 1) * currentLimit;

    // Fetch total active schedule elements count
    const totalOffersCount = await Offer.countDocuments(calendarQuery);

    // Retrieve final dataset lists
    const liveOffersPool = await Offer.find(calendarQuery)
      .populate({
        path: "category_id",
        select: "label value type image"
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(currentLimit)
      .lean();

    // --- WISHLIST LOOKUP BLOCK ---
    let wishlistedOfferIdsSet = new Set();
    if (req.user) {
      const userWishlist = await Wishlist.findOne({ userId: req.user._id }).lean();
      if (userWishlist?.offers) {
        wishlistedOfferIdsSet = new Set(
          userWishlist.offers.map((id) => id.toString())
        );
      }
    }

    // 5. Build Formatted JSON response embedding Shop profiles inside Offer structures
    const formattedOffers = liveOffersPool.map((offer) => {
      const offerIdStr = offer._id.toString();

      const badgeText = offer.discount_percentage !== null
        ? `${offer.discount_percentage}% OFF`
        : offer.discount_value !== null
        ? `₹${offer.discount_value} OFF`
        : "Exclusive Deal";

      const merchantIdStr = offer.merchant_id ? offer.merchant_id.toString() : "";
      const matchedShop = merchantIdStr ? shopsMap[merchantIdStr] : null;

      return {
        _id: offer._id,
        title: offer.title,
        description: offer.description || "",
        thumbnail: offer.thumbnail || "",
        discountBadge: badgeText,
        minimumPurchaseAmount: offer.minimum_purchase_amount || 0,
        claimLimit: offer.claim_limit,
        perUserLimit: offer.per_user_limit || 1,
        startDate: offer.start_date,
        endDate: offer.end_date,
        location: offer.location, 
        distanceKm: matchedShop ? matchedShop.distanceKm : null,
        merchantId: offer.merchant_id,
        isWishlisted: wishlistedOfferIdsSet.has(offerIdStr), // Injected dynamic wishlist status flag
        shop: matchedShop ? {
          _id: matchedShop._id,
          shopName: matchedShop.shopName,
          address: matchedShop.address || "",
          city: matchedShop.city || "",
          latitude: matchedShop.latitude,
          longitude: matchedShop.longitude,
          logo: matchedShop.logo || null,
          banner: matchedShop.banner || null
        } : null,
        category: offer.category_id ? {
          _id: offer.category_id._id,
          label: offer.category_id.label,
          value: offer.category_id.value
        } : null
      };
    });

    return res.status(200).json({
      success: true,
      userLocation: {
        city: req.user.city || "unknown",
        lat: centerLat,
        lng: centerLng
      },
      targetDate: targetDateStart.toISOString().split('T')[0],
      totalOffers: totalOffersCount,
      pages: Math.ceil(totalOffersCount / currentLimit) || 1,
      currentPage: Number(page),
      searchRadius: `${targetRadiusKm}km`,
      data: formattedOffers
    });

  } catch (error) {
    console.error("Geospatial Area Single Date Calendar Schedule Collection Pipeline Exception:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while retrieving nearby single-date calendar schedule offers.",
      error: error.message
    });
  }
};