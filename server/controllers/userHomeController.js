import MerchantShop from "../models/merchantShopModel.js";
import Product from "../models/productModel.js";
import Service from "../models/serviceModel.js";


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

    // 1. Fetch Shop Details
    const shop = await MerchantShop.findById(id)
      .populate("merchantId", "name email phone profileImage")
      .populate("categoryId", "label")
      .populate("subCategoryId", "label");

    if (!shop) {
      return res.status(404).json({ success: false, message: "Shop not found." });
    }

    const merchantId = shop.merchantId._id;

    // 2. Fetch Products and Services in parallel for better performance
    const [products, services] = await Promise.all([
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
      .sort({ createdAt: -1 })
    ]);

    // 3. Construct the response
    res.status(200).json({
      success: true,
      data: {
        shop,
        inventory: {
          productCount: products.length,
          serviceCount: services.length,
          products,
          services
        }
      }
    });

  } catch (error) {
    console.error("Shop Details Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error retrieving shop inventory." 
    });
  }
};