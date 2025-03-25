const express = require("express");
const router = express.Router();
const Candidate = require("../models/candidate");
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
    { name: "resume", maxCount: 1 }, // Adjust to match client field name
    { name: "profileImage", maxCount: 1 },
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
        bio,
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
              {
                resource_type: "raw",
                public_id: `resume_${candidateId}_${Date.now()}.pdf`,
              },
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
      let profilePictureUrl = candidate.profilePicture; // Keep existing profile image URL by default
      console.log(req.files.profileImage);

      let colourScheme = candidate.colours;
      if (req.files?.profileImage?.[0]) {
        try {
          const uploadImageStream = () => {
            return new Promise((resolve, reject) => {
              const stream = cloudinary.uploader.upload_stream(
                {
                  resource_type: "image",
                  public_id: `profile_${candidateId}_${Date.now()}`,
                },
                (error, result) => {
                  if (error) {
                    console.error("Cloudinary upload error:", error);
                    reject(error);
                  }
                  console.log("Cloudinary result:", result);
                  resolve(result.secure_url);
                }
              );
              stream.end(req.files.profileImage[0].buffer);
            });
          };
          console.log("Starting image upload...");
          profilePictureUrl = await uploadImageStream();
          console.log("Upload complete. Profile image URL:", profilePictureUrl);
          
          if (!profilePictureUrl) {
            throw new Error("Failed to get URL from Cloudinary");
          }
        } catch (uploadError) {
          console.error("Image upload error:", uploadError);
          throw uploadError;
        }
      }

      console.log("Before update - Profile image URL:", profilePictureUrl);
      console.log("Candidate columns:", Object.keys(candidate.rawAttributes));

      // Parse JSON strings if they're provided as strings
      const parsedSkills =
        typeof skills === "string" ? JSON.parse(skills) : skills;
      const parsedLanguages =
        typeof languages === "string" ? JSON.parse(languages) : languages;
      const parsedCertifications =
        typeof certifications === "string"
          ? JSON.parse(certifications)
          : certifications;
      const parsedEducation =
        typeof education === "string" ? JSON.parse(education) : education;

      const [rowsUpdated, [finalCandidate]] = await Candidate.update(
        {
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
          profilePicture: profilePictureUrl || candidate.profilePicture, // Fallback to existing image if upload fails
          colours: colourScheme,
        },
        { where: { id: candidateId }, returning: true }
      );

      console.log("Rows updated:", rowsUpdated);
      console.log("After update - Profile image URL:", finalCandidate.profilePicture);

      res.json(finalCandidate);
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
