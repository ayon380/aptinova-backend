const express = require("express");
const router = express.Router();
const HRManager = require("../models/hrManager");
const Job = require("../models/job");
const Organization = require("../models/organization");
const Applicant = require("../models/applicant"); // Assuming there's an Applicant model
const Application = require("../models/applicant"); // Assuming there's an Application model
const { authenticateJWT, authorizeUserType } = require("../middleware/auth");

// Get all jobs (HR or HRManager only)
router.get(
  "/",
  authenticateJWT,
  authorizeUserType("hrManager") || authorizeUserType("hr"),
  async (req, res) => {
    try {
      const hro = await HRManager.findByPk(req.user.id);
      const jobs = await Job.findAll({
        where: { organizationId: hro.organizationId },
      });

      res.json(jobs);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Fetch all applications done by a candidate
router.get(
  "/applications",
  authenticateJWT,
  authorizeUserType("candidate"),
  async (req, res) => {
    try {
      const applications = await Application.findAll({
        where: { candidateId: req.user.id },
        include: [
          {
            model: Job,
            attributes: ["title"],
          },
          {
            model: Organization,
            attributes: ["companyName"],
          },
        ],
      });

      const response = applications.map((application) => {
        const { score, Job, Organization, ...applicationData } =
          application.toJSON();
        return {
          ...applicationData,
          jobTitle: Job.title,
          companyName: Organization.companyName,
        };
      });

      res.json(response);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.get("/all", async (req, res) => {
  try {
    const jobs = await Job.findAll();
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Get a job by ID (accessible by candidate)
router.get(
  "/:id",
  authenticateJWT,
  // authorizeUserType("candidate"),
  async (req, res) => {
    console.log("Getting job by ID" + req.params.id);

    try {
      const job = await Job.findByPk(req.params.id);
      if (job) {
        res.json(job);
      } else {
        res.status(404).json({ error: "Job not found" });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Create a new job (HR or HRManager only)
router.post(
  "/",
  authenticateJWT,
  authorizeUserType("hrManager"),
  async (req, res) => {
    console.log("Creating job");
    try {
      const hro = await HRManager.findByPk(req.user.id);
      console.log(hro.organizationId);
      const org = await Organization.findByPk(hro.organizationId);

      // Convert benefits and qualifications to strings if they are arrays
      const { ...jobData } = req.body;
      const job = await Job.create({
        ...jobData,
        OrgName: org.companyName,
        subdomain: org.subdomain,
        organizationId: hro.organizationId,
      });

      res.status(201).json(job);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

// Apply for a job (accessible by candidate)
router.post(
  "/:id/apply",
  authenticateJWT,
  authorizeUserType("candidate"),
  async (req, res) => {
    console.log("Applying for job");
    try {
      const job = await Job.findByPk(req.params.id);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      const org = await Organization.findByPk(job.organizationId);
      const origin = req.headers.origin; // Get the origin from headers
      let subdomain = "";

      if (origin) {
        const url = new URL(origin); // Use the URL constructor to parse the origin
        subdomain = url.hostname.split(".")[0]; // Extract the subdomain
      }

      console.log(subdomain); // Extract subdomain from origin
      console.log("Subdomain" + subdomain);

      if (subdomain !== org.subdomain) {
        return res.status(403).json({ error: "Subdomain mismatch" });
      }

      const applicantData = {
        jobId: req.params.id,
        orgId: job.organizationId,
        candidateId: req.user.id, // Assuming the candidate's ID is stored in req.user.id
        ...req.body,
      };

      const applicant = await Applicant.create(applicantData);
      res.status(201).json(applicant);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

// Update a job by ID (HR or HRManager only)
router.put(
  "/:id",
  authenticateJWT,
  authorizeUserType("hrManager") || authorizeUserType("hr"),
  async (req, res) => {
    try {
      const [updated] = await Job.update(req.body, {
        where: {
          id: req.params.id,
          organizationId: req.hrManager.organizationId,
        },
      });
      if (updated) {
        const updatedJob = await Job.findByPk(req.params.id);
        res.json(updatedJob);
      } else {
        res.status(404).json({ error: "Job not found" });
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

// Delete a job by ID (HR or HRManager only)
router.delete(
  "/:id",
  authenticateJWT,
  authorizeUserType("hrManager") || authorizeUserType("hr"),
  async (req, res) => {
    try {
      const deleted = await Job.destroy({
        where: {
          id: req.params.id,
          organizationId: req.hrManager.organizationId,
        },
      });
      if (deleted) {
        res.status(204).json();
      } else {
        res.status(404).json({ error: "Job not found" });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
