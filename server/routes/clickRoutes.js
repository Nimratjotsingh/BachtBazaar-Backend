import {Router} from 'express'
import {protectUser,protectMerchant}from '../middleware/authMiddleware.js'
import {recordShopClick,recordOfferClick,recordOfferRedemption} from '../controllers/shopClickController.js'
const router = Router();

router.get('/shop/:shopId',protectUser,recordShopClick);
router.get('/offer/:offerId',protectUser,recordOfferClick)
router.post('/user/redeem',protectUser,recordOfferRedemption)
router.post('/merchant/redeem',protectMerchant,recordOfferRedemption)

export default router