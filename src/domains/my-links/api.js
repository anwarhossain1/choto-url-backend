import express from "express";
import { verifyAccessToken } from "../../middlewares/auth/verifyAccessToken.js";

const router = express.Router();
router.get("/my-links", verifyAccessToken, async (req, res) => {
  console.log("ga", req);
});
export default router;
