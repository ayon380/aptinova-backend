const express = require("express");
const router = express.Router();
const { executeCode } = require("../utils/codeExecution/codeRunner");
const { authenticateJWT, authorizeUserType } = require("../middleware/auth");

// Code execution endpoint
router.post("/execute", authenticateJWT, async (req, res) => {
  const { language, code, testCases, constraints, questionId } = req.body;
  console.log("req.body", req.body);

  if (!language || !code || !testCases || !Array.isArray(testCases)) {
    return res.status(400).json({
      error: "Missing required parameters or invalid format",
    });
  }

  // Default constraints if not provided
  const execConstraints = {
    timeoutMs: constraints?.timeoutMs || 2000,
    memoryLimitMb: constraints?.memoryLimitMb || 50,
  };

  try {
    const result = await executeCode(
      language,
      code,
      testCases,
      execConstraints
    );

    // Calculate total marks
    let totalMarks = 0;
    let totalEarnedMarks = 0;

    if (result.testResults && Array.isArray(result.testResults)) {
      result.testResults.forEach((testResult) => {
        if (testResult.marks !== undefined) {
          totalMarks += testResult.marks;
          if (testResult.passed) {
            totalEarnedMarks += testResult.marks;
          }
        }
      });
    }

    res.json({
      ...result,
      questionId,
      totalMarks,
      earnedMarks: totalEarnedMarks,
      percentage:
        totalMarks > 0 ? Math.round((totalEarnedMarks / totalMarks) * 100) : 0,
    });
  } catch (error) {
    console.error("Code execution error:", error);
    res.status(500).json({
      error: error.message,
      questionId,
    });
  }
});

// Supported languages endpoint
router.get("/supported-languages", (req, res) => {
  res.json({
    supportedLanguages: ["javascript", "python"],
  });
});

module.exports = router;
