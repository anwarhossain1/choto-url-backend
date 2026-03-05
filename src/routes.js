import express from "express";
import myAnalyticsRoutes from "./domains/analytics/api.js";
import authRoutes from "./domains/auth/api.js";
import linkRoutes from "./domains/links/api.js";
import myLinksRoutes from "./domains/my-links/api.js";
import myProfileRoutes from "./domains/my-profile/api.js";
const router = express.Router();

router.get("/", (req, res) => {
  res.send("Welcome to the Choto URL Service!");
});

router.use(linkRoutes);
router.use(authRoutes);
router.use(myLinksRoutes);
router.use(myProfileRoutes);
router.use(myAnalyticsRoutes);

export default router;
