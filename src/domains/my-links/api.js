import express from "express";
import { verifyAccessToken } from "../../middlewares/auth/verifyAccessToken.js";
import { getMyLinks } from "./service.js";

const router = express.Router();
router.get("/my-links", verifyAccessToken, async (req, res) => {
  try {
    const myLinks = await getMyLinks(req);
    if (myLinks) {
      return res.status(201).json({
        data: myLinks,
      });
    }
  } catch (error) {
    res.status(500).json({
      message: error.message,
      success: false,
    });
  }
});
export default router;
