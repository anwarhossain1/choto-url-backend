import express from "express";
import { verifyAccessToken } from "../../middlewares/auth/verifyAccessToken.js";
import { logRequest } from "../../middlewares/log/index.js";
import { getMyLinks } from "./service.js";

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
export default router;
