const express = require("express");
const router = express.Router();
const Candidate = require("../models/candidate");
const HRManager = require("../models/hrManager");
const { Op } = require("sequelize");
const Organization = require("../models/organization");
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

// Implement the dashboard route for HR
router.get(
  "/dashboard",
  authenticateJWT,
  authorizeUserType("hr"),
  async (req, res) => {
    try {
      const hrId = req.user.id; // Get the HR ID from the authenticated user

      // Get HR profile data
      const hr = await HR.findByPk(hrId, {
        attributes: { exclude: ["password", "resetToken", "onboardingToken"] },
      });

      if (!hr) {
        return res.status(404).json({ message: "HR not found" });
      }

      // Get jobs assigned to this HR
      const jobs = await Job.findAll({
        where: { hrId },
        include: [
          {
            model: Organization,
            as: "organization",
            attributes: ["id", "companyName", "logo"],
          },
        ],
      });

      // Get job IDs
      const jobIds = jobs.map((job) => job.id);

      // Get applicants for these jobs
      const applicants = await Applicant.findAll({
        where: {
          jobId: {
            [Op.in]: jobIds,
          },
        },
        include: [
          {
            model: Candidate,
            attributes: [
              "id",
              "firstName",
              "lastName",
              "email",
              "profilePicture",
            ],
          },
          {
            model: Job,
            attributes: ["id", "title", "status"],
          },
        ],
      });

      // Get interviews for these applicants
      const applicantIds = applicants.map((applicant) => applicant.id);
      const interviews = await Interview.findAll({
        where: {
          applicantid: {
            [Op.in]: applicantIds,
          },
        },
        order: [["startDateTime", "ASC"]],
      });

      // Calculate statistics
      const stats = {
        totalJobs: jobs.length,
        openJobs: jobs.filter((job) => job.status === "Open").length,
        totalApplicants: applicants.length,
        pendingInterviews: interviews.filter(
          (interview) =>
            new Date(interview.scheduledDate) >= new Date() &&
            interview.status !== "Completed"
        ).length,
        recentApplications: applicants.filter(
          (app) =>
            new Date(app.createdAt) >=
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ).length, // Applications in the last 7 days
      };

      // Prepare upcoming interviews for display
      const upcomingInterviews = interviews
        .filter(
          (interview) =>
            new Date(interview.scheduledDate) >= new Date() &&
            interview.status !== "Completed"
        )
        .map((interview) => {
          const applicant = applicants.find(
            (app) => app.id === interview.applicantId
          );
          const candidate = applicant ? applicant.Candidate : null;
          const job = applicant ? applicant.Job : null;

          return {
            id: interview.id,
            scheduledDate: interview.scheduledDate,
            scheduledTime: interview.scheduledTime,
            status: interview.status,
            applicantId: interview.applicantId,
            candidateName: candidate
              ? `${candidate.firstName} ${candidate.lastName}`
              : "Unknown",
            candidateEmail: candidate ? candidate.email : "",
            candidateProfilePicture: candidate
              ? candidate.profilePicture
              : null,
            jobTitle: job ? job.title : "Unknown Position",
          };
        })
        .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

      // Get recent applicants
      const recentApplicants = applicants
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map((applicant) => ({
          id: applicant.id,
          jobId: applicant.jobId,
          jobTitle: applicant.Job ? applicant.Job.title : "Unknown Position",
          candidateId: applicant.candidateId,
          candidateName: applicant.Candidate
            ? `${applicant.Candidate.firstName} ${applicant.Candidate.lastName}`
            : "Unknown",
          status: applicant.status,
          appliedDate: applicant.createdAt,
          profilePicture: applicant.Candidate
            ? applicant.Candidate.profilePicture
            : null,
        }));

      // Get job status distribution
      const jobStatusCounts = {
        Open: jobs.filter((job) => job.status === "Open").length,
        Closed: jobs.filter((job) => job.status === "Closed").length,
        Paused: jobs.filter((job) => job.status === "Paused").length,
        Filled: jobs.filter((job) => job.status === "Filled").length,
      };

      // Prepare summary of jobs
      const jobSummaries = jobs.map((job) => ({
        id: job.id,
        title: job.title,
        status: job.status,
        applicantCount: applicants.filter((app) => app.jobId === job.id).length,
        organization: job.organization
          ? {
              id: job.organization.id,
              name: job.organization.companyName,
              logo: job.organization.logo,
            }
          : null,
        postedAt: job.postedAt,
        deadline: job.deadline,
      }));

      res.json({
        hr: hr,
        stats: stats,
        upcomingInterviews: upcomingInterviews.slice(0, 5), // Limit to 5 for dashboard
        recentApplicants: recentApplicants,
        jobStatusCounts: jobStatusCounts,
        jobSummaries: jobSummaries,
        totalItems: {
          jobs: jobs.length,
          applicants: applicants.length,
          interviews: interviews.length,
        },
      });
    } catch (error) {
      console.error("HR Dashboard Error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

module.exports = router;
