import express from "express";
import { env } from "../../config/env.js";
import { logRequest } from "../../middlewares/log/index.js";
import { burstLimiter } from "../../middlewares/rateLimiter.js";
import { validateRequest } from "../../middlewares/request-validate/index.js";
import { trackClick } from "../analytics/service.js";
import { aliasSchema } from "./request.js";
import { getLinkByAlias, updateLinkClicks } from "./service.js";
const router = express.Router();

router.get(
  "/r/:alias",
  logRequest({}),
  burstLimiter,
  validateRequest({ schema: aliasSchema, isParam: true }),
  async (req, res) => {
    const { alias } = req.params;
    try {
      const link = await getLinkByAlias(alias);
      if (!link || !link.isActive || link.isDeleted) {
        return res.redirect(302, `${env.frontendUrl}/404`);
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
  },
);

export default router;
