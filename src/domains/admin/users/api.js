import express from "express";
import mongoose from "mongoose";
import { verifyAdminAccessToken } from "../../../middlewares/auth/verifyAdminAccessToken.js";
import { logRequest } from "../../../middlewares/log/index.js";
import Link from "../../links/schema.js";
import Click from "../../analytics/schema.js";
import { getAllUsers, getUserById, getUserLinks } from "./service.js";

const router = express.Router();
router.get(
  "/users",
  verifyAdminAccessToken,
  logRequest({}),
  async (req, res) => {
    try {
      const { users, pagination } = await getAllUsers(req.query);
      return res.status(200).json({
        success: true,
        message: "Users fetched successfully",
        data: users,
        pagination,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch users",
      });
    }
  },
);

router.get(
  "/users/:id",
  verifyAdminAccessToken,
  logRequest({}),
  async (req, res) => {
    try {
      const user = await getUserById(req.params.id);
      return res.status(200).json({
        success: true,
        message: "User fetched successfully",
        data: user,
      });
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: error.message || "User not found",
      });
    }
  },
);

router.get(
  "/users/:id/links",
  verifyAdminAccessToken,
  logRequest({}),
  async (req, res) => {
    try {
      const links = await getUserLinks(req.params.id);
      return res.status(200).json({
        success: true,
        message: "User links fetched successfully",
        data: links,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch user links",
      });
    }
  },
);

router.get(
  "/users/:userId/links/:linkId/analytics",
  verifyAdminAccessToken,
  logRequest({}),
  async (req, res) => {
    try {
      const { linkId, userId } = req.params;
      const days = parseInt(req.query.days) || 30;

      if (!mongoose.Types.ObjectId.isValid(linkId)) {
        return res.status(400).json({ success: false, message: "Invalid link ID" });
      }

      const link = await Link.findOne({ _id: linkId, userId }).lean();
      if (!link) {
        return res.status(404).json({ success: false, message: "Link not found" });
      }

      const start = new Date();
      start.setDate(start.getDate() - days);

      const totalClicks = await Click.countDocuments({
        linkId,
        createdAt: { $gte: start },
      });

      const uniqueClicks = await Click.distinct("ip", {
        linkId,
        createdAt: { $gte: start },
      });

      const dailyPipeline = [
        { $match: { linkId, createdAt: { $gte: start } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            clicks: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            date: "$_id",
            clicks: 1,
            _id: 0,
          },
        },
      ];

      const dailyStats = await Click.aggregate(dailyPipeline);

      return res.status(200).json({
        success: true,
        data: {
          link: {
            _id: link._id,
            alias: link.alias,
            shortUrl: link.shortUrl,
            longUrl: link.longUrl,
            clicks: link.clicks,
            isEnabledForReport: link.isEnabledForReport,
            createdAt: link.createdAt,
          },
          analytics: {
            totalClicks,
            uniqueClicks: uniqueClicks.length,
            dailyStats,
          },
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch link analytics",
      });
    }
  },
);

export default router;
