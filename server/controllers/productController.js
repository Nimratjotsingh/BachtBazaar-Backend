import Product from "../models/productModel.js";
import { validate } from "../validators/validate.js"; // Assuming you have a validation helper
import { productSchema } from "../validators/productValidator.js";

// --- Create Product ---
export const createProduct = async (req, res) => {
  try {
    const data = req.body;
    console.log(data)
    
 
    const newProduct = new Product({
      ...data,
      merchant_id: req.merchant._id 
    });

    await newProduct.save();
    res.status(201).json({ success: true, message: "Product listed successfully", product: newProduct });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
    console.log(error)
 
  }
};

// --- List All Products (with Filters & Search) ---
export const listProducts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      category, 
      minPrice, 
      maxPrice, 
      featured 
    } = req.query;

    const query = { is_deleted: false };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } }
      ];
    }

    if (category) query.category_id = category;
    if (featured) query.is_featured = featured === "true";
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate("category_id", "label")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      products,
      total,
      pages: Math.ceil(total / limit),
      currentPage: Number(page)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to retrieve products" });
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
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Logic: Find and update, ensuring the merchant owns this product
    const product = await Product.findOneAndUpdate(
      { _id: id, merchant_id: req.user._id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found or unauthorized" });
    }

    res.json({ success: true, message: "Product updated", product });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// --- Soft Delete Product ---
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // We do a soft delete to preserve order history/analytics
    const product = await Product.findOneAndUpdate(
      { _id: id, merchant_id: req.user._id },
      { is_deleted: true, is_active: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found or unauthorized" });
    }

    res.json({ success: true, message: "Product moved to trash" });
  } catch (error) {
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