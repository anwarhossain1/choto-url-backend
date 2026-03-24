import express from "express";
import { verifyAccessToken } from "../../middlewares/auth/verifyAccessToken.js";
import { logRequest } from "../../middlewares/log/index.js";
import {
  getMyLinks,
  hardDeleteLink,
  restoreLink,
  softDeleteLink,
} from "./service.js";

const router = express.Router();
router.get(
  "/my-links",
  logRequest({}),
  verifyAccessToken,
  async (req, res, next) => {
    const { page, limit } = req.query;
    if (!page || !limit) {
      return res.status(400).json({
        success: false,
        message: "Page and limit are required",
      });
    }
    try {
      const myLinksResponse = await getMyLinks(req);
      if (myLinksResponse) {
        return res.status(201).json({
          success: true,
          ...myLinksResponse,
        });
      }
    } catch (error) {
      res.status(500).json({
        message: error.message,
        success: false,
      });
    }
  },
);
router.delete(
  "/my-links/:id",
  logRequest({}),
  verifyAccessToken,
  async (req, res) => {
    const { id } = req.params;
    const { hard } = req.query;
    try {
      let result;
      if (hard === "true") {
        result = await hardDeleteLink(req.user._id, id);
      } else {
        result = await softDeleteLink(req.user._id, id);
      }

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: error.message || "Something went wrong",
      });
    }
  },
);

/**
 * POST /links/:id/restore
 * Restore a soft-deleted link
 */
router.post(
  "/:id/restore",
  logRequest({}),
  verifyAccessToken,
  async (req, res) => {
    const { id } = req.params;

    try {
      const result = await restoreLink(req.user._id, id);
      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: error.message || "Something went wrong",
      });
    }
  },
);
export default router;
