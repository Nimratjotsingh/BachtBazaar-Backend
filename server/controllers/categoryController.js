import Category from "../models/categoryModel.js";
import SubCategory from "../models/subCategoryModel.js";
import { validate, ValidationError } from "../validators/validate.js";
import { z } from "zod";
import path from "path";
import fs from "fs";

const categorySchema = z.object({
  value: z.string().min(1, "Category value required"),
  label: z.string().min(1, "Category label required"),
  description: z.string().optional(),
});

const handleValidation = (res, error, defaultMessage) => {
  if (error instanceof ValidationError) {
    return res.status(400).json({ message: error.message });
  }

  console.log(error);
  return res.status(500).json({ message: defaultMessage });
};

// 🔥 Helper → add full image URL
const addImageUrl = (req, doc) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  console.log(baseUrl);

  return {
    ...doc.toObject(),
    image: doc.image ? baseUrl + doc.image : "",
  };
};

// ===============================
// ✅ GET ALL CATEGORIES
// ===============================
export const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true });

    const updated = categories.map((cat) => addImageUrl(req, cat));

    res.json({
      success: true,
      count: updated.length,
      categories: updated,
    });
   
  } catch (error) {

    res.status(500).json({ message: "Failed to fetch categories" });
  }
};

// ===============================
// ✅ GET CATEGORY BY ID
// ===============================
export const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findOne({ _id: id, isActive: true });
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json({
      success: true,
      category: addImageUrl(req, category),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch category" });
  }
};

// ===============================
// ✅ GET SUBCATEGORIES BY CATEGORY
// ===============================
export const getSubcategoriesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const category = await Category.findOne({
      _id: categoryId,
      isActive: true,
    }).select("_id value label");

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const subcategories = await SubCategory.find({
      categoryId,
      isActive: true,
    }).sort({ label: 1 });

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    const updatedSubcategories = subcategories.map((sc) => ({
      ...sc.toObject(),
      image: sc.image ? baseUrl + sc.image : "",
    }));

    return res.json({
      success: true,
      category,
      count: updatedSubcategories.length,
      subcategories: updatedSubcategories,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch subcategories" });
  }
};

// ===============================
// ✅ ADD CATEGORY
// ===============================
export const addCategory = async (req, res) => {
  try {
    const validatedData = validate(categorySchema, req.body);

    const existingCategory = await Category.findOne({
      value: validatedData.value,
    });

    if (existingCategory) {
      return res.status(400).json({ message: "Category already exists" });
    }

    const imagePath = req.file
      ? `/uploads/${req.file.filename}`
      : "";

    const category = await Category.create({
      ...validatedData,
      image: imagePath,
    });

    res.status(201).json({
      success: true,
      message: "Category added successfully",
      category: addImageUrl(req, category),
    });
  } catch (error) {
    return handleValidation(res, error, "Failed to add category");
  }
};

// ===============================
// ✅ UPDATE CATEGORY
// ===============================
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = validate(categorySchema.partial(), req.body);

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (req.file) {
      // 🔥 FIXED PATH (public/uploads)
      if (category.image) {
        const oldPath = path.join(
          process.cwd(),
          "public",
          category.image.replace(/^\/+/, "")
        );

        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      validatedData.image = `/uploads/${req.file.filename}`;
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      validatedData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: "Category updated successfully",
      category: addImageUrl(req, updatedCategory),
    });
  } catch (error) {
    return handleValidation(res, error, "Failed to update category");
  }
};

// ===============================
// ✅ SOFT DELETE
// ===============================
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (category.image) {
      const imgPath = path.join(
        process.cwd(),
        "public",
        category.image.replace(/^\/+/, "")
      );

      if (fs.existsSync(imgPath)) {
        fs.unlinkSync(imgPath);
      }
    }

    category.isActive = false;
    await category.save();

    res.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete category" });
  }
};

// ===============================
// ✅ HARD DELETE
// ===============================
export const hardDeleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (category.image) {
      const imgPath = path.join(
        process.cwd(),
        "public",
        category.image.replace(/^\/+/, "")
      );

      if (fs.existsSync(imgPath)) {
        fs.unlinkSync(imgPath);
      }
    }

    await Category.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Category permanently deleted",
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete category" });
  }
};