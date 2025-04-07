const express = require("express");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const Candidate = require("../models/candidate");
const Organization = require("../models/organization"); // Fix import
const HRManager = require("../models/hrManager");
const sequelize = require("../config/database");
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

router.post(
  "/candidate",
  authenticateJWT,
  authorizeUserType("candidate"),
  upload.fields([
    { name: "resume", maxCount: 1 },
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
        workExperience,
        projects,
        publications,
        awards,
        achievements,
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
      console.log(req.body);

      // Parse JSON strings to arrays/objects
      const parsedSkills = JSON.parse(skills);
      const parsedLanguages = JSON.parse(languages);
      const parsedCertifications = JSON.parse(certifications);
      const parsedEducation = JSON.parse(education);

      // Parse workExperience and fix isPresent entries to have null endDate
      const parsedWorkExperience = JSON.parse(workExperience || "[]").map(
        (exp) => {
          if (exp.isPresent === true || exp.isPresent === "true") {
            return { ...exp, endDate: null };
          }
          // For non-present jobs, ensure endDate is properly formatted or null
          if (exp.endDate === "") {
            return { ...exp, endDate: null, isPresent: true };
          }
          return exp;
        }
      );

      // Parse projects and convert technologies from string to array if needed
      const parsedProjects = JSON.parse(projects || "[]").map((proj) => {
        if (typeof proj.technologies === "string") {
          return {
            ...proj,
            technologies: proj.technologies
              .split(",")
              .map((tech) => tech.trim()),
          };
        }
        return proj;
      });

      const parsedPublications = JSON.parse(publications || "[]");
      const parsedAwards = JSON.parse(awards || "[]");
      const parsedAchievements = JSON.parse(achievements || "[]");

      // Upload resume to cloudinary
      let resumeUrl = "";
      if (req.files && req.files.resume && req.files.resume[0]) {
        const uploadStream = () => {
          return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { resource_type: "raw", public_id: `${Date.now()}.pdf` },
              (error, result) => {
                if (error) return reject(error);
                resolve(result.secure_url);
              }
            );
            stream.end(req.files.resume[0].buffer);
          });
        };
        resumeUrl = await uploadStream();
      }

      // Upload profile image to cloudinary and generate color scheme
      let profileImageUrl = "";
      let colorScheme = null;
      if (req.files && req.files.profileImage && req.files.profileImage[0]) {
        const uploadImageStream = () => {
          return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { resource_type: "image", public_id: `profile_${Date.now()}` },
              (error, result) => {
                if (error) return reject(error);
                resolve(result.secure_url);
              }
            );
            stream.end(req.files.profileImage[0].buffer);
          });
        };
        profileImageUrl = await uploadImageStream();
      }

      // Update candidate details
      console.log(resumeUrl);
      console.log(profileImageUrl);

      const candidate = await Candidate.findByPk(req.user.id);
      if (!candidate) {
        return res
          .status(404)
          .json({ success: false, message: "Candidate not found" });
      }

      await candidate.update({
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
        workExperience: parsedWorkExperience,
        projects: parsedProjects,
        publications: parsedPublications,
        awards: parsedAwards,
        achievements: parsedAchievements,
        linkedin,
        github,
        portfolio,
        bio,
        resume: resumeUrl,
        profileImage: profileImageUrl,
      });

      // Optionally, update the status to 'complete'
      candidate.status = "complete";
      await candidate.save();

      res.status(200).json({ success: true, candidate });
    } catch (error) {
      console.log(error);

      res.status(500).json({
        success: false,
        message: "Something went wrong",
        error: error.message,
      });
    }
  }
);

router.post(
  "/organization",
  authenticateJWT,
  authorizeUserType("hrManager"),
  upload.single("logo"),
  async (req, res) => {
    try {
      const hrManager = await HRManager.findByPk(req.user.id);

      const {
        companyName,
        website,
        phone,
        industry,
        companySize,
        foundedYear,
        headquarters,
        type,
        address,
        city,
        country,
        zipCode,
        contactPerson,
        description,
        linkedin,
        twitter,
        benefits,
        culture,
      } = req.body;

      // Parse JSON strings
      const parsedContactPerson = JSON.parse(contactPerson);
      const parsedBenefits = JSON.parse(benefits || "[]");
      const parsedCulture = JSON.parse(culture || "[]");

      // Upload logo to cloudinary
      let logoUrl = "";
      if (req.file) {
        try {
          const uploadLogoStream = () => {
            return new Promise((resolve, reject) => {
              const stream = cloudinary.uploader.upload_stream(
                { resource_type: "image", public_id: `org_logo_${Date.now()}` },
                (error, result) => {
                  if (error) return reject(error);
                  resolve(result.secure_url);
                }
              );
              stream.end(req.file.buffer);
            });
          };
          logoUrl = await uploadLogoStream();
        } catch (error) {
          console.error("Logo upload error:", error);
          return res.status(500).json({
            success: false,
            message: "Failed to upload logo",
            error: error.message,
          });
        }
      }

      // Save organization details
      const organization = await Organization.create({
        companyName,
        email: hrManager.email,
        website,
        phone,
        industry,
        companySize,
        foundedYear,
        headquarters,
        type,
        address,
        city,
        country,
        zipCode,
        contactPerson: parsedContactPerson,
        description,
        logo: logoUrl,
        linkedin,
        twitter,
        benefits: parsedBenefits,
        culture: parsedCulture,
      });

      // Create a new table for the organization's employees

      // Update HRManager details and add to the organization's employee table

      if (!hrManager) {
        return res
          .status(404)
          .json({ success: false, message: "HR Manager not found" });
      }

      await hrManager.update({
        password: req.body.hrManagerPassword,
        name: req.body.hrManagerName,
        profilePicture: req.body.hrManagerProfilePicture,
        status: "active",
        department: req.body.hrManagerDepartment,
        role: "HR Manager",
        organizationId: organization.id,
      });

      res.status(201).json({ success: true, organization });
    } catch (error) {
      console.log(error);

      res
        .status(500)
        .json({ success: false, message: error.message, error: error });
    }
  }
);

module.exports = router;
