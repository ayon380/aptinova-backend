// --- Imports (CommonJS) ---
const express = require('express');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const dotenv = require('dotenv'); // For loading environment variables

dotenv.config(); // Load .env file variables into process.env

// --- Configuration ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Ensure you are using a model that supports the desired output and potentially responseMimeType
const MODEL_NAME = "gemini-1.5-pro-latest"; // Or your specific experimental model if needed

// --- Gemini AI Setup ---
let genAI;
let geminiModel;

if (!GEMINI_API_KEY) {
    console.error("❌ Critical Error: GEMINI_API_KEY not found in environment variables.");
    // Handle this appropriately in your application startup
} else {
    try {
        genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        geminiModel = genAI.getGenerativeModel({ model: MODEL_NAME });
        console.log(`✨ HR Analyzer: Gemini AI SDK configured with model: ${MODEL_NAME}`);
    } catch (error) {
        console.error(`❌ HR Analyzer: Error configuring Gemini SDK: ${error}`);
        geminiModel = null; // Ensure model is null if setup fails
    }
}

// --- Gemini Prompt Generation ---
function createHrAnalysisPrompt(description) {
    // This prompt is adapted from your Python example, instructing Gemini to return only JSON.
    return `
Analyze the following job description provided by HR. Extract the required technical skills, soft skills, additional beneficial skills (even if not explicitly mentioned but generally required), potential red flags based on the description, and the minimum years of experience required.

Return ONLY a valid JSON object adhering strictly to the specified structure. Do NOT include any explanatory text, markdown formatting (like \`\`\`json), comments, or anything outside the single JSON object itself.

Job Description:
---
${description}
---

Strict JSON Output Structure:
{{
  "technical_skills": ["List of technical skills explicitly mentioned or strongly implied (e.g., specific software, programming languages, methodologies)"],
  "soft_skills": ["List of soft skills explicitly mentioned or strongly implied (e.g., communication, teamwork, leadership, problem-solving)"],
  "additional_skills": ["List of skills beneficial for this type of role but not explicitly stated in the description (use domain knowledge)"],
  "red_flags": ["List potential concerns or ambiguities based SOLELY on the provided text (e.g., vague responsibilities, unrealistic expectations if apparent, lack of clarity)"],
  "minimum_experience_years": Number | null // Extract the number of years if mentioned (e.g., "5+ years" -> 5, "minimum 3 years" -> 3), otherwise null
}}

**Important Rules:**
- Output ONLY the JSON object starting with '{' and ending with '}'.
- Infer requirements reasonably based on the role type if not explicitly stated (especially for 'additional_skills').
- If minimum experience is mentioned, extract the numerical value. If ambiguous or not mentioned, use null.
- Be objective when identifying 'red_flags'; base them only on the text.
`;
}

// --- Gemini API Call and Parsing Logic ---
async function analyzeJobDescriptionGemini(description) {
    if (!geminiModel) {
        console.error("❌ HR Analyzer: Gemini model is not available.");
        throw new Error("Gemini model not initialized.");
    }
    // console.log(description)

    const prompt = createHrAnalysisPrompt(description);

    // Configuration for the generation - requesting JSON output directly if model supports it
    const generationConfig = {
        responseMimeType: "application/json", // Request JSON output directly
        maxOutputTokens: 99999, // Adjust as needed for potentially longer descriptions/outputs
        temperature: 0.3,      // Slightly higher temp for nuanced interpretation but still focused
    };

    // Standard safety settings
    const safetySettings = [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];

    try {
        console.log("⏳ HR Analyzer: Calling Gemini API...");
        const startTime = Date.now();

        const result = await geminiModel.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig,
            safetySettings,
        });

        const response = result.response;
        const endTime = Date.now();
        console.log(`⏱️ HR Analyzer: Gemini API call took: ${(endTime - startTime) / 1000} seconds`);

        // Check for safety blocks or missing response
        if (!response || response.promptFeedback?.blockReason) {
            const blockReason = response?.promptFeedback?.blockReason || "Unknown";
            console.error(`❌ HR Analyzer: Content generation blocked due to: ${blockReason}`);
            throw new Error(`Gemini content blocked: ${blockReason}`);
        }

        // Extract text and attempt to parse
        const responseText = response.text();
        console.log("Raw Gemini Response (HR Analyzer):", responseText.substring(0, 200) + "..."); // Log start of response

        // Attempt to parse the response directly as JSON (since we requested application/json)
        try {
            const parsedJson = JSON.parse(responseText);
            console.log("✅ HR Analyzer: Successfully parsed JSON response directly.");
            // Basic validation of expected structure (optional but recommended)
            if (typeof parsedJson === 'object' && parsedJson !== null &&
                Array.isArray(parsedJson.technical_skills) &&
                Array.isArray(parsedJson.soft_skills)) {
                 return parsedJson;
            } else {
                 console.warn("⚠️ HR Analyzer: Parsed JSON lacks expected structure.");
                 // Decide whether to return potentially incomplete data or throw error
                 // For now, return it, but logging the warning is important.
                 return parsedJson;
                 // Alternatively: throw new Error("Parsed JSON from Gemini does not match expected structure.");
            }

        } catch (jsonError) {
            console.error(`❌ HR Analyzer: Failed to parse Gemini response as JSON: ${jsonError.message}`);
            console.error("--- Full Gemini Raw Response (HR Analyzer) ---");
            console.error(responseText);
            // If direct parsing fails even with responseMimeType, maybe the model didn't comply
            // You could add regex fallback here if needed, but ideally the model respects the mime type.
            throw new Error(`Failed to parse JSON response from Gemini: ${jsonError.message}`);
        }

    } catch (error) {
        console.error(`❌ HR Analyzer: Error calling Gemini API or processing response:`, error);
        // Rethrow a more specific error for the route handler
        throw new Error(`Gemini API or processing error (HR Analyzer): ${error.message}`);
    }
}

// --- Express Router Setup ---
const router = express.Router();

// --- API Route Definition ---
// This route expects a JSON body with a 'description' field
router.post('/analyzeJobDescription', express.json(), async (req, res) => {
    console.log("\n🚀 Received request for /api/analyzeJobDescription");

    // --- Basic Checks ---
    if (!geminiModel) {
        return res.status(503).json({ error: "Service Unavailable: Gemini model not initialized." });
    }
    console.log(req.body);
    const { description } = req.body;

    // Input validation
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
        return res.status(400).json({ error: "Job description is missing or empty in the request body. Please provide it in the 'description' field." });
    }

    console.log(`📄 Analyzing description (length: ${description.length})`);

    try {
        // --- Call Gemini for analysis ---
        const structuredData = await analyzeJobDescriptionGemini(description);

        // --- Send successful response ---
        console.log(`✅ Successfully analyzed job description. Sending JSON response.`);
        return res.status(200).json(structuredData);

    } catch (error) {
        // Catch errors thrown from the analysis function
        console.error(`❌ Error during job description analysis:`, error);
        let statusCode = 500; // Internal Server Error by default
        if (error.message.includes("Gemini content blocked")) statusCode = 400;
        else if (error.message.includes("Failed to parse JSON")) statusCode = 502; // Bad Gateway (issue with upstream Gemini response)
        else if (error.message.includes("Gemini API or processing error")) statusCode = 502;

        console.error(`❌ Failed processing job description. Sending error response. Status: ${statusCode}`);
        return res.status(statusCode).json({
            error: "Failed to analyze job description.",
            details: error.message
        });
    }
});

// --- Export the router ---
module.exports = router; // Make the router available for use
