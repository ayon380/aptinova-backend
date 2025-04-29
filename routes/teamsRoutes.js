const express = require("express");
const router = express.Router();
const { authenticateJWT, authorizeUserType } = require("../middleware/auth");
const crypto = require("crypto");
const { Op } = require("sequelize");
const Organization = require("../models/organization");
const { sendOnboardingEmail } = require("../utils/emailService");
const bcrypt = require("bcryptjs");
const Hr = require("../models/hr");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Configure cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
// Add new HR to organization
router.post(
  "/hr/add",
  authenticateJWT,
  authorizeUserType("hrManager"),
  async (req, res) => {
    try {
      const { email, name, department } = req.body;
      const user = req.user.dataValues;
      // Check if HR already exists
      let hr = await Hr.findOne({ where: { email } });
      if (hr) {
        return res.status(400).json({ msg: "User already exists" });
      }

      // Generate onboarding token
      const onboardingToken = crypto.randomBytes(32).toString("hex");
      const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      hr = new Hr({
        name,
        email,
        department,
        organizationId: user.organizationId,
        role: "HR",
        status: "pending",
        onboardingToken,
        onboardingTokenExpiry: tokenExpiry,
      });

      await hr.save();
      const Org = await Organization.findByPk(user.organizationId);
      // Send onboarding email
      const onboardingLink = `${process.env.FRONTEND_URL}/onboarding/hr/${onboardingToken}`;
      await sendOnboardingEmail(email, name, Org.companyName, onboardingLink);

      res.json(hr);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

// Get HR onboarding details
router.get("/hr/onboarding/:token", async (req, res) => {
  try {
    const { token } = req.params;

    // Find user by token and ensure it's not expired
    const hr = await Hr.findOne({
      where: {
        onboardingToken: token,
        onboardingTokenExpiry: { [Op.gt]: Date.now() },
        status: "pending",
      },
      attributes: { exclude: ["password"] },
    });

    if (!hr) {
      return res
        .status(400)
        .json({ msg: "Invalid or expired onboarding link" });
    }

    // Get organization details
    const organization = await Organization.findByPk(hr.organizationId, {
      attributes: ["companyName", "logo"],
    });

    res.json({
      name: hr.name,
      email: hr.email,
      department: hr.department,
      organization: {
        name: organization.companyName,
        logo: organization.logo,
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Complete HR onboarding
router.post(
  "/hr/complete-onboarding",
  upload.single("profilePicture"),
  async (req, res) => {
    try {
      const { token, password } = req.body;

      // Find user by token
      const hr = await Hr.findOne({
        where: {
          onboardingToken: token,
          onboardingTokenExpiry: { [Op.gt]: Date.now() },
          status: "pending",
        },
      });

      if (!hr) {
        return res
          .status(400)
          .json({ msg: "Invalid or expired onboarding link" });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Upload profile picture to Cloudinary
      let profilePictureUrl = hr.profilePicture;
      if (req.file) {
        const result = await new Promise((resolve, reject) => {
          cloudinary.uploader
            .upload_stream({ resource_type: "image" }, (error, result) => {
              if (error) {
                reject(new Error("Profile picture upload failed"));
              } else {
                resolve(result.secure_url);
              }
            })
            .end(req.file.buffer);
        });

        profilePictureUrl = result;
      }

      // Update user
      hr.password = hashedPassword;
      hr.status = "active";
      hr.onboardingToken = null;
      hr.onboardingTokenExpiry = null;
      hr.profilePicture = profilePictureUrl;

      await hr.save();

      res.json({ msg: "Onboarding completed successfully" });
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

// Remove HR from organization
router.delete(
  "/hr/remove/:hrId",
  authenticateJWT,
  authorizeUserType("hrManager"),
  async (req, res) => {
    try {
      const hr = await Hr.findByPk(req.params.hrId);
      if (!hr) {
        return res.status(404).json({ msg: "HR not found" });
      }
      const user = req.user.dataValues;
      // Verify HR belongs to same organization
      if (hr.organizationId !== user.organizationId) {
        return res.status(403).json({ msg: "Not authorized" });
      }

      await Hr.destroy({ where: { id: req.params.hrId } });
      res.json({ msg: "HR removed successfully" });
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

// Get all HRs in organization
router.get(
  "/hrs",
  authenticateJWT,
  authorizeUserType("hrManager"),
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || "";
      const user = req.user.dataValues;

      const { count, rows: hrs } = await Hr.findAndCountAll({
        where: {
          organizationId: user.organizationId,
          [Op.or]: [
            { name: { [Op.iLike]: `%${search}%` } },
            { department: { [Op.iLike]: `%${search}%` } },
          ],
        },
        attributes: [
          "id",
          "name",
          "email",
          "profilePicture",
          "department",
          "status",
          "createdAt",
        ],
        offset: (page - 1) * limit,
        limit: limit,
        order: [["createdAt", "DESC"]],
      });

      res.json({
        hrs,
        pagination: {
          total: count,
          page,
          pages: Math.ceil(count / limit),
        },
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

module.exports = router;
