import express from "express";
const router = express.Router();

router.get("/", (req, res) => {
  res.send("Welcome to the Choto URL Service!");
});

export default router;
