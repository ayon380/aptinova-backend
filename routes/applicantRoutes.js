const express = require("express");
const router = express.Router();
const Applicant = require("../models/applicant");
const HRManager = require("../models/hrManager");
const { authenticateJWT, authorizeUserType } = require("../middleware/auth");
const { sendEmail } = require("../utils/emailService");
const createTestInvitationEmail = require("../utils/emailTemplates/testInvitation");
const Job = require("../models/job");
const Candidate = require("../models/candidate");

// Get all applicants (HR or HRManager only)
router.get(
  "/byjob/:jobId",
  authenticateJWT,
  authorizeUserType("hrManager") || authorizeUserType("hr"),
  async (req, res) => {
    console.log("Getting applications for JobID " + req.params.jobId);

    try {
      const hrm = await HRManager.findOne({
        where: {
          id: req.user.id,
        },
      });
      const orgid = hrm.organizationId;
      const applicants = await Applicant.findAll({
        where: {
          orgId: orgid,
          jobId: req.params.jobId,
        },
      });
      res.json(applicants);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Get an applicant by ID (accessible by candidate)
router.get(
  "/:id",
  authenticateJWT,
  authorizeUserType("candidate"),
  async (req, res) => {
    try {
      const applicant = await Applicant.findByPk(req.params.id);
      if (applicant) {
        res.json(applicant);
      } else {
        res.status(404).json({ error: "Applicant not found" });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Create a new applicant (HR or HRManager only)
router.post(
  "/",
  authenticateJWT,
  authorizeUserType("hrManager") || authorizeUserType("hr"),
  async (req, res) => {
    try {
      const applicant = await Applicant.create({
        ...req.body,
        organizationId: req.hrManager.organizationId,
      });
      res.status(201).json(applicant);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

// Update an applicant by ID (HR or HRManager only)
router.put(
  "/:id",
  authenticateJWT,
  authorizeUserType("hrManager") || authorizeUserType("hr"),
  async (req, res) => {
    try {
      const hrm = await HRManager.findOne({
        where: {
          id: req.user.id,
        },
      });
      const orgid = hrm.organizationId;

      // Get the applicant before update
      const applicant = await Applicant.findOne({
        where: { id: req.params.id, orgId: orgid },
      });

      if (!applicant) {
        return res.status(404).json({ error: "Applicant not found" });
      }

      // Update the applicant
      const [updated] = await Applicant.update(req.body, {
        where: { id: req.params.id, orgId: orgid },
      });

      if (updated) {
        const updatedApplicant = await Applicant.findByPk(req.params.id);

        // Check if status was updated to "Assessment" and hiringTestId is present
        if (req.body.status === "Assessment" && req.body.hiringTestId) {
          // Fetch additional information needed for the email
          const job = await Job.findByPk(applicant.jobId);
          const candidate = await Candidate.findByPk(applicant.candidateId);

          // Generate test link
          const testLink = `${process.env.FRONTEND_URL}/tests/${req.body.hiringTestId}/hiring-test-start`;

          // Create and send email
          const emailHtml = createTestInvitationEmail(
            candidate.firstName,
            job.title,
            testLink
          );

          await sendEmail(
            candidate.email,
            "Assessment Invitation - Next Steps in Your Application",
            emailHtml
          );
        }

        res.json(updatedApplicant);
      } else {
        res.status(404).json({ error: "Applicant not found" });
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

// Delete an applicant by ID (HR or HRManager only)
router.delete(
  "/:id",
  authenticateJWT,
  authorizeUserType("hrManager") || authorizeUserType("hr"),
  async (req, res) => {
    try {
      const deleted = await Applicant.destroy({
        where: {
          id: req.params.id,
          organizationId: req.hrManager.organizationId,
        },
      });
      if (deleted) {
        res.status(204).json();
      } else {
        res.status(404).json({ error: "Applicant not found" });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
