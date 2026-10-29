import express from "express";
import { staffLogin } from "../../controllers/staff/staffAuthController.js";


const router = express.Router();

// POST /api/staff/login
router.post("/login", staffLogin);



export default router;