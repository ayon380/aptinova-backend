const express = require("express");
const router = express.Router();
const HRManager = require("../models/hrManager");
const Job = require("../models/job");
const Organization = require("../models/organization");
const Applicant = require("../models/applicant");
// Assuming you have a separate Application model, if not, use just Applicant
const { authenticateJWT, authorizeUserType } = require("../middleware/auth");
const { Op } = require("sequelize");

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
      const applications = await Applicant.findAll({
        where: { candidateId: req.user.id },
        include: [
          {
            model: Job,
            attributes: [
              "title",
              "OrgName",
              "orgLogo",
              "jobType",
              "employmentType",
              "location",
              "status",
            ],
          },
        ],
      });

      const response = applications.map((application) => {
        const { Job, ...applicationData } = application.toJSON();
        return {
          ...applicationData,
          jobTitle: Job.title,
          companyName: Job.OrgName,
          jobType: Job.jobType,
          employmentType: Job.employmentType,
          location: Job.location,
          status: Job.status,
          companyLogo: Job.orgLogo,
        };
      });

      res.json(response);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Make the /all route optionally authenticated to filter out applied jobs
router.get("/all", authenticateJWT, async (req, res) => {
  try {
    // Extract query parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sort = req.query.sort || "postedAt,desc";

    // Build base query
    const queryOptions = {
      where: {},
      limit,
      offset,
    };

    // First check if we have an authenticated candidate
    let excludeJobIds = [];

    // If the request has authentication token and it's a candidate
    console.log(req.user);

    if (req.user && req.user.type === "candidate") {
      // Find all job IDs the candidate has already applied to
      const applications = await Applicant.findAll({
        where: { candidateId: req.user.id },
        attributes: ["jobId"],
      });

      // Extract job IDs to exclude
      excludeJobIds = applications.map((app) => app.jobId);

      // If there are jobs to exclude, add them to the query
      if (excludeJobIds.length > 0) {
        queryOptions.where.id = {
          [Op.notIn]: excludeJobIds,
        };
      }
    }

    // Parse the sort parameter
    let [sortField = "postedAt", sortDirection = "desc"] = sort.split(",");

    // First map special sort values to actual database columns
    if (sortField === "newest") {
      sortField = "postedAt";
      sortDirection = "desc";
    } else if (sortField === "oldest") {
      sortField = "postedAt";
      sortDirection = "asc";
    }

    // Then validate that the sort field exists in the model
    const validColumns = Object.keys(Job.rawAttributes);
    if (!validColumns.includes(sortField)) {
      console.warn(
        `Invalid sort field: ${sortField}, falling back to postedAt`
      );
      sortField = "postedAt"; // Default fallback if column doesn't exist
    }

    // Ensure sort direction is valid
    sortDirection = ["ASC", "DESC"].includes(sortDirection.toUpperCase())
      ? sortDirection.toUpperCase()
      : "DESC";

    queryOptions.order = [[sortField, sortDirection]];

    // Handle filtering
    if (req.query.search) {
      queryOptions.where[Op.or] = [
        { title: { [Op.iLike]: `%${req.query.search}%` } },
        { description: { [Op.iLike]: `%${req.query.search}%` } },
        { OrgName: { [Op.iLike]: `%${req.query.search}%` } },
      ];
    }

    if (req.query.location) {
      queryOptions.where.location = { [Op.iLike]: `%${req.query.location}%` };
    }

    if (req.query.employmentType) {
      queryOptions.where.employmentType = req.query.employmentType;
    }

    if (req.query.jobType) {
      queryOptions.where.jobType = req.query.jobType;
    }

    if (req.query.industry) {
      queryOptions.where.industry = { [Op.iLike]: `%${req.query.industry}%` };
    }

    if (req.query.jobLevel) {
      queryOptions.where.jobLevel = req.query.jobLevel;
    }

    if (req.query.experienceRequired) {
      queryOptions.where.experienceRequired = {
        [Op.lte]: parseInt(req.query.experienceRequired),
      };
    }

    // Handle salary range filtering
    if (req.query.minSalary) {
      queryOptions.where.salary = {
        ...(queryOptions.where.salary || {}),
        [Op.gte]: parseFloat(req.query.minSalary),
      };
    }

    if (req.query.maxSalary) {
      queryOptions.where.salary = {
        ...(queryOptions.where.salary || {}),
        [Op.lte]: parseFloat(req.query.maxSalary),
      };
    }

    // Get total count for pagination
    const count = await Job.count({ where: queryOptions.where });

    // Execute query with logging to debug SQL issues
    console.log("Query options:", JSON.stringify(queryOptions));
    const jobs = await Job.findAll(queryOptions);

    // Return response with pagination metadata
    res.json({
      jobs,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
      excludedJobs: excludeJobIds.length, // Optionally include this for debugging
    });
  } catch (error) {
    console.error("Error fetching jobs:", error.message);
    // Add more detailed error logging for debugging
    if (error.parent) {
      console.error("Database error details:", {
        message: error.parent.message,
        sql: error.parent.sql,
        parameters: error.parent.parameters,
      });
    }
    res.status(500).json({ error: error.message });
  }
});

// Get a job by ID (accessible by anyone)
router.get("/:id", async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id, {
      include: [
        {
          model: Organization,
          attributes: ["companyName", "logo", "subdomain", "industry"],
        },
      ],
    });

    if (job) {
      res.json(job);
    } else {
      res.status(404).json({ error: "Job not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new job (HR or HRManager only)
router.post(
  "/",
  authenticateJWT,
  authorizeUserType("hrManager"),
  async (req, res) => {
    try {
      const hro = await HRManager.findByPk(req.user.id);
      const org = await Organization.findByPk(hro.organizationId);

      // Add proper validation based on the model
      const jobData = {
        ...req.body,
        OrgName: org.companyName,
        orgLogo: org.logo,
        subdomain: org.subdomain,
        organizationId: hro.organizationId,
      };

      // Convert text arrays to proper format if needed
      if (jobData.benefits && Array.isArray(jobData.benefits)) {
        jobData.benefits = JSON.stringify(jobData.benefits);
      }

      if (jobData.qualifications && Array.isArray(jobData.qualifications)) {
        jobData.qualifications = JSON.stringify(jobData.qualifications);
      }

      const job = await Job.create(jobData);
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
    try {
      const job = await Job.findByPk(req.params.id);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      // Check if job is still open
      if (job.status !== "Open") {
        return res.status(400).json({
          error: "This job posting is no longer accepting applications",
        });
      }

      // Check if deadline has passed
      if (job.deadline && new Date(job.deadline) < new Date()) {
        return res
          .status(400)
          .json({ error: "Application deadline has passed" });
      }

      const applicantData = {
        jobId: req.params.id,
        orgId: job.organizationId,
        candidateId: req.user.id,
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
  (req, res, next) => {
    if (req.user.userType === "hrManager" || req.user.userType === "hr") {
      next();
    } else {
      res.status(403).json({ error: "Unauthorized" });
    }
  },
  async (req, res) => {
    try {
      const hro = await HRManager.findByPk(req.user.id);

      let updateData = { ...req.body };
      // Convert arrays to strings if needed
      if (updateData.benefits && Array.isArray(updateData.benefits)) {
        updateData.benefits = JSON.stringify(updateData.benefits);
      }

      if (
        updateData.qualifications &&
        Array.isArray(updateData.qualifications)
      ) {
        updateData.qualifications = JSON.stringify(updateData.qualifications);
      }

      const [updated] = await Job.update(updateData, {
        where: {
          id: req.params.id,
          organizationId: hro.organizationId,
        },
      });

      if (updated) {
        const updatedJob = await Job.findByPk(req.params.id);
        res.json(updatedJob);
      } else {
        res
          .status(404)
          .json({ error: "Job not found or you're not authorized to edit it" });
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
  (req, res, next) => {
    if (req.user.userType === "hrManager" || req.user.userType === "hr") {
      next();
    } else {
      res.status(403).json({ error: "Unauthorized" });
    }
  },
  async (req, res) => {
    try {
      const hro = await HRManager.findByPk(req.user.id);

      const deleted = await Job.destroy({
        where: {
          id: req.params.id,
          organizationId: hro.organizationId,
        },
      });

      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({
          error: "Job not found or you're not authorized to delete it",
        });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
