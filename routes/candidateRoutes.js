const express = require("express");
const router = express.Router();
const Candidate = require("../models/candidate");
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { authenticateJWT, authorizeUserType } = require("../middleware/auth");
const { generateProfilePictureColors } = require('../utils/materialyou/colour');

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
  authorizeUserType("candidate"),
  async (req, res) => {
    try {
      res.json(req.user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.put(
  "/profile",
  authenticateJWT,
  authorizeUserType("candidate"),
  upload.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'profileImage', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const {
        firstName,
        lastName,
        phone,
        title,
        experience,
        industry,
        location,
        desiredSalary,
        workPreference,
        country,
        currency,
        skills,
        languages,
        certifications,
        education,
        linkedin,
        github,
        portfolio,
        bio
      } = req.body;

      const candidateId = req.user.id;
      const candidate = await Candidate.findByPk(candidateId);
      
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      // Handle resume upload
      let resumeUrl = candidate.resume; // Keep existing resume URL by default
      if (req.files?.resume?.[0]) {
        const uploadStream = () => {
          return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { resource_type: 'raw', public_id: `resume_${candidateId}_${Date.now()}.pdf` },
              (error, result) => {
                if (error) reject(error);
                resolve(result.secure_url);
              }
            );
            stream.end(req.files.resume[0].buffer);
          });
        };
        resumeUrl = await uploadStream();
      }

      // Handle profile image upload
      let profileImageUrl = candidate.profileImage; // Keep existing profile image URL by default
      let colorScheme = candidate.colors;
      if (req.files?.profileImage?.[0]) {
        const uploadImageStream = () => {
          return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { resource_type: 'image', public_id: `profile_${candidateId}_${Date.now()}` },
              (error, result) => {
                if (error) reject(error);
                resolve(result.secure_url);
              }
            );
            stream.end(req.files.profileImage[0].buffer);
          });
        };
        profileImageUrl = await uploadImageStream();
        
        // Generate new color scheme from profile image
        try {
          colorScheme = await generateProfilePictureColors(profileImageUrl);
        } catch (colorError) {
          console.error('Error generating color scheme:', colorError);
        }
      }

      // Parse JSON strings if they're provided as strings
      const parsedSkills = typeof skills === 'string' ? JSON.parse(skills) : skills;
      const parsedLanguages = typeof languages === 'string' ? JSON.parse(languages) : languages;
      const parsedCertifications = typeof certifications === 'string' ? JSON.parse(certifications) : certifications;
      const parsedEducation = typeof education === 'string' ? JSON.parse(education) : education;

      const updatedCandidate = await candidate.update({
        firstName,
        lastName,
        phone,
        title,
        experience,
        industry,
        location,
        desiredSalary,
        workPreference,
        country,
        currency,
        skills: parsedSkills,
        languages: parsedLanguages,
        certifications: parsedCertifications,
        education: parsedEducation,
        linkedin,
        github,
        portfolio,
        bio,
        resume: resumeUrl,
        profileImage: profileImageUrl,
        colors: colorScheme
      });

      res.json(updatedCandidate);
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
