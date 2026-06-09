import express from "express";
import { getAllShops, getShopDetails, searchGlobalCatalog,getActiveUserOffers } from "../controllers/userHomeController.js";

const router = express.Router();

/**
 * @route   GET /api/shops
 * @desc    Get all merchant shops (Paginated)
 * @access  Public
 */
router.get("/", getAllShops);

router.get("/search", searchGlobalCatalog);

router.get("/offers", getActiveUserOffers);

/**
 * @route   GET /api/shops/:id
 * @desc    Get full details of a specific shop
 * @access  Public
 */
router.get("/:id", getShopDetails);

export default router;