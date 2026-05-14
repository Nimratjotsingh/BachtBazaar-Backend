import SubCategory from "../models/subCategoryModel.js";
import Category from "../models/categoryModel.js";
import { validate, ValidationError } from "../validators/validate.js";
import { z } from "zod";
import path from "path";
import fs from "fs";

const subCategorySchema = z.object({
  value: z.string().min(1, "Value required"),
  label: z.string().min(1, "Label required"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "CategoryId required"),
});

const handleValidation = (res, error, defaultMessage) => {
  if (error instanceof ValidationError) {
    return res.status(400).json({ message: error.message });
  }
  console.log(error);
  return res.status(500).json({ message: defaultMessage });
};

// 🔥 Helper → full image URL
const addImageUrl = (req, doc) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;

  return {
    ...doc.toObject(),
    image: doc.image ? baseUrl + doc.image : "",
  };
};

// ===============================
// ✅ GET ALL
// ===============================
export const getAllSubCategories = async (req, res) => {
  try {
    const subCategories = await SubCategory.find({ isActive: true })
      .populate("categoryId", "value label")
      .sort({ createdAt: -1 });

    const updated = subCategories.map((sc) => addImageUrl(req, sc));

    res.json({
      success: true,
      count: updated.length,
      subCategories: updated,
    });
    
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch subcategories" });
  }
};

// ===============================
// ✅ GET BY ID
// ===============================
export const getSubCategoryById = async (req, res) => {
  try {
    const subCategory = await SubCategory.findById(req.params.id)
      .populate("categoryId", "value label");

    if (!subCategory || !subCategory.isActive) {
      return res.status(404).json({ message: "SubCategory not found" });
    }

    res.json({
      success: true,
      subCategory: addImageUrl(req, subCategory),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch subcategory" });
  }
};

// ===============================
// ✅ CREATE
// ===============================
export const addSubCategory = async (req, res) => {
  try {
    const validatedData =  req.body;

    const category = await Category.findById(validatedData.categoryId);
    if (!category) {
      return res.status(400).json({ message: "Invalid categoryId" });
    }

    const existing = await SubCategory.findOne({
      value: validatedData.value,
      categoryId: validatedData.categoryId,
    });

    if (existing) {
      return res.status(400).json({ message: "SubCategory already exists" });
    }

    const imagePath = req.file
      ? `/uploads/${req.file.filename}`
      : "";

    const subCategory = await SubCategory.create({
      ...validatedData,
      image: imagePath,
    });

    res.status(201).json({
      success: true,
      message: "SubCategory created successfully",
      subCategory: addImageUrl(req, subCategory),
    });
  } catch (error) {
    return handleValidation(res, error, "Failed to create subcategory");
  }
};

// ===============================
// ✅ UPDATE
// ===============================
export const updateSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData =  req.body;

    const subCategory = await SubCategory.findById(id);
    if (!subCategory) {
      return res.status(404).json({ message: "SubCategory not found" });
    }

    // 🔥 FIXED IMAGE DELETE PATH
    if (req.file) {
      if (subCategory.image) {
        const oldPath = path.join(
          process.cwd(),
          "public",
          subCategory.image.replace(/^\/+/, "")
        );

        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      validatedData.image = `/uploads/${req.file.filename}`;
    }

    const updated = await SubCategory.findByIdAndUpdate(
      id,
      validatedData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: "SubCategory updated successfully",
      subCategory: addImageUrl(req, updated),
    });
  } catch (error) {
    return handleValidation(res, error, "Failed to update subcategory");
  }
};

// ===============================
// ✅ SOFT DELETE
// ===============================
export const deleteSubCategory = async (req, res) => {
  try {
    const subCategory = await SubCategory.findById(req.params.id);

    if (!subCategory) {
      return res.status(404).json({ message: "SubCategory not found" });
    }

    if (subCategory.image) {
      const imgPath = path.join(
        process.cwd(),
        "public",
        subCategory.image.replace(/^\/+/, "")
      );

      if (fs.existsSync(imgPath)) {
        fs.unlinkSync(imgPath);
      }
    }

    subCategory.isActive = false;
    await subCategory.save();

    res.json({
      success: true,
      message: "SubCategory deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete subcategory" });
  }
};

// ===============================
// ✅ HARD DELETE
// ===============================
export const hardDeleteSubCategory = async (req, res) => {
  try {
    const subCategory = await SubCategory.findById(req.params.id);

    if (!subCategory) {
      return res.status(404).json({ message: "SubCategory not found" });
    }

    if (subCategory.image) {
      const imgPath = path.join(
        process.cwd(),
        "public",
        subCategory.image.replace(/^\/+/, "")
      );

      if (fs.existsSync(imgPath)) {
        fs.unlinkSync(imgPath);
      }
    }

    await SubCategory.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "SubCategory permanently deleted",
    });

  } catch (error) {
    res.status(500).json({ message: "Failed to delete subcategory" });
  }
};