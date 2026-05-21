import express from "express";
import { verifyAccessToken } from "../../middlewares/auth/verifyAccessToken.js";
import { logRequest } from "../../middlewares/log/index.js";
import User from "../auth/schema.js";
import {
  buildAnalyticsCsv,
  createAnalyticsPdf,
  getAnalyticsExportData,
  getAnalyticsOverview,
  getBestPerformingLinks,
  getLinkAnalyticsOverview,
} from "./service.js";

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

router.get(
  "/my-analytics/export",
  logRequest({}),
  verifyAccessToken,
  async (req, res, next) => {
    try {
      const { days = 7, format = "csv" } = req.query;
      const userId = req.user.userId;
      const normalizedFormat = String(format).toLowerCase();

      if (!["csv", "pdf"].includes(normalizedFormat)) {
        return res.status(400).json({
          success: false,
          message: "Invalid export format",
        });
      }

      const user = await User.findById(userId).select("subscription.plan");
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (user.subscription?.plan === "free") {
        return res.status(403).json({
          success: false,
          message: "Report download is available on paid plans only. Please upgrade your plan.",
        });
      }

      const exportData = await getAnalyticsExportData(userId, Number(days));
      const fileBase = `choto-url-report-${exportData.periodDays}d`;

      if (normalizedFormat === "csv") {
        const csv = buildAnalyticsCsv(exportData);

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${fileBase}.csv"`);

        return res.status(200).send(`\ufeff${csv}`);
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${fileBase}.pdf"`);

      return createAnalyticsPdf(res, exportData);
    } catch (error) {
      next(error);
    }
  },
);
router.get(
  "/my-analytics/top-links",
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

router.get(
  "/my-analytics/links/:linkId",
  logRequest({}),
  verifyAccessToken,
  async (req, res, next) => {
    try {
      const { linkId } = req.params;
      const { days } = req.query;
      const userId = req.user.userId;

      const analytics = await getLinkAnalyticsOverview(userId, linkId, Number(days));

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
