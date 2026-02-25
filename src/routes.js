import express from "express";
import authRoutes from "./domains/auth/api.js";
import linkRoutes from "./domains/links/api.js";
import myLinksRoutes from "./domains/my-links/api.js";
const router = express.Router();

router.get("/", (req, res) => {
  res.send("Welcome to the Choto URL Service!");
});

router.use(linkRoutes);
router.use(authRoutes);
router.use(myLinksRoutes);

export default router;
