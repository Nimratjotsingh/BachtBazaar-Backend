import {getStaffProfile} from '../../controllers/staff/staffProfileController.js';
import {Router} from 'express';
import {protectStaff} from '../../middleware/staffAuthMiddleware.js'
const router = Router();

router.get("/", protectStaff, getStaffProfile);

export default router