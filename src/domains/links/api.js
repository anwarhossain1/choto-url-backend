import express from "express";
import { optionalVerifyAccessToken } from "../../middlewares/auth/optionalVerifyAccessToken.js";
import { logRequest } from "../../middlewares/log/index.js";
import { validateRequest } from "../../middlewares/request-validate/index.js";
import { createLinkSchema } from "./request.js";
import { createShortLink } from "./service.js";
const router = express.Router();

router.post(
  "/links",
  // guestLimiter,
  optionalVerifyAccessToken,
  logRequest({}),
  validateRequest({ schema: createLinkSchema, isParam: false }),
  async (req, res) => {
    try {
      const link = await createShortLink(req, res);
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
  },
);
//

export default router;
