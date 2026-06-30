import express from 'express';
import {getUserCategories} from '../controllers/userHomeController.js'

const router = express.Router();

router.get('/categories',getUserCategories);

export default router;