import express from "express";
import { verifyAccessToken } from "../../middlewares/auth/verifyAccessToken.js";
import { getProfileData } from "./service.js";

const router = express.Router();
router.get("/my-profile", verifyAccessToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const profileData = await getProfileData(userId);
    return res.status(200).json({
      message: true,
      data: profileData,
    });
  } catch (error) {
    res.status(500).json({
      mess,
    });
  }
});
export default router;
