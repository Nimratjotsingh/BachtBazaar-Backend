import MerchantShop from "../models/merchantShopModel.js";
import Product from "../models/productModel.js";
import Service from "../models/serviceModel.js";
import Offer from '../models/offerModel.js';
import Merchant from '../models/merchantModel.js';
import Category from '../models/categoryModel.js';
import mongoose from "mongoose";
import Area from "../models/AreaModel.js";




export const getAllShops = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      category,
      lat,
      lng,
      maxDistanceKm = 10 // Search radius threshold boundary range limit
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
    // Earth's degrees translation constants:
    // 1 Degree of Latitude ≈ 111.1 km
    // 1 Degree of Longitude ≈ 111.1 km * cos(latitude)
    const kmPerDegreeLat = 111.1;
    const kmPerDegreeLng = 111.1 * Math.cos(centerLat * (Math.PI / 180));

    const latDelta = Number(maxDistanceKm) / kmPerDegreeLat;
    const lngDelta = Number(maxDistanceKm) / kmPerDegreeLng;

    // Build the query object
    const query = {
      latitude: { $gte: centerLat - latDelta, $lte: centerLat + latDelta },
      longitude: { $gte: centerLng - lngDelta, $lte: centerLng + lngDelta }
    };

    // 1. Incorporate secondary search filters safely
    if (search) {
      query.shopName = { $regex: search, $options: "i" };
    }

    if (category) {
      query.categoryId = category;
    }

    // 2. Pagination Logic Setup
    const currentLimit = Number(limit);
    const skip = (Math.max(1, Number(page)) - 1) * currentLimit;

    // Fetch total document pools matching the frame bounds criteria
    const total = await MerchantShop.countDocuments(query);
    
    // Execute data fetch with population strings attached
    const shops = await MerchantShop.find(query)
      .populate("merchantId", "name email profileImage")
      .populate("categoryId", "label")
      .populate("subCategoryId", "label")
      .select("-logo.data -banner.data") // Keeps responses lightweight
      .skip(skip)
      .limit(currentLimit)
      .lean();

    // 3. High-Performance Bulk Offers Injection Pipeline
    if (shops.length > 0) {
      // Calculate real distances manually in-memory and attach them
      shops.forEach(shop => {
        if (shop.latitude && shop.longitude) {
          // Haversine formula mapping matrix
          const R = 6371; // Earth's radius in km
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

      // Optional: Sort by closest distance first since MongoDB didn't do it natively
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
      .select("title description thumbnail display_type discount_percentage discount_value start_date end_date")
      .sort({ createdAt: -1 })
      .lean();

      // Index current running items cleanly matching your merchant parameters
      const offersByMerchantMap = {};
      liveOffers.forEach(offer => {
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
    const shop = await MerchantShop.findById(id)
      .populate("merchantId", "name email phone profileImage status")
      .populate("categoryId", "label")
      .populate("subCategoryId", "label");

    if (!shop) {
      return res.status(404).json({ success: false, message: "Shop not found." });
    }

    // Safety fallback check: If the merchant account has been restricted by an admin, block access
    if (shop.merchantId?.status === "banned" || shop.merchantId?.isBlocked === true) {
      return res.status(403).json({ success: false, message: "This merchant profile has been restricted." });
    }

    const merchantId = shop.merchantId._id;

    // 2. Fetch Products, Services, and Active Offers in parallel for optimal performance
    const [products, services, offers] = await Promise.all([
      Product.find({ 
        merchant_id: merchantId, 
        is_deleted: false, 
        is_active: true 
      })
      .select("name price discounted_price thumbnail stock is_featured")
      .sort({ createdAt: -1 }),

      Service.find({ 
        merchant_id: merchantId, 
        is_deleted: false, 
        is_active: true 
      })
      .select("name price discounted_price thumbnail pricing_type is_featured")
      .sort({ createdAt: -1 }),

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
    ]);

    // 3. Construct the synchronized response payload
    res.status(200).json({
      success: true,
      data: {
        shop,
        inventory: {
          productCount: products.length,
          serviceCount: services.length,
          offerCount: offers.length,
          products,
          services,
          offers // Aggregated valid marketing campaigns arrays
        }
      }
    });

  } catch (error) {
    console.error("Shop Details Matrix Aggregation Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error retrieving shop inventory parameters package." 
    });
  }
};

// ====================================================================
// --- Global Unified Search Controller (Shops, Products & Services) ---
// ====================================================================
export const searchGlobalCatalog = async (req, res) => {
  try {
    const { 
      q = "", 
      city, 
      limit = 5,
      type = "all" // options: 'all' | 'shop' | 'product' | 'service'
    } = req.query;

    const searchKeyword = q.trim();
    if (!searchKeyword) {
      return res.status(400).json({ 
        success: false, 
        message: "Search query parameter string cannot be empty." 
      });
    }

    const regexSearch = { $regex: searchKeyword, $options: "i" };
    const maxResults = Math.max(1, Number(limit));

    // Base scoping queries initialized
    let shopResults = [];
    let productResults = [];
    let serviceResults = [];

    // --- 1. CONSTRUCT SEARCH PIPELINES ---
    
    // Shop Search Setup
    const shopQuery = { shopName: regexSearch };
    if (city) {
      shopQuery.city = { $regex: city.trim(), $options: "i" };
    }

    // Product/Service Search Setup (Matches name or text descriptions/tags if added)
    const itemQuery = {
      is_deleted: false,
      is_active: true,
      $or: [
        { name: regexSearch },
        { description: regexSearch }
      ]
    };

    // --- 2. EXECUTE ASYNCHRONOUS QUERIES IN PARALLEL ---
    const searchTasks = [];

    if (type === "all" || type === "shop") {
      searchTasks.push(
        MerchantShop.find(shopQuery)
          .populate("categoryId", "label")
          .select("-logo.data -banner.data") // Keep payload sizes optimized
          .limit(maxResults)
          .lean()
      );
    } else {
      searchTasks.push(Promise.resolve([])); // Static filler
    }

    if (type === "all" || type === "product") {
      searchTasks.push(
        Product.find(itemQuery)
          .select("name price discounted_price thumbnail stock is_featured merchant_id")
          .limit(maxResults)
          .lean()
      );
    } else {
      searchTasks.push(Promise.resolve([]));
    }

    if (type === "all" || type === "service") {
      searchTasks.push(
        Service.find(itemQuery)
          .populate("merchant_id", "name store_name")
          .select("name price discounted_price thumbnail pricing_type is_featured merchant_id")
          .limit(maxResults)
          .lean()
      );
    } else {
      searchTasks.push(Promise.resolve([]));
    }

    // Resolve query arrays in a single database round-trip loop pass
    const [shops, products, services] = await Promise.all(searchTasks);

    // --- 3. RESPOND WITH COMBINED PLATFORM MATRIX ---
    res.status(200).json({
      success: true,
      query: searchKeyword,
      filters: { city: city || "all", type },
      results: {
        totalShopsFound: shops.length,
        totalProductsFound: products.length,
        totalServicesFound: services.length,
        shops,
        products,
        services
      }
    });

  } catch (error) {
    console.error("Global Catalog Search Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "An internal server error occurred while scanning catalog registries." 
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
        model: "User" // Points to your underlying user/merchant profile model
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
export const getOffersByStoreId = async (req,res) => {
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

    // 3. Separate the matching pool streams natively into your 3 layout groups
    const banners = [];
    const calendarSlots = [];
    const standardOffers = [];

    activeOffersPool.forEach((offer) => {
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
      message: "An error occurred while compiling active storefront promotional lists."
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