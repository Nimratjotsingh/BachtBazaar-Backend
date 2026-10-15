import {Router} from 'express'
import {protectUser,protectMerchant}from '../middleware/authMiddleware.js'
import {recordShopClick,recordOfferClick,recordOfferRedemption, recordOfferRedemptionUserOnly} from '../controllers/shopClickController.js'
const router = Router();

router.get('/shop/:shopId',protectUser,recordShopClick);
router.get('/offer/:offerId',protectUser,recordOfferClick)
router.post('/user/redeem',protectUser,recordOfferRedemptionUserOnly)
router.post('/merchant/redeem',protectMerchant,recordOfferRedemption)

export default router