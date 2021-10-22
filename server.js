require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
const cors = require("cors");

// middleware import
const middlewawreFormidable = require("express-formidable");

const app = express();
app.use(middlewawreFormidable());
app.use(cors());

// init cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// import routes - last one if page not found
const authRoutes = require("./routes/auth");
const offerRoutes = require("./routes/offer");
const pageNotFoundRoutes = require("./routes/pageNotFound");
app.use(authRoutes);
app.use(offerRoutes);
app.use(pageNotFoundRoutes);

// connect to mongoDB  - vinted database
mongoose.connect(process.env.MONGODB_URI);

app.listen(process.env.PORT || 4000, () =>
  console.log(`Server has started on port ${process.env.PORT || 4000} 🚀 `)
);
