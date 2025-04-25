// aiGradingRouter.js
'use strict';

// --- Imports (CommonJS) ---
const express = require('express');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const dotenv = require('dotenv');

dotenv.config(); // Load .env file variables into process.env

// --- Configuration ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Use a model suitable for this task. Flash is fast and often sufficient.
const MODEL_NAME = "gemini-1.5-flash-latest"; // Or "gemini-1.5-pro-latest"

// --- Gemini AI Setup ---
let genAI;
let geminiModel;

if (!GEMINI_API_KEY) {
    console.error("❌ Critical Error (AI Grader): GEMINI_API_KEY not found in environment variables.");
    // In a real app, you might prevent startup or disable this route
} else {
    try {
        genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        geminiModel = genAI.getGenerativeModel({ model: MODEL_NAME });
        console.log(`✨ AI Grader: Gemini AI SDK configured with model: ${MODEL_NAME}`);
    } catch (error) {
        console.error(`❌ AI Grader: Error configuring Gemini SDK: ${error}`);
        geminiModel = null; // Ensure model is null if setup fails
    }
}

// --- Gemini Prompt Generation ---
function createGradingPrompt(question, correctAnswer, userAnswer) {
    // This prompt instructs Gemini to return only the score.
    return `
    You are an AI grading assistant evaluating a user's answer to a subjective question based on a provided model answer.

    Question:
    ${question}

    Model Answer (Key points expected):
    ${correctAnswer}

    User's Answer:
    ${userAnswer}

    Instructions:
    1. Assess the factual correctness of the user's answer compared to the model answer.
    2. Assess how comprehensively the user's answer covers the essential points mentioned in the model answer (coverage).
    3. Assign a final score out of 100 based on these factors: 60% weight for correctness and 40% weight for coverage.
    4. Respond ONLY with the final numerical score (an integer between 0 and 100).
    5. Do NOT include any explanation, introductory text, labels, markdown formatting, or anything besides the single integer score.

    Score (0-100):
    `;
}

// --- Gemini API Call and Parsing Logic ---
async function getAIScore(questionData) {
    if (!geminiModel) {
        console.error("❌ AI Grader: Gemini model is not available.");
        // Return null or throw an error to indicate the service is down
        // Returning null allows partial success if only some calls fail later
        return null;
    }

    const { question, correctAnswer, userAnswers } = questionData;

    // Handle empty user answer explicitly before calling AI
    if (typeof userAnswers !== 'string' || userAnswers.trim() === '') {
        console.warn(`⚠️ AI Grader: User answer is empty for question (returning score 0): "${question.substring(0, 50)}..."`);
        return 0;
    }
    // Check for missing correct answer (critical for grading)
    if (typeof correctAnswer !== 'string' || correctAnswer.trim() === '') {
        console.error(`❌ AI Grader: Cannot grade - Correct answer is missing or empty for question: "${question.substring(0, 50)}..."`);
        return null; // Indicate failure to grade this specific question
    }

    const prompt = createGradingPrompt(question, correctAnswer, userAnswers);

    // Configuration for the generation - request plain text output
    const generationConfig = {
        // responseMimeType: "text/plain", // Explicitly requesting text
        maxOutputTokens: 100,        // Keep low, only need a number
        temperature: 0.4,           // Lower temperature for more consistent scoring
    };

    // Standard safety settings
    const safetySettings = [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];

    try {
        // console.log(`⏳ AI Grader: Calling Gemini API for question: "${question.substring(0, 50)}..."`);
        const startTime = Date.now();

        // Note: Using generateContent(prompt) directly for simple text in/out
        const result = await geminiModel.generateContent({
             contents: [{ role: "user", parts: [{ text: prompt }] }],
             generationConfig,
             safetySettings
        });

        const response = result.response;
        const endTime = Date.now();
        // console.log(`⏱️ AI Grader: Gemini API call took: ${(endTime - startTime) / 1000} seconds`);

        // Check for safety blocks or missing response
        if (!response || response.promptFeedback?.blockReason) {
            const blockReason = response?.promptFeedback?.blockReason || "Unknown";
            console.error(`❌ AI Grader: Content generation blocked due to: ${blockReason} for question: "${question.substring(0, 50)}..."`);
            // Decide how to handle blocked content - return 0 or null?
            return 0; // Returning 0 score if blocked
        }

        // Extract text and attempt to parse as integer
        const responseText = response.text().trim();
        // console.log(`Raw Gemini Response (AI Grader for "${question.substring(0,20)}..."):`, responseText);

        const score = parseInt(responseText, 10);

        // Validate the parsed score
        if (isNaN(score) || score < 0 || score > 100) {
            console.error(`❌ AI Grader: Failed to parse valid score (0-100) from Gemini response: "${responseText}" for question: "${question.substring(0, 50)}..."`);
             // Decide how to handle invalid format - return 0 or null?
            return 0; // Defaulting to 0 if format is unusable
        } else {
             console.log(`✅ AI Grader: Successfully parsed score: ${score} for question: "${question.substring(0, 50)}..."`);
             return score;
        }

    } catch (error) {
        console.error(`❌ AI Grader: Error calling Gemini API or processing response for question "${question.substring(0, 50)}...":`, error);
        // Return null to indicate failure for this specific question
        return null;
    }
}

// --- Express Router Setup ---
const router = express.Router();

// --- API Route Definition ---
// This route expects a JSON body which is an array of question objects
router.post('/grade-subjective', express.json(), async (req, res) => {
    console.log("\n🚀 Received request for /api/grade-subjective");

    // --- Basic Checks ---
    if (!geminiModel) {
        console.error("❌ AI Grader: Route unavailable because Gemini model is not initialized.");
        return res.status(503).json({ error: "Service Unavailable: AI Grader model not initialized." });
    }

    const questions = req.body;

    // Input validation
    if (!Array.isArray(questions)) {
        console.warn("⚠️ AI Grader: Invalid input - Request body must be an array.");
        return res.status(400).json({ error: "Request body must be an array of question objects." });
    }
    if (questions.length === 0) {
        console.log("✅ AI Grader: Received empty question array. Sending empty response.");
        return res.status(200).json([]);
    }

    console.log(`📝 AI Grader: Received ${questions.length} questions. Filtering for subjective text questions...`);

    const results = [];
    let subjectiveCount = 0;

    // Process questions sequentially to maintain order and handle errors individually
    for (let i = 0; i < questions.length; i++) {
        const questionData = questions[i];

        if (questionData && questionData.type === 'text') {
            subjectiveCount++;
            // Further validation for necessary fields
            if (typeof questionData.question !== 'string' || typeof questionData.correctAnswer !== 'string' || typeof questionData.userAnswers === 'undefined') {
                console.warn(`⚠️ AI Grader: Skipping subjective question at index ${i} due to missing fields (question, correctAnswer, or userAnswers). Assigning score 0.`);
                results.push(0); // Assign 0 score for malformed subjective questions
                continue; // Move to the next question
            }

            try {
                // --- Call Gemini for grading ---
                const score = await getAIScore(questionData);

                // Handle null response from getAIScore (indicating an API or critical error)
                if (score === null) {
                    console.error(`❌ AI Grader: Failed to get score for question at index ${i}. Assigning score 0.`);
                    results.push(0); // Assign 0 if grading failed for this question
                } else {
                    results.push(score);
                }

            } catch (individualError) {
                // Catch any unexpected errors during the processing of a single question's score retrieval
                console.error(`❌ AI Grader: Unexpected error processing question at index ${i}:`, individualError);
                results.push(0); // Assign 0 score on unexpected error for this question
            }
        }
        // Non-'text' type questions are implicitly skipped and won't have a score added to results
    }

    console.log(`✅ AI Grader: Processed ${subjectiveCount} subjective questions. Sending ${results.length} scores.`);
    return res.status(200).json(results);

    // Note: No top-level try-catch here because errors are handled per-question.
    // If the *entire* process could fail catastrophically outside the loop, add one.
});

// --- Export the router ---
module.exports = router; // Make the router available for use