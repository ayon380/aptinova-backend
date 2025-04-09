const express = require("express");
const router = express.Router();
const Candidate = require("../models/candidate");
const HRManager = require("../models/hrManager");
const { Op } = require("sequelize");
const sequelize = require("../config/database");
const Job = require("../models/job");
const Applicant = require("../models/applicant");
const Interview = require("../models/interview");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { authenticateJWT, authorizeUserType } = require("../middleware/auth");
const HR = require("../models/hr"); // Add HR model import

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Configure cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Get HR data by ID
router.get(
  "/profile",
  authenticateJWT,
  authorizeUserType("hr"),
  async (req, res) => {
    try {
      const hr = await HR.findByPk(req.user.id);

      if (!hr) {
        return res.status(404).json({ message: "HR not found" });
      }

      // Don't send password or tokens in response
      const { password, resetToken, onboardingToken, ...hrData } = hr.toJSON();

      res.json(hrData);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// Update HR data by ID
router.put(
  "/profile",
  authenticateJWT,
  authorizeUserType("hr"),
  upload.single("profilePicture"),
  async (req, res) => {
    try {
      const hr = await HR.findByPk(req.params.id);

      if (!hr) {
        return res.status(404).json({ message: "HR not found" });
      }

      // Handle profile picture upload
      let profilePictureUrl = hr.profilePicture; // Keep existing URL by default
      if (req.file) {
        try {
          const uploadImageStream = () => {
            return new Promise((resolve, reject) => {
              const stream = cloudinary.uploader.upload_stream(
                {
                  resource_type: "image",
                  public_id: `hr_profile_${hr.id}_${Date.now()}`,
                },
                (error, result) => {
                  if (error) {
                    console.error("Cloudinary upload error:", error);
                    reject(error);
                  }
                  resolve(result.secure_url);
                }
              );
              stream.end(req.file.buffer);
            });
          };
          profilePictureUrl = await uploadImageStream();
        } catch (uploadError) {
          console.error("Profile picture upload error:", uploadError);
          throw uploadError;
        }
      }

      // Update HR record with provided fields
      await hr.update({
        profilePicture: profilePictureUrl,
      });

      // Don't send password or tokens in response
      const { password, resetToken, onboardingToken, ...updatedHrData } =
        hr.toJSON();

      res.json(updatedHrData);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

module.exports = router;
