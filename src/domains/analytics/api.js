import express from "express";
import { verifyAccessToken } from "../../middlewares/auth/verifyAccessToken.js";
import { logRequest } from "../../middlewares/log/index.js";
import { getAnalyticsOverview } from "./service.js";

const router = express.Router();

router.get(
  "/my-analytics",
  logRequest({}),
  verifyAccessToken,
  async (req, res, next) => {
    try {
      const { days } = req.query;
      const userId = req.user.userId;

      const analytics = await getAnalyticsOverview(userId, Number(days));

      return res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  },
);
export default router;
