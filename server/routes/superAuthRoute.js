import express from 'express';
const router = express.Router();
import {loginSuperAdmin} from '../controllers/superAdminAuth.js'

router.post('/login',loginSuperAdmin);


export default router;