const express = require("express");
const router = express.Router();
const Candidate = require("../models/candidate");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { authenticateJWT, authorizeUserType } = require("../middleware/auth");
const Applicant = require("../models/applicant");
const Job = require("../models/job");
const Organization = require("../models/organization");

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
        colors,
      } = req.body;

      const candidateId = req.user.id;
      const candidate = await Candidate.findByPk(candidateId);

      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      console.log(colors);

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

      // let colorscheme = candidate.colors;
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
      const parsedcolors =
        typeof colors === "string" ? JSON.parse(colors) : colors;
      console.log("Parsed colors:", parsedcolors);
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
          colours: parsedcolors, // Fallback to existing colors if not provided
        },
        { where: { id: candidateId }, returning: true }
      );

      console.log("Rows updated:", rowsUpdated);
      console.log(
        "After update - Profile image URL:",
        finalCandidate.profilePicture
      );

      res.json(finalCandidate);
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

router.get(
  "/home",
  authenticateJWT,
  authorizeUserType("candidate"),
  async (req, res) => {
    try {
      const candidateId = req.user.id;

      // Fetch candidate's profile information
      const candidate = await Candidate.findByPk(candidateId);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      // Fetch all applications by the candidate
      const applications = await Applicant.findAll({
        where: { candidateId },
        include: [
          {
            model: Job,
            attributes: [
              "id",
              "title",
              "description",
              "location",
              "jobType",
              "employmentType",
              "deadline",
            ],
          },
          {
            model: Organization,
            attributes: ["id", "companyName", "logo"],
          },
        ],
      });

      // Process applications to extract upcoming events and statuses
      const processedApplications = applications.map((app) => {
        const application = app.toJSON();

        // Parse hiring process steps if they exist
        let upcomingEvents = [];
        if (application.hiringProcess) {
          try {
            const hiringProcess = JSON.parse(application.hiringProcess);

            // Extract upcoming tests, interviews, etc.
            upcomingEvents = hiringProcess
              .filter((step) => {
                // Include steps that have a planned date but are not completed
                return (
                  step.plannedDate &&
                  !step.completedDate &&
                  new Date(step.plannedDate) >= new Date()
                );
              })
              .map((step) => ({
                type: step.type,
                name: step.name,
                description: step.description || "",
                date: step.plannedDate,
                jobId: application.jobId,
                jobTitle: application.Job.title,
                companyName: application.Organization.companyName,
                companyLogo: application.Organization.logo,
              }))
              .sort((a, b) => new Date(a.date) - new Date(b.date));
          } catch (error) {
            console.error(
              `Error parsing hiring process for application ${application.id}:`,
              error
            );
          }
        }

        return {
          id: application.id,
          status: application.status,
          score: application.score,
          appliedAt: application.createdAt,
          job: application.Job,
          organization: application.Organization,
          upcomingEvents,
        };
      });

      // Extract all upcoming events across all applications
      const allUpcomingEvents = processedApplications
        .flatMap((app) => app.upcomingEvents)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      // Calculate statistics
      const applicationStats = {
        total: applications.length,
        byStatus: applications.reduce((acc, app) => {
          acc[app.status] = (acc[app.status] || 0) + 1;
          return acc;
        }, {}),
      };

      // Build the final response
      const homeData = {
        profile: {
          id: candidate.id,
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          email: candidate.email,
          title: candidate.title,
          profilePicture: candidate.profilePicture,
          status: candidate.status,
          subscriptionType: candidate.subscriptionType,
          subscriptionStatus: candidate.subscriptionStatus,
        },
        applications: {
          stats: applicationStats,
          recent: processedApplications.slice(0, 5), // Get 5 most recent applications
        },
        upcomingEvents: allUpcomingEvents.slice(0, 10), // Get 10 nearest upcoming events
      };

      res.json(homeData);
    } catch (error) {
      console.error("Error fetching home data:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
