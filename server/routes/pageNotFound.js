const express = require("express");
const router = express.Router();

router.all("*", (req, res) => res.json({ message: "Page not found ! ❌" }));

module.exports = router;
