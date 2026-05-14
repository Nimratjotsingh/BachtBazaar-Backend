import express from "express";
import { 
  createProduct, 
  listProducts, 
  getProduct, 
  updateProduct, 
  deleteProduct, 
  toggleFeatured 
} from "../controllers/productController.js";

// Assuming you have these middleware already created
import { protectMerchant } from "../middleware/authMiddleware.js";
import {protectSuperAdmin} from '../middleware/superAuthMiddleware.js'

const router = express.Router();

router.get("/", protectMerchant,listProducts);


router.get("/:id", getProduct);


router.post("/", protectMerchant, createProduct);


router.put("/:id", protectMerchant, updateProduct);


router.delete("/:id", protectMerchant, deleteProduct);


router.patch("/:id/featured", protectSuperAdmin, toggleFeatured);

export default router;