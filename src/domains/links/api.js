import express from "express";
import { guestLimiter } from "../../middlewares/rateLimiter.js";
import { trackClick } from "../analytics/service.js";
import {
  createShortLink,
  getLinkByAlias,
  updateLinkClicks,
} from "./service.js";

const router = express.Router();

router.post("/links", guestLimiter, async (req, res) => {
  try {
    const link = await createShortLink(req.body);
    if (link) {
      return res.status(201).json({
        message: "Link created successfully",
        success: true,
        status: 201,
        data: link,
      });
    }
  } catch (error) {
    res.status(400).json({
      message: error.message,
      success: false,
    });
  }
});

router.get("/:alias", async (req, res) => {
  const { alias } = req.params;
  try {
    const link = await getLinkByAlias(alias);
    if (!link || !link.isActive) {
      return res.status(404).json({
        message: "Link not found",
        success: false,
      });
    }
    // res.redirect(301, link.longUrl);

    await updateLinkClicks(link._id);
    trackClick({ linkId: link._id, alias: link.alias, req });

    return res.status(200).json({
      message: "Link retrieved successfully",
    });
  } catch (error) {}
});

export default router;
