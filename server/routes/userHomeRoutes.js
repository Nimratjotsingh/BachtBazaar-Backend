import express from "express";
import { getAllShops, getShopDetails, searchGlobalCatalog,getActiveUserOffers, getOfferDetails, getCityBannerOffers, getOffersByStoreId, getAllOffers, getCityBannerOffers2, getNearbyShops15KmForUser, getNearbyBannersForUser, getNearbyCalendarOffersForUser } from "../controllers/userHomeController.js";

import {protectUser} from '../middleware/authMiddleware.js'
const router = express.Router();

/**
 * @route   GET /api/shops
 * @desc    Get all merchant shops (Paginated)
 * @access  Public
*/
router.get("/", getAllShops);

router.get('/all', protectUser,getNearbyShops15KmForUser)

router.get("/search", searchGlobalCatalog);

router.get("/offers", getActiveUserOffers);

router.get("/offers/store-details/:storeId", getOffersByStoreId);


router.get("/offers/banners", protectUser,getNearbyBannersForUser);
router.get('/offers/banners2',protectUser,getNearbyBannersForUser);

router.get("/offers/calender",protectUser,getNearbyCalendarOffersForUser);

router.get("/offers/:id", getOfferDetails);



/**
 * @route   GET /api/shops/:id
 * @desc    Get full details of a specific shop
 * @access  Public
 */
router.get("/:id", getShopDetails);

export default router;