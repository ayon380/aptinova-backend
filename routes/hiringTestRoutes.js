const express = require("express");
const router = express.Router();
const HiringTest = require("../models/hiringTest");
const Applicant = require("../models/applicant"); // Add this line
const { authenticateJWT, authorizeUserType } = require("../middleware/auth");
const HRManager = require("../models/hrManager");

// Get all hiring tests (HR or HRManager only)
router.get(
  "/",
  authenticateJWT,
  authorizeUserType("hrManager") || authorizeUserType("hr"),
  async (req, res) => {
    console.log("Getting all hiring tests");

    try {
      const tests = await HiringTest.findAll({
        where: { organizationId: req.hrManager.organizationId },
      });
      res.json(tests);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Get a hiring test by ID (accessible by candidate)
router.get(
  "/:id",
  authenticateJWT,
  authorizeUserType("candidate"),
  async (req, res) => {
    try {
      const test = await HiringTest.findByPk(req.params.id);
      if (!test) {
        return res.status(404).json({ error: "Hiring test not found" });
      }

      // Check if this test is assigned to the candidate
      const applicant = await Applicant.findOne({
        where: {
          candidateId: req.user.id,
          hiringTestId: req.params.id,
          status: "Assessment", // Only allow access if status is Assessment
        },
      });

      if (!applicant) {
        return res.status(403).json({
          error: "You are not authorized to access this test",
        });
      }

      res.json(test);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Start a hiring test (accessible by candidate)
router.post(
  "/:id/start",
  authenticateJWT,
  authorizeUserType("candidate"),
  async (req, res) => {
    try {
      const test = await HiringTest.findByPk(req.params.id);
      if (!test) {
        return res.status(404).json({ error: "Hiring test not found" });
      }

      // Check if this test is assigned to the candidate
      const applicant = await Applicant.findOne({
        where: {
          candidateId: req.user.id,
          hiringTestId: req.params.id,
          status: "Assessment",
        },
      });

      if (!applicant) {
        return res.status(403).json({
          error: "You are not authorized to start this test",
        });
      }

      // Record the start time
      applicant.startTime = new Date();
      await applicant.save();

      res.json({
        message: "Test started successfully",
        startTime: applicant.startTime,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// End a hiring test (accessible by candidate)
router.post(
  "/:id/end",
  authenticateJWT,
  authorizeUserType("candidate"),
  async (req, res) => {
    try {
      const test = await HiringTest.findByPk(req.params.id);
      if (!test) {
        return res.status(404).json({ error: "Hiring test not found" });
      }

      // Check if this test is assigned to the candidate
      const applicant = await Applicant.findOne({
        where: {
          candidateId: req.user.id,
          hiringTestId: req.params.id,
          status: "Assessment",
        },
      });

      if (!applicant) {
        return res.status(403).json({
          error: "You are not authorized to end this test",
        });
      }

      // Record the end time
      applicant.endTime = new Date();
      await applicant.save();

      res.json({
        message: "Test ended successfully",
        endTime: applicant.endTime,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Create a new hiring test (HR or HRManager only)
router.post(
  "/",
  authenticateJWT,
  authorizeUserType("hrManager") || authorizeUserType("hr"),
  async (req, res) => {
    console.log("Creating hiring test");
    const hrm = await HRManager.findOne({
      where: {
        id: req.user.id,
      },
    });
    const orgid = hrm.organizationId;
    try {
      const test = await HiringTest.create({
        ...req.body,
        organizationId: orgid,
      });
      res.status(201).json(test);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

// Update a hiring test by ID (HR or HRManager only)
router.put(
  "/:id",
  authenticateJWT,
  authorizeUserType("hrManager") || authorizeUserType("hr"),
  async (req, res) => {
    try {
      const [updated] = await HiringTest.update(req.body, {
        where: {
          id: req.params.id,
          organizationId: req.hrManager.organizationId,
        },
      });
      if (updated) {
        const updatedTest = await HiringTest.findByPk(req.params.id);
        res.json(updatedTest);
      } else {
        res.status(404).json({ error: "Hiring test not found" });
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

// Delete a hiring test by ID (HR or HRManager only)
router.delete(
  "/:id",
  authenticateJWT,
  authorizeUserType("hrManager") || authorizeUserType("hr"),
  async (req, res) => {
    try {
      const deleted = await HiringTest.destroy({
        where: {
          id: req.params.id,
          organizationId: req.hrManager.organizationId,
        },
      });
      if (deleted) {
        res.status(204).json();
      } else {
        res.status(404).json({ error: "Hiring test not found" });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
