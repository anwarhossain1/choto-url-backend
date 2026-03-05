import express from "express";
import { verifyAccessToken } from "../../middlewares/auth/verifyAccessToken.js";
import { logRequest } from "../../middlewares/log/index.js";
import { getAnalyticsOverview, getBestPerformingLinks } from "./service.js";

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

router.get(
  "/my-analytics/best-links",
  logRequest({}),
  verifyAccessToken,
  async (req, res, next) => {
    try {
      const userId = req.user.userId;

      // Example subscription logic
      const subscriptionLimits = {
        free: 3,
        pro: 10,
        enterprise: 20,
      };

      const userPlan = req.user.plan || "free";

      const limit = subscriptionLimits[userPlan];

      const bestLinks = await getBestPerformingLinks(userId, limit);

      return res.json({
        success: true,
        data: bestLinks,
      });
    } catch (error) {
      next(error);
    }
  },
);
