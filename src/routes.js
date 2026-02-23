import express from "express";
import authRoutes from "./domains/auth/api.js";
import linkRoutes from "./domains/links/api.js";
const router = express.Router();

router.get("/", (req, res) => {
  res.send("Welcome to the Choto URL Service!");
});

router.use(linkRoutes);
router.use(authRoutes);

export default router;
