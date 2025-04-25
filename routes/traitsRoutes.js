const express = require("express");
const router = express.Router();

const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

// --- Configuration ---
const MODEL_NAME = "gemini-2.5-pro-exp-03-25"; // Or "gemini-2.5-pro-experimental" if specifically needed and available via API
const API_KEY = process.env.GEMINI_API_KEY;

// Ensure the list here EXACTLY matches the one in the prompt and the desired order
const ALL_TRAITS = [
    "Openness to Experience", "Conscientiousness", "Extraversion", "Agreeableness", "Neuroticism",
    "Emotional Intelligence", "Confidence", "Pessimism", "Optimism", "Analytical Thinking",
    "Empathy", "Leadership", "Introversion", "Resilience", "Curiosity", "Assertiveness",
    "Humility", "Creativity", "Skepticism", "Ambition", "Patience", "Adaptability",
    "Perfectionism", "Collaboration", "Decisiveness", "Self-Discipline", "Enthusiasm",
    "Pragmatism", "Altruism", "Competitiveness", "Attention to Detail", "Risk-Taking"
];

// --- Helper Functions ---

function createGeminiPrompt(inputText) {
    // Use the prompt designed in Step 1
    return `Analyze the following text to identify which of the predefined personality traits are exhibited.

**Text to Analyze:**
\`\`\`
${inputText}
\`\`\`

**Predefined Trait List:**
"Openness to Experience", "Conscientiousness", "Extraversion", "Agreeableness", "Neuroticism", "Emotional Intelligence", "Confidence", "Pessimism", "Optimism", "Analytical Thinking", "Empathy", "Leadership", "Introversion", "Resilience", "Curiosity", "Assertiveness", "Humility", "Creativity", "Skepticism", "Ambition", "Patience", "Adaptability", "Perfectionism", "Collaboration", "Decisiveness", "Self-Discipline", "Enthusiasm", "Pragmatism", "Altruism", "Competitiveness", "Attention to Detail", "Risk-Taking"

**Instructions:**
Return *only* the names of the traits from the list above that are clearly exhibited in the text. The output must be a single string containing these trait names, exactly as they appear in the list, separated only by commas (e.g., "Confidence,Optimism,Leadership"). Do not include any other text, explanations, numbering, bullet points, or introductory/concluding phrases. If no traits from the list are clearly exhibited, return an empty string.`;
}

async function callGeminiApi(prompt) {
    if (!API_KEY) {
        throw new Error("Gemini API key not found in environment variables.");
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    // console.log("Model initialized:", model);

    const generationConfig = {
        temperature: 0.2, // Lower temperature for more deterministic, focused output
        topK: 1,
        topP: 1,
        maxOutputTokens: 10000, // Should be enough for the trait list
    };
    // console.log("Generation config:", generationConfig);

     // Safety settings - adjust as needed, but important for reliable output format
    const safetySettings = [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];

    // console.log("Safety settings:", safetySettings);
    try {
        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig,
          safetySettings,
        });
        console.log("API response received:", result);

        if (!result.response) {
             console.error("Gemini API Error: No response object.", result);
             // Check for blocked content due to safety settings
             if (result.promptFeedback?.blockReason) {
                throw new Error(`Gemini request blocked: ${result.promptFeedback.blockReason}`);
             }
            throw new Error("Gemini API Error: No response object received.");
        }
        const responseText = result.response.text(); // Use .text() method
        console.log("Raw response text:", responseText);
        return responseText.trim(); // Trim whitespace

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        // Re-throw a more specific error or handle it
         if (error.message.includes("quota")) {
             throw new Error("Gemini API quota exceeded.");
         }
        throw new Error(`Gemini API request failed: ${error.message}`);
    }
}

function traitsToIPv4(traitString) {
    // Handle empty string from Gemini -> all zeros
    if (!traitString || traitString.trim() === "") {
        return "0.0.0.0";
    }

    // Split the comma-separated string into an array of found traits
    // Trim whitespace around each trait just in case
    const foundTraitsArray = traitString.split(',').map(trait => trait.trim());

    // Create a Set for efficient lookup
    const foundTraitsSet = new Set(foundTraitsArray);

    // Generate the 32-bit binary string
    let binaryString = "";
    for (const trait of ALL_TRAITS) {
        binaryString += foundTraitsSet.has(trait) ? "1" : "0";
    }

    // Ensure the binary string is exactly 32 characters (should be, based on ALL_TRAITS)
    if (binaryString.length !== 32) {
        console.error(`Error: Binary string length is ${binaryString.length}, expected 32. Traits received: '${traitString}'`);
        // Fallback or throw error - returning zeros might be safest
        return "0.0.0.0"; // Or throw new Error("Internal processing error: Incorrect binary string length.");
    }

    // Split into 4 octets (8-bit chunks)
    const octets = [];
    for (let i = 0; i < 32; i += 8) {
        const byte = binaryString.substring(i, i + 8);
        // Convert binary byte to decimal number
        octets.push(parseInt(byte, 2));
    }

    // Join with dots
    return octets.join('.');
}

router.get("/", async (req, res) => {
    res.send("AI API is working!");
});

router.post("/analyze", async(req, res) => {
    try {
        const { inputText } = req.body;
        // console.log("Received input text:", inputText);

        if (!inputText || typeof inputText !== "string") {
            return res.status(400).json({ error: "Invalid input text. Please provide a valid string." });
        }
        
        // console.log("Sending to Gemini")
        // Generate the Gemini prompt
        const prompt = createGeminiPrompt(inputText);
        // console.log("Generated prompt:", prompt);
        // Call the Gemini API
        const traitsString = await callGeminiApi(prompt);
        console.log("Received traits from Gemini:", traitsString);
        // Convert traits to IPv4 format
        const ipv4Representation = traitsToIPv4(traitsString);
        console.log("IPv4 representation:", ipv4Representation);
        // Check if the traitsString is empty

        // Respond with the results
        res.json({
            traits: traitsString,
            ipv4: ipv4Representation,
        });
    } catch (error) {
        console.error("Error in /analyze endpoint:", error);
        res.status(500).json({ error: "Internal server error. Please try again later." });
    }
});

module.exports = router;