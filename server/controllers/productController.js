import Product from "../models/productModel.js";
import { validate } from "../validators/validate.js"; // Assuming you have a validation helper
import { productSchema } from "../validators/productValidator.js";

// --- Create Product ---
// controllers/productController.js
export const createProduct = async (req, res) => {
  try {
    const data = req.body;

    // 1. Handle Thumbnail
    if (req.files && req.files.thumbnail) {
      // Save the relative path for the database
      data.thumbnail = `/uploads/${req.files.thumbnail[0].filename}`;
    }

    // 2. Handle Image Array
    if (req.files && req.files.images) {
      data.images = req.files.images.map(file => `/uploads/${file.filename}`);
    }

    // 3. Manual validation for categories (Multer sends arrays as strings/individual items sometimes)
    // Ensure category_id and subcategory_id are arrays
    if (typeof data.category_id === 'string') data.category_id = [data.category_id];
    if (typeof data.subcategory_id === 'string') data.subcategory_id = [data.subcategory_id];

    const newProduct = new Product({
      ...data,
      merchant_id: req.merchant._id 
    });

    await newProduct.save();
    
    res.status(201).json({ 
      success: true, 
      message: "Product listed successfully", 
      product: newProduct 
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// --- List All Products (with Filters & Search) ---
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

// --- Get Single Product ---
export const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("merchant_id", "name email phone");

    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ message: "Error fetching product details" });
  }
};

// --- Update Product ---
// controllers/productController.js


export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    let updates = { ...req.body };

    // 1. Handle New Thumbnail Upload
    if (req.files && req.files.thumbnail) {
      updates.thumbnail = `/uploads/${req.files.thumbnail[0].filename}`;
    }

    // 2. Handle New Gallery Images Upload
    if (req.files && req.files.images) {
      const newImagePaths = req.files.images.map(file => `/uploads/${file.filename}`);
      
      // OPTIONAL: Decide if you want to REPLACE all images or APPEND them
      // To REPLACE:
      updates.images = newImagePaths;
      
      // To APPEND to existing images (requires fetching current product first):
      // const currentProduct = await Product.findById(id);
      // updates.images = [...currentProduct.images, ...newImagePaths];
    }

    // 3. Fix Multi-select arrays (Multer issues)
    if (updates.category_id && typeof updates.category_id === 'string') {
        updates.category_id = [updates.category_id];
    }
    if (updates.subcategory_id && typeof updates.subcategory_id === 'string') {
        updates.subcategory_id = [updates.subcategory_id];
    }

    // 4. Perform Update
    const product = await Product.findOneAndUpdate(
      { _id: id, merchant_id: req.merchant._id },
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
      message: "Product updated successfully", 
      product 
    });

  } catch (error) {
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// --- Soft Delete Product ---
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // We do a soft delete to preserve order history/analytics
    const product = await Product.findOneAndUpdate(
      { _id: id, merchant_id: req.merchant._id },
      { is_deleted: true, is_active: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found or unauthorized" });
    }

    res.json({ success: true, message: "Product moved to trash" });
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: "Failed to delete product" });
  }
};

// --- Featured Toggle (Admin/Merchant Utility) ---
export const toggleFeatured = async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      product.is_featured = !product.is_featured;
      await product.save();
      res.json({ success: true, featured: product.is_featured });
    } catch (error) {
      res.status(500).json({ message: "Failed to toggle featured status" });
    }
};