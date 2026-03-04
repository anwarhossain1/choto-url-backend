import express from "express";
import { verifyAccessToken } from "../../middlewares/auth/verifyAccessToken.js";
import { validateRequest } from "../../middlewares/request-validate/index.js";
import {
  changeEmailSchema,
  changeNameSchema,
  changePasswordSchema,
} from "./request.js";
import {
  changeEmail,
  changePassword,
  changeUserName,
  getProfileData,
} from "./service.js";

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
router.patch(
  "/my-profile/change-name",
  verifyAccessToken,
  validateRequest({ schema: changeNameSchema, isParam: false }),
  changeUserName,
);
router.patch(
  "/my-profile/change-email",
  verifyAccessToken,
  validateRequest({ schema: changeEmailSchema, isParam: false }),
  changeEmail,
);
router.patch(
  "/my-profile/change-password",
  verifyAccessToken,
  validateRequest({ schema: changePasswordSchema, isParam: false }),
  changePassword,
);
export default router;
