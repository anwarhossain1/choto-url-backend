import express from "express";
import { verifyAccessToken } from "../../middlewares/auth/verifyAccessToken.js";
import { verifyAdminAccessToken } from "../../middlewares/auth/verifyAdminAccessToken.js";
import { logRequest } from "../../middlewares/log/index.js";
import { validateRequest } from "../../middlewares/request-validate/index.js";
import { createReviewSchema, reviewIdParamSchema } from "./request.js";
import {
  featureReview,
  getAdminReviews,
  getFeaturedReviews,
  getMyReviews,
  submitReview,
  unfeatureReview,
} from "./service.js";

const router = express.Router();

router.get("/reviews/featured", async (req, res) => {
  try {
    const reviews = await getFeaturedReviews();

    return res.status(200).json({
      success: true,
      data: reviews,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch featured reviews",
      data: [],
    });
  }
});

router.post(
  "/reviews",
  verifyAccessToken,
  logRequest({}),
  validateRequest({ schema: createReviewSchema, isParam: false }),
  async (req, res) => {
    try {
      const review = await submitReview(req);

      return res.status(201).json({
        success: true,
        message: "Review submitted successfully",
        data: review,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to submit review",
      });
    }
  },
);

router.get("/my-reviews", verifyAccessToken, logRequest({}), async (req, res) => {
  return getMyReviews(req, res);
});

router.get(
  "/admin/reviews",
  verifyAdminAccessToken,
  logRequest({}),
  async (req, res) => getAdminReviews(req, res),
);

router.patch(
  "/admin/reviews/:id/feature",
  verifyAdminAccessToken,
  logRequest({}),
  validateRequest({ schema: reviewIdParamSchema, isParam: true }),
  async (req, res) => featureReview(req, res),
);

router.patch(
  "/admin/reviews/:id/unfeature",
  verifyAdminAccessToken,
  logRequest({}),
  validateRequest({ schema: reviewIdParamSchema, isParam: true }),
  async (req, res) => unfeatureReview(req, res),
);

export default router;
