import Category from "../models/categoryModel.js";
import SubCategory from "../models/subCategoryModel.js";
import { validate, ValidationError } from "../validators/validate.js";
import { z } from "zod";

const categorySchema = z.object({
  value: z.string().min(1, "Category value required"),
  label: z.string().min(1, "Category label required"),
  description: z.string().optional()
});

const handleValidation = (res, error, defaultMessage) => {
  if (error instanceof ValidationError) {
    return res.status(400).json({ message: error.message });
  }

  console.log(error);
  return res.status(500).json({ message: defaultMessage });
};

// Get all categories
export const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true });
    res.json({
      success: true,
      count: categories.length,
      categories
    });
  } catch (error) {
    console.error("Error fetching categories:", error.message);
    res.status(500).json({ message: "Failed to fetch categories" });
  }
};

// Get category by ID
export const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json({
      success: true,
      category
    });
  } catch (error) {
    console.error("Error fetching category:", error.message);
    res.status(500).json({ message: "Failed to fetch category" });
  }
};

// Get subcategories by categoryId
export const getSubcategoriesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const category = await Category.findById(categoryId).select("_id value label");
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const subcategories = await SubCategory.find({
      categoryId,
      isActive: true
    }).sort({ label: 1 });

    return res.json({
      success: true,
      category,
      count: subcategories.length,
      subcategories
    });
  } catch (error) {
    console.error("Error fetching subcategories:", error.message);
    return res.status(500).json({ message: "Failed to fetch subcategories" });
  }
};

// Add new category
export const addCategory = async (req, res) => {
  try {
    const validatedData = validate(categorySchema, req.body);

    const existingCategory = await Category.findOne({ value: validatedData.value });
    if (existingCategory) {
      return res.status(400).json({ message: "Category already exists" });
    }

    const category = await Category.create(validatedData);

    res.status(201).json({
      success: true,
      message: "Category added successfully",
      category
    });
  } catch (error) {
    return handleValidation(res, error, "Failed to add category");
  }
};

// Update category
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = validate(categorySchema.partial(), req.body);

    const category = await Category.findByIdAndUpdate(
      id,
      validatedData,
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json({
      success: true,
      message: "Category updated successfully",
      category
    });
  } catch (error) {
    return handleValidation(res, error, "Failed to update category");
  }
};

// Delete category (soft delete - set isActive to false)
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json({
      success: true,
      message: "Category deleted successfully",
      category
    });
  } catch (error) {
    console.error("Error deleting category:", error.message);
    res.status(500).json({ message: "Failed to delete category" });
  }
};

// Hard delete category
export const hardDeleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json({
      success: true,
      message: "Category permanently deleted",
      category
    });
  } catch (error) {
    console.error("Error permanently deleting category:", error.message);
    res.status(500).json({ message: "Failed to delete category" });
  }
};
