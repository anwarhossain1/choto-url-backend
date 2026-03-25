import express from "express";
import { verifyAdminAccessToken } from "../../../middlewares/auth/verifyAdminAccessToken.js";
import { logRequest } from "../../../middlewares/log/index.js";
import { getAdminDashboardStats } from "./service.js";

const router = express.Router();
router.get(
  "/dashboard",
  verifyAdminAccessToken,
  logRequest({}),
  async (req, res) => {
    try {
      const stats = await getAdminDashboardStats();
      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch dashboard stats",
      });
    }
  },
);
export default router;
