const express = require("express");
const router = express.Router();
const Candidate = require("../models/candidate");
const HRManager = require("../models/hrManager");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { authenticateJWT, authorizeUserType } = require("../middleware/auth");

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Configure cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

router.get(
  "/profile",
  authenticateJWT,
  authorizeUserType("hrManager"),
  async (req, res) => {
    try {
      res.json(req.user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);
module.exports = router;
