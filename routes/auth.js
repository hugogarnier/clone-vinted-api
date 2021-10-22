const express = require("express");
const router = express.Router();
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");
const cloudinary = require("cloudinary").v2;

// import User model
const User = require("../models/User");

router.post("/user/signup", async (req, res) => {
  try {
    // check email and username
    const email = req.fields.email;
    const username = req.fields.username;

    if (!email || !email.includes("@") || !username || username.length < 5) {
      res.status(400).json({
        message: "Email or username invalid",
        email: "Email must have a @ and not be empty",
        username: "Username cannot be empty and at least 5 characters",
      });
    } else {
      const userExists = await User.findOne({ email: email });
      if (userExists) {
        res.status(400).json({ message: `User ${email} already exists` });
      } else {
        const password = req.fields.password;
        const salt = uid2(16);
        const hash = SHA256(password + salt).toString(encBase64);
        const token = uid2(16);

        const newUser = new User({
          email: email,
          account: {
            username: username,
            phone: req.fields.phone,
          },
          token: token,
          hash: hash,
          salt: salt,
        });

        // cloudinary upload

        try {
          let pictureToUpload = req.files.picture.path;
          const result = await cloudinary.uploader.upload(pictureToUpload, {
            folder: `/vinted/user/${newUser.id}`,
          });
          newUser.account.avatar = result;
          await newUser.save();
          res.json({
            message: "Account created 🔥",
            _id: newUser.id,
            token: newUser.token,
            email: newUser.email,
            account: newUser.account,
          });
        } catch (error) {
          res.json({ error: error.message });
        }
      }
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/user/login", async (req, res) => {
  try {
    // check email and username
    const email = req.fields.email;
    const password = req.fields.password;

    if (!email || !email.includes("@") || !password) {
      res.status(401).json({
        message: "Unauthorized",
      });
    } else {
      const user = await User.findOne({ email: email });
      if (!user) {
        res.status(400).json({ message: `User ${email} not found 😰` });
      } else {
        const hash = SHA256(password + user.salt).toString(encBase64);
        const token = uid2(16);

        if (hash !== user.hash) {
          res.status(401).json({
            message: `Wrong password, you are not authorized to login 😡`,
          });
        } else {
          user.token = token;
          await user.save();
          res.json({
            message: "Login successful 👋",
            _id: user._id,
            token: user.token,
            email: user.email,
            account: user.account,
          });
        }
      }
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
