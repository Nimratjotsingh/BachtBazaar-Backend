import MerchantShop from "../models/merchantShopModel.js";
import Product from "../models/productModel.js";
import Service from "../models/serviceModel.js";
import Offer from '../models/offerModel.js';
import mongoose from "mongoose";


// --- Show All Shops for Users (Paginated) ---
export const getAllShops = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      city, 
      category 
    } = req.query;

    const query = {};

    // 1. Filter by City
    if (city) {
      query.city = { $regex: city, $options: "i" };
    }

    // 2. Search by Shop Name
    if (search) {
      query.shopName = { $regex: search, $options: "i" };
    }

    // 3. Filter by Category
    if (category) {
      query.categoryId = category;
    }

    // 4. Pagination Logic
    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    const total = await MerchantShop.countDocuments(query);
    
    // We use .select("-logo.data -banner.data") because sending raw 
    // binary buffers in a list view makes the JSON response massive.
    const shops = await MerchantShop.find(query)
      .populate("merchantId", "name email profileImage")
      .populate("categoryId", "label")
      .populate("subCategoryId", "label")
      .select("-logo.data -banner.data") // Exclude heavy image data for list view
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      total,
      pages: Math.ceil(total / limit) || 1,
      currentPage: Number(page),
      data: shops
    });

  } catch (error) {
    console.error("Get All Shops Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to retrieve shops." 
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
        select: "name store_name email profileImage status isBlocked",
        model: "User" // Ensures it points exactly to your user model export
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
    const { city } = req.query;
    const rightNow = new Date();

    if (!city) {
      return res.status(400).json({
        success: false,
        message: "City parameter query string is required."
      });
    }

    // 1. Trace all merchant IDs running matching shop storefront locations in the specified city
    const activeShopsInCity = await MerchantShop.find({
      city: { $regex: `^${city.trim()}$`, $options: "i" }
    }).select("merchantId");

    // If no storefront matching that city boundary is logged, return empty collection safely
    if (activeShopsInCity.length === 0) {
      return res.status(200).json({
        success: true,
        city: city.trim(),
        totalBanners: 0,
        data: []
      });
    }

    const validMerchantIds = activeShopsInCity.map(shop => shop.merchantId);

    // 2. Build pipeline constraints targeting explicitly local city merchant banners
    const bannerQuery = {
      display_type: "banner",
      is_active: true,
      is_deleted: false,
      merchant_id: { $in: validMerchantIds },
      start_date: { $lte: rightNow },
      end_date: { $gte: rightNow }
    };

    // 3. Extract banner campaigns using lean execution profiles for rapid transmission
    const liveBannersPool = await Offer.find(bannerQuery)
      .populate({
        path: "merchant_id",
        select: "store_name name status isBlocked",
        model: "User"
      })
      .populate("offer_type_id", "label value")
      .sort({ createdAt: -1 })
      .lean();

    // 4. Map and filter records into a clean, normalized payload array block
    const formattedBanners = [];

    liveBannersPool.forEach((offer) => {
      // Guard: Ignore if parent corporate account has been banned or blocked
      if (offer.merchant_id?.status === "banned" || offer.merchant_id?.isBlocked === true) {
        return;
      }

      // Format simple uniform badges for frontend carousels layout elements
      const badgeText = offer.discount_percentage !== null
        ? `${offer.discount_percentage}% OFF`
        : offer.discount_value !== null
        ? `₹${offer.discount_value} OFF`
        : "Exclusive Deal";

      formattedBanners.push({
        _id: offer._id,
        title: offer.title,
        description: offer.description || "",
        thumbnail: offer.thumbnail || "", // The background canvas array artwork string path
        code: offer.code || offer._id.toString().substring(18).toUpperCase(),
        discountBadge: badgeText,
        minimumPurchaseAmount: offer.minimum_purchase_amount || 0,
        endDate: offer.end_date,
        merchant: {
          _id: offer.merchant_id?._id,
          storeName: offer.merchant_id?.store_name || offer.merchant_id?.name || "BachatBazarr Partner"
        },
        mechanicType: offer.offer_type_id?.label || "General"
      });
    });

    // 5. Send optimized payload stream response
    return res.status(200).json({
      success: true,
      city: city.trim(),
      totalBanners: formattedBanners.length,
      data: formattedBanners
    });

  } catch (error) {
    console.error("City Banner Stream Processing Error Exception:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while building local carousel banner pipelines."
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