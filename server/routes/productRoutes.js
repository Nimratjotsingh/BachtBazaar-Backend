import express from "express";
import { 
  createProduct, 
  listProducts, 
  getProduct, 
  updateProduct, 
  deleteProduct, 
  toggleFeatured,
  getPendingProductsAdmin,
  reviewProductAdmin,
  listProductsAll
} from "../controllers/productController.js";

// Assuming you have these middleware already created
import { protectMerchant } from "../middleware/authMiddleware.js";
import {protectSuperAdmin} from '../middleware/superAuthMiddleware.js';
import upload from '../middleware/uploadSec.js'
import { createProductSuggestion, getProductSuggestionsForMerchant } from "../controllers/productSuggestionController.js";

const router = express.Router();

router.get("/", protectMerchant,listProducts);

router.get('/all',listProductsAll)

router.get("/review-queue", protectSuperAdmin, getPendingProductsAdmin);
router.patch("/:id/review", protectSuperAdmin, reviewProductAdmin);

router.get("/suggestions", protectMerchant, getProductSuggestionsForMerchant);

router.get("/:id", getProduct);



// Admin creates suggestion template
router.post(
  "/suggestions",
  protectSuperAdmin,
  upload.fields([{ name: "thumbnail", maxCount: 1 }, { name: "images", maxCount: 10 }]),
  createProductSuggestion
);

// Merchant creates product (checks suggestion_id for auto-approval)





router.post("/", protectMerchant, 
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "images", maxCount: 10 }
  ]),createProduct);


router.put("/:id", protectMerchant, upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "images", maxCount: 10 }
  ]),updateProduct);


router.delete("/:id", protectMerchant, deleteProduct);

router.patch("/:id/featured", protectSuperAdmin, toggleFeatured);


router.patch("/:id/featured", protectSuperAdmin, toggleFeatured);

export default router;