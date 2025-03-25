const express = require("express");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const Candidate = require("../models/candidate");
const { Organization } = require("../models/organization");
const { HRManager } = require("../models/hrManager");
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
        email,
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
      console.log(req.body);

      // Parse JSON strings to arrays/objects
      const parsedSkills = JSON.parse(skills);
      const parsedLanguages = JSON.parse(languages);
      const parsedCertifications = JSON.parse(certifications);
      const parsedEducation = JSON.parse(education);

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

      const candidate = await Candidate.findOne({ where: { email } });
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

      res
        .status(500)
        .json({
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
      const {
        companyName,
        email,
        password,
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

      // Upload logo to cloudinary
      let logoUrl = "";
      if (req.file) {
        const result = await cloudinary.uploader
          .upload_stream({ resource_type: "image" }, (error, result) => {
            if (error) throw error;
            logoUrl = result.secure_url;
          })
          .end(req.file.buffer);
      }

      // Save organization details
      const organization = await Organization.create({
        companyName,
        email,
        password,
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
        logo: logoUrl,
        linkedin,
        twitter,
        benefits,
        culture,
      });

      // Create a new table for the organization's employees
      const employeeTableName = `${organization.companyName
        .replace(/\s+/g, "_")
        .toLowerCase()}_employees`;
      await sequelize.query(`CREATE TABLE ${employeeTableName} (
      id SERIAL PRIMARY KEY,
      uid UUID,
      name VARCHAR(255),
      email VARCHAR(255),
      role VARCHAR(255)
    )`);

      // Update HRManager details and add to the organization's employee table
      const hrManager = await HRManager.findOne({
        where: { email: req.body.hrManagerEmail },
      });
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

      await sequelize.query(`INSERT INTO ${employeeTableName} (uid, name, email, role) VALUES
      ('${hrManager.id}', '${hrManager.name}', '${hrManager.email}', 'HR Manager')`);

      res.status(201).json({ success: true, organization });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: "Something went wrong", error });
    }
  }
);

module.exports = router;
