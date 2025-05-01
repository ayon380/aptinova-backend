const express = require("express");
const router = express.Router();
const Applicant = require("../models/applicant");
const HRManager = require("../models/hrManager");
const HR = require("../models/hr");
const {
  authenticateJWT,
  authorizeUserType,
  authorizeUserTypes,
} = require("../middleware/auth");
// Import sendOfferEmail and Organization model
const { sendEmail, sendOfferEmail } = require("../utils/emailService");
const createTestInvitationEmail = require("../utils/emailTemplates/testInvitation");
const Job = require("../models/job");
const Candidate = require("../models/candidate");
const Organization = require("../models/organization"); // Import Organization model

// Get all applicants (HR or HRManager only)
router.get(
  "/byjob/:jobId",
  authenticateJWT,
  authorizeUserTypes(["hrManager", "hr"]),
  async (req, res) => {
    console.log("Getting applications for JobID " + req.params.jobId);

    try {
      let orgid = null;
      console.log("User Type: ", req.user.type); // Debugging line

      if (req.user.type === "hrm") {
        console.log("User is HRManager");

        const hrm = await HRManager.findByPk(req.user.id);
        orgid = hrm.organizationId;
      } else if (req.user.type === "hr") {
        const hr = await HR.findByPk(req.user.id);
        orgid = hr.organizationId;
      } else {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const applicants = await Applicant.findAll({
        where: {
          orgId: orgid,
          jobId: req.params.jobId,
        },
        include: [
          {
            model: Candidate,
            as: "Candidate",
            attributes: ["firstName", "email", "profilePicture", "skills"],
          },
        ],
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
      const applicant = await Applicant.findByPk(req.params.id, {
        include: [
          {
            model: Job,
            as: "Job",
          },
        ],
      });

      if (applicant) {
        // Clone the applicant object so we can modify it without affecting the original
        const applicantData = JSON.parse(JSON.stringify(applicant));

        // Process the hiringProcess to hide sensitive fields
        if (applicantData.hiringProcess) {
          try {
            let hiringProcess = JSON.parse(applicantData.hiringProcess);

            // Remove score, id, and comments from each step
            hiringProcess = hiringProcess.map((step) => {
              const { score, id, comments, ...filteredStep } = step;
              return filteredStep;
            });

            // Replace the original hiringProcess with the filtered one
            applicantData.hiringProcess = JSON.stringify(hiringProcess);
          } catch (err) {
            console.error("Error processing hiringProcess:", err);
            // If there's an error parsing, just send the original data
          }
        }

        res.json(applicantData);
      } else {
        res.status(404).json({ error: "Applicant not found" });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

//get a profile detail by Applicant ID (HR or HRManager only)
router.get(
  "/:id/profile",
  authenticateJWT,
  authorizeUserTypes(["hrManager", "hr"]),
  async (req, res) => {
    try {
      const applicant = await Applicant.findByPk(req.params.id, {
        include: [
          {
            model: Job,
            as: "Job",
          },
          {
            model: Candidate,
            as: "Candidate",
          },
        ],
      });

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
  authorizeUserTypes(["hrManager", "candidate"]),
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
  authorizeUserTypes(["hrManager", "hr"]),
  async (req, res) => {
    try {
      let orgid = null;
      if (req.user.type === "hrm") {
        const hrm = await HRManager.findByPk(req.user.id);
        orgid = hrm.organizationId;
      } else if (req.user.type === "hr") {
        const hr = await HR.findByPk(req.user.id);
        orgid = hr.organizationId;
      } else {
        return res.status(403).json({ error: "Unauthorized" });
      }
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

        // Check if hiringTestId is present
        if (req.body.hiringTestId) {
          // Fetch additional information needed for the email
          const job = await Job.findByPk(applicant.jobId);
          const candidate = await Candidate.findByPk(applicant.candidateId);

          // Update the hiring process with the test ID
          if (updatedApplicant.hiringProcess) {
            try {
              const hiringProcess = JSON.parse(updatedApplicant.hiringProcess);

              // Find the specific Test step that matches the current status
              // This handles the case where there may be multiple test steps
              const updatedHiringProcess = hiringProcess.map((step) => {
                // Match the Test step that has a name matching the current status
                if (step.type === "Test" && step.name === req.body.status) {
                  return {
                    ...step,
                    id: req.body.hiringTestId,
                    status: "In Progress",
                  };
                }
                return step;
              });

              // Save the updated hiring process
              await Applicant.update(
                { hiringProcess: JSON.stringify(updatedHiringProcess) },
                { where: { id: req.params.id } }
              );
            } catch (err) {
              console.error("Error updating hiringProcess:", err);
            }
          }

          // Generate test link
          const testLink = `${process.env.FRONTEND_URL}/tests/${req.body.hiringTestId}`;

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

// Update only applicant status (HR or HRManager only)
router.put(
  "/:id/status",
  authenticateJWT,
  authorizeUserTypes(["hrManager", "hr"]),
  async (req, res) => {
    try {
      const { status, details } = req.body;
      // Ensure details and offerDetails exist, provide defaults if not
      const safeDetails = details || {};
      const offerDetails = safeDetails.offerDetails || {};
      console.log("Offer Details: ", offerDetails); // Debugging line

      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }

      let orgid = null;
      if (req.user.type === "hrm") {
        const hrm = await HRManager.findByPk(req.user.id);
        orgid = hrm.organizationId;
      } else if (req.user.type === "hr") {
        const hr = await HR.findByPk(req.user.id);
        orgid = hr.organizationId;
      } else {
        return res.status(403).json({ error: "Unauthorized" });
      }
      console.log("Organization ID: ", orgid); // Debugging line

      // Get the applicant before update
      const applicant = await Applicant.findOne({
        where: { id: req.params.id },
        include: [
          // Include Candidate and Job details early if needed
          { model: Candidate, as: "Candidate" },
          { model: Job, as: "Job" },
        ],
      });
      console.log("Applicant found: ", applicant); // Debugging line

      if (!applicant) {
        return res.status(404).json({ error: "Applicant not found" });
      }

      // Check if status is changing to 'Offer'
      if (status === "Offer" && applicant.status !== "Offer") {
        // Fetch organization details including the logo
        console.log("Fetching organization details for logo...");

        const organization = await Organization.findByPk(orgid, {
          attributes: ["companyName", "logo"], // Fetch name and logo
        });
        let orgName = "Our Company"; // Default name
        let orgLogo = null; // Default logo

        if (organization) {
          orgName = organization.companyName;
          orgLogo = organization.logo; // Get the logo URL
        } else {
          console.error(`Organization not found for ID: ${orgid}`);
        }

        // Send the offer email with logo
        await sendOfferEmail(
          applicant.Candidate.email,
          applicant.Candidate.firstName,
          applicant.Job.title,
          orgName, // Use fetched name or default
          orgLogo, // Pass the logo URL
          offerDetails // Pass the offer details object
        );
      }

      // Update the applicant status and potentially other fields if needed
      const updateData = { status };
      // If offerDetails are provided and status is Offer, maybe save them?
      // Example: if (status === 'Offer' && Object.keys(offerDetails).length > 0) {
      //   updateData.offerDetails = JSON.stringify(offerDetails); // Assuming you have an offerDetails column
      // }

      const [updated] = await Applicant.update(updateData, {
        where: { id: req.params.id, orgId: orgid },
      });

      if (updated) {
        const updatedApplicant = await Applicant.findByPk(req.params.id);
        res.json(updatedApplicant);
      } else {
        // This case might happen if the status was already 'Offer' and no other fields changed
        // Or if the update genuinely failed. Consider returning the current applicant data.
        res.json(applicant); // Return the applicant data as nothing changed or failed silently
        // Alternatively: res.status(404).json({ error: "Applicant not found or status unchanged" });
      }
    } catch (error) {
      console.error("Error updating applicant status:", error); // Log the detailed error
      res.status(400).json({ error: error.message });
    }
  }
);

// Delete an applicant by ID (HR or HRManager only)
router.delete(
  "/:id",
  authenticateJWT,
  authorizeUserTypes(["hrManager", "hr"]),
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
