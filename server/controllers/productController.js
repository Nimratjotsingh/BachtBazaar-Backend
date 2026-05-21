import Product from "../models/productModel.js";
import { validate } from "../validators/validate.js"; 
import { productSchema } from "../validators/productValidator.js";

// ==========================================
// MERCHANT ACTIONS
// ==========================================

// --- Create Product ---
export const createProduct = async (req, res) => {
  try {
    const data = { ...req.body };

    // 1. Handle Thumbnail
    if (req.files && req.files.thumbnail) {
      data.thumbnail = `/uploads/${req.files.thumbnail[0].filename}`;
    }

    // 2. Handle Image Array
    if (req.files && req.files.images) {
      data.images = req.files.images.map(file => `/uploads/${file.filename}`);
    }
    
    if (typeof data.category_id === 'string') data.category_id = [data.category_id];
    if (typeof data.subcategory_id === 'string') data.subcategory_id = [data.subcategory_id];

    // Force default state for any fresh additions
    data.approval_status = "pending";
    data.approved_by = null;
    data.approval_date = null;
    data.rejection_reason = "";

    const newProduct = new Product({
      ...data,
      merchant_id: req.merchant._id 
    });

    await newProduct.save();
    
    res.status(201).json({ 
      success: true, 
      message: "Product submitted for admin review successfully", 
      product: newProduct 
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// --- List All Products (Merchant Context) ---
export const listProductsAll = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = "", 
      category, 
      minPrice, 
      maxPrice, 
      featured,
      approvalStatus // Allows merchant to filter by pending, approved, or rejected
    } = req.query || {};

    // Base query constraints: must belong to merchant and not be soft deleted
 

    if (search && search.trim() !== "") {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search.trim(), "i")] } }
      ];
    }

    if (category) query.category_id = category;
    if (approvalStatus) query.approval_status = approvalStatus;
    
    if (featured !== undefined) {
      query.is_featured = featured === "true";
    }
    
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    const total = await Product.countDocuments();
    const products = await Product.find()
      .populate("category_id", "label")
      .populate("subcategory_id", "label")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({
      success: true,
      products,
      total,
      pages: Math.ceil(total / limit) || 1,
      currentPage: Number(page)
    });
  } catch (error) {
    console.error("List Products Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to retrieve products",
      error: error.message 
    });
  }
};

export const listProducts = async (req, res) => {

  try {

    // 1. Destructure with default values to prevent undefined errors

    const {

      page = 1,

      limit = 10,

      search = "",

      category,

      minPrice,

      maxPrice,

      featured

    } = req.query || {}; // Safety fallback to empty object



    const query = { is_deleted: false };



    // 2. Only build the $or query if search actually has a value

    if (search && search.trim() !== "") {

      query.$or = [

        { name: { $regex: search, $options: "i" } },

        { tags: { $in: [new RegExp(search.trim(), "i")] } }

      ];

    }



    if (category) query.category_id = category;

   

    // 3. Handle boolean conversion strictly

    if (featured !== undefined) {

      query.is_featured = featured === "true";

    }

   

    // 4. Build price range safely

    if (minPrice || maxPrice) {

      query.price = {};

      if (minPrice) query.price.$gte = Number(minPrice);

      if (maxPrice) query.price.$lte = Number(maxPrice);

    }



    // 5. Calculate skip safely

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);



    const total = await Product.countDocuments(query);

    const products = await Product.find({...query,  merchant_id: req.merchant._id,is_deleted: { $ne: true

     }})

      .populate("category_id", "label")

      .populate("subcategory_id", "label")

      .sort({ createdAt: -1 })

      .skip(skip)

      .limit(Number(limit));



    res.json({

      success: true,

      products,

      total,

      pages: Math.ceil(total / limit) || 1,

      currentPage: Number(page)

    });

  } catch (error) {

    console.error("List Products Error:", error);

    res.status(500).json({

      success: false,

      message: "Failed to retrieve products",

      error: error.message

    });

  }

};

// --- Get Single Product Details ---
export const getProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, is_deleted: false })
      .populate("merchant_id", "name email phone")
      .populate("category_id", "label")
      .populate("subcategory_id", "label")
      .populate("approved_by", "name email");

    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching product details" });
  }
};

// --- Update Product (Triggers Re-Verification) ---
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    let updates = { ...req.body };

    if (req.files && req.files.thumbnail) {
      updates.thumbnail = `/uploads/${req.files.thumbnail[0].filename}`;
    }

    if (req.files && req.files.images) {
      updates.images = req.files.images.map(file => `/uploads/${file.filename}`);
    }

    if (updates.category_id && typeof updates.category_id === 'string') {
        updates.category_id = [updates.category_id];
    }
    if (updates.subcategory_id && typeof updates.subcategory_id === 'string') {
        updates.subcategory_id = [updates.subcategory_id];
    }

    // CRITICAL SECURITY FLUX: Reset status to pending upon modifications
    updates.approval_status = "pending";
    updates.approved_by = null;
    updates.approval_date = null;

    const product = await Product.findOneAndUpdate(
      { _id: id, merchant_id: req.merchant._id, is_deleted: false },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: "Product not found or unauthorized to edit" 
      });
    }

    res.json({ 
      success: true, 
      message: "Product updated successfully and resubmitted for admin review", 
      product 
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// --- Soft Delete Product ---
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findOneAndUpdate(
      { _id: id, merchant_id: req.merchant._id },
      { is_deleted: true, is_active: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found or unauthorized" });
    }

    res.json({ success: true, message: "Product moved to trash" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete product" });
  }
};

// --- Featured Toggle ---
export const toggleFeatured = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product || product.is_deleted) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    
    product.is_featured = !product.is_featured;
    await product.save();
    res.json({ success: true, featured: product.is_featured });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to toggle featured status" });
  }
};


// ==========================================
// ADMIN WORKFLOW ENDPOINTS
// ==========================================

// --- List Review Queue Items ---
export const getPendingProductsAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = "pending" } = req.query;

    const filter = { 
      is_deleted: false,
      approval_status: status 
    };

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const total = await Product.countDocuments(filter);
    
    const queueItems = await Product.find(filter)
      .populate("merchant_id", "name email store_name")
      .populate("category_id", "label")
      .populate("subcategory_id", "label")
      .sort({ updatedAt: 1 }) // Review oldest submissions first
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count: queueItems.length,
      total,
      pages: Math.ceil(total / limit) || 1,
      currentPage: Number(page),
      data: queueItems
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Approve or Reject a Product listing ---
export const reviewProductAdmin = async (req, res) => {
  try {
    console.log('hi');
    const { id } = req.params;
    const { status, rejection_reason } = req.body; // status: 'approved' or 'rejected'

    
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid action status evaluation parameter choice." 
      });
    }

    if (status === "rejected" && (!rejection_reason || rejection_reason.trim() === "")) {
      return res.status(400).json({ 
        success: false, 
        message: "You must provide a clear rejection explanation reason for feedback records." 
      });
    }

    const reviewPayload = {
      approval_status: status,
      approved_by: req.superAdmin?._id || req.admin?._id, // Backwards compatible check for your admin objects
      approval_date: new Date(),
      rejection_reason: status === "rejected" ? rejection_reason.trim() : ""
    };

    // If rejected, you might also want to set is_active to false automatically
    if (status === "rejected") {
      reviewPayload.is_active = false;
    }

    const verifiedProduct = await Product.findOneAndUpdate(
      { _id: id, is_deleted: false },
      { $set: reviewPayload },
      { new: true, runValidators: true }
    );

    if (!verifiedProduct) {
      return res.status(404).json({ success: false, message: "Target product listing not found." });
    }

    res.status(200).json({
      success: true,
      message: `Product has been successfully ${status}.`,
      product: verifiedProduct
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};