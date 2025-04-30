const express = require("express");
const router = express.Router();
const HiringTest = require("../models/hiringTest");
const HR = require("../models/hr");
const Applicant = require("../models/applicant"); // Add this line
const {
  authenticateJWT,
  authorizeUserType,
  authorizeUserTypes,
} = require("../middleware/auth");
const HRManager = require("../models/hrManager");
const HIRING_TESTS = require("../config/tests"); // Add this line to import ready-made tests
const sequelize = require("../config/database");
// Get ready-made tests for HR Managers
router.get(
  "/ready-made",
  authenticateJWT,
  authorizeUserTypes(["hrManager", "hr"]),
  async (req, res) => {
    try {
      // Return simplified test information (id, name, description, question count)
      const simplifiedTests = HIRING_TESTS.map((test) => ({
        id: test.id,
        testName: test.testName,
        description: test.description,
        numberOfQuestions: test.questions.length,
      }));

      res.json(simplifiedTests);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Get all hiring tests (HR or HRManager only)
router.get(
  "/",
  authenticateJWT,
  authorizeUserTypes(["hrManager", "hr"]),
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
        },
      });

      if (!applicant) {
        return res.status(403).json({
          error: "You are not authorized to access this test",
        });
      }

      // Create a copy of the test data to modify
      const testData = JSON.parse(JSON.stringify(test));

      // Remove questions completely from the response
      delete testData.questions;

      res.json(testData);
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
        },
      });

      if (!applicant) {
        return res.status(403).json({
          error: "You are not authorized to start this test",
        });
      }
      if (applicant.startTime) {
        return res.status(403).json({
          error: "Test already started",
        });
      }

      // Record the start time
      applicant.startTime = new Date();
      applicant.warnings = []; // Reset warnings when starting the test
      await applicant.save();

      // Create a copy of the test questions to modify
      const questions = test.questions
        ? JSON.parse(JSON.stringify(test.questions))
        : [];

      // Remove correct answers from each question
      const questionsWithoutAnswers = questions.map((question) => {
        const { correctAnswer, ...questionWithoutAnswer } = question;
        return questionWithoutAnswer;
      });

      res.json({
        message: "Test started successfully",
        startTime: applicant.startTime,
        questions: questionsWithoutAnswers,
        duration: test.duration,
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
        },
      });

      if (!applicant) {
        return res.status(403).json({
          error: "You are not authorized to end this test",
        });
      }
      if (!applicant.startTime) {
        return res.status(403).json({
          error: "Test not started yet",
        });
      }
      if (applicant.endTime) {
        return res.status(403).json({
          error: "Test already ended",
        });
      }
      // Check if the test duration has passed
      const durationInMinutes = test.duration;
      const durationInMilliseconds = durationInMinutes * 60 * 1000;
      const currentTime = new Date();
      const timeElapsed = currentTime - applicant.startTime;
      if (timeElapsed > durationInMilliseconds) {
        return res.status(403).json({
          error: "Test duration has expired",
        });
      }

      // Calculate the score based on submitted answers
      const candidateAnswers = req.body.answers || [];
      const testQuestions = test.questions || [];

      let totalPoints = 0;
      let earnedPoints = 0;
      // console.log("Candidate answers:", candidateAnswers);
      // console.log("Test questions:", testQuestions);

      // Process each question and calculate score
      testQuestions.forEach((question, index) => {
        const candidateAnswer = candidateAnswers[index];
        const questionPoints = parseInt(question.points) || 0;
        totalPoints += questionPoints;

        // Skip if candidate didn't answer this question
        if (!candidateAnswer && candidateAnswer !== 0) return;

        switch (question.type) {
          case "multiple_choice":
            // Check if the selected option index matches correct answer
            if (parseInt(candidateAnswer) === question.correctAnswer) {
              earnedPoints += questionPoints;
            }
            break;

          case "text":
            // For text questions, give full marks for now
            // Later can implement text similarity comparison
            earnedPoints += questionPoints;
            break;

          case "code":
            // For code questions, give full marks for now
            // Later would integrate with code evaluation service
            earnedPoints += questionPoints;
            break;

          default:
            // Unknown question type
            break;
        }
      });

      // Calculate percentage score (0-100)
      const scorePercent =
        totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
      console.log("Total points:", totalPoints);
      console.log("Earned points:", earnedPoints);
      console.log("Score percentage:", scorePercent);
      // Record the end time and score
      applicant.endTime = new Date();

      // Update the hiring process to reflect this score
      if (applicant.hiringProcess) {
        let hiringProcess = [];
        try {
          hiringProcess = JSON.parse(applicant.hiringProcess);
        } catch (e) {
          console.error("Error parsing hiring process:", e);
        }

        // Find and update the stage that matches the applicant's status
        const testStageIndex = hiringProcess.findIndex(
          (stage) => stage.name === applicant.status
        );
        console.log("Test stage index:", testStageIndex);

        if (testStageIndex !== -1) {
          hiringProcess[testStageIndex].score = parseInt(scorePercent);
          hiringProcess[testStageIndex].status = "Completed";
          hiringProcess[testStageIndex].completedDate = new Date()
            .toISOString()
            .split("T")[0];
          applicant.hiringProcess = JSON.stringify(hiringProcess);
        }
      }
      console.log(earnedPoints, scorePercent);

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

//Warning POST
router.post(
  "/:id/warning",
  authenticateJWT,
  authorizeUserType("candidate"),
  async (req, res) => {
    try {
      const applicant = await Applicant.findOne({
        where: {
          candidateId: req.user.id,
          hiringTestId: req.params.id,
        },
      });
      if (!applicant) {
        return res.status(404).json({ error: "Hiring test not found" });
      }

      // Ensure warnings is properly initialized as an array
      let warnings = [];
      if (applicant.warnings) {
        // Handle both array and non-array cases for robustness
        warnings = Array.isArray(applicant.warnings)
          ? [...applicant.warnings]
          : [applicant.warnings];
      }

      // Add new warning with proper timestamp
      // console.log("Received warning payload:", req.body); // Debug log

      if (req.body.message) {
        warnings.push({
          timestamp: req.body.timestamp || new Date().toISOString(),
          warning: req.body.message,
        });
      }

      // console.log("Saving warnings:", warnings); // Debug log

      // Update applicant with new warnings - force save with explicit transaction
      await sequelize.transaction(async (t) => {
        applicant.warnings = warnings;
        await applicant.save({ transaction: t });
      });

      // Verify the update by reloading
      await applicant.reload();

      // Check if warnings exceed threshold
      if ((applicant.warnings?.length || 0) > 50) {
        // Set end time since test is being terminated due to warnings
        await applicant.update({ endTime: new Date() });
        return res.json({
          message: "Test terminated due to excessive warnings",
          warningCount: warnings.length,
          shouldExit: true,
        });
      }

      // Return current warnings count
      return res.json({
        message: "Warning recorded",
        warningCount: warnings.length,
        shouldExit: false,
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
  authorizeUserTypes(["hrManager", "hr"]),
  async (req, res) => {
    console.log("Creating hiring test");
    let orgid = null;
    if (req.user.type === "hrManager") {
      const hrm = await HRManager.findByPk(req.user.id);
      orgid = hrm.organizationId;
    } else if (req.user.type === "hr") {
      const hr = await HR.findByPk(req.user.id);
      orgid = hr.organizationId;
    } else {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      // Check if request contains an id for a ready-made test
      if (
        req.body.id &&
        (Object.keys(req.body).length === 1 ||
          (Object.keys(req.body).length === 2 && req.body.jobId))
      ) {
        // Find the ready-made test with the provided id
        const readyMadeTest = HIRING_TESTS.find(
          (test) => test.id === req.body.id
        );

        if (readyMadeTest) {
          // Calculate total marks from questions for ready-made test
          let totalMarks = 0;
          if (
            readyMadeTest.questions &&
            Array.isArray(readyMadeTest.questions)
          ) {
            totalMarks = readyMadeTest.questions.reduce((sum, question) => {
              return sum + (Number(question.points) || 0);
            }, 0);
          }

          // Make sure jobId is required in the request body
          if (!req.body.jobId) {
            return res.status(400).json({
              error: "jobId is required when creating a test from a template",
            });
          }

          // Use the ready-made test data to create a new test
          const { id, ...testData } = readyMadeTest;

          const test = await HiringTest.create({
            ...testData,
            organizationId: orgid,
            jobId: req.body.jobId,
            totalMarks: totalMarks || 100, // Ensure totalMarks is set
          });
          return res.status(201).json(test);
        } else {
          return res.status(404).json({ error: "Ready-made test not found" });
        }
      }

      // Original logic for custom test creation
      let totalMarks = 0;
      if (req.body.questions && Array.isArray(req.body.questions)) {
        totalMarks = req.body.questions.reduce((sum, question) => {
          return sum + (Number(question.marks) || 0);
        }, 0);
      }

      const test = await HiringTest.create({
        ...req.body,
        organizationId: orgid,
        totalMarks, // Set the calculated totalMarks
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
  authorizeUserTypes(["hrManager", "hr"]),
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
  authorizeUserTypes(["hrManager", "hr"]),
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
