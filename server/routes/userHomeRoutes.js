import express from "express";
import { getAllShops, getShopDetails, searchGlobalCatalog,getActiveUserOffers, getOfferDetails, getCityBannerOffers, getOffersByStoreId, getAllOffers } from "../controllers/userHomeController.js";

const router = express.Router();

/**
 * @route   GET /api/shops
 * @desc    Get all merchant shops (Paginated)
 * @access  Public
*/
router.get("/", getAllShops);

router.get("/search", searchGlobalCatalog);

router.get("/offers", getActiveUserOffers);

router.get("/offers/store-details/:storeId", getOffersByStoreId);


router.get("/offers/banners", getCityBannerOffers);

router.get("/offers/:id", getOfferDetails);


/**
 * @route   GET /api/shops/:id
 * @desc    Get full details of a specific shop
 * @access  Public
 */
router.get("/:id", getShopDetails);

export default router;