import express from "express";
import { guestLimiter } from "../../middlewares/rateLimiter.js";
import { createShortLink } from "./service.js";

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

export default router;
