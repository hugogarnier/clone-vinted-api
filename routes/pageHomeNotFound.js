const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  try {
    res.json({
      message: "API up and running 🦾",
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
router.all("*", (req, res) => res.json({ message: "Page not found ! ❌" }));

module.exports = router;
