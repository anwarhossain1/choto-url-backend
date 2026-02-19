import express from "express";
import { logRequest } from "../../middlewares/log/index.js";
import { guestLimiter } from "../../middlewares/rateLimiter.js";
import { trackClick } from "../analytics/service.js";
import {
  createShortLink,
  getLinkByAlias,
  updateLinkClicks,
} from "./service.js";
const router = express.Router();

router.post("/links", guestLimiter, logRequest({}), async (req, res) => {
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

router.get("/:alias", logRequest({}), async (req, res) => {
  const { alias } = req.params;
  try {
    const link = await getLinkByAlias(alias);
    if (!link || !link.isActive) {
      return res.status(404).json({
        message: "Link not found",
        success: false,
      });
    }
    updateLinkClicks(link._id).catch((err) => console.error(err));
    trackClick({ linkId: link._id, alias: link.alias, req }).catch((err) =>
      console.error(err),
    );
    return res.redirect(302, link.longUrl);
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      success: false,
    });
  }
});

export default router;
