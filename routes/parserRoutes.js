// --- Imports (CommonJS) ---
const express = require('express');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const fs = require('fs').promises; // Use promises version of file system
const path = require('path');
const pdf = require('pdf-parse'); // Use standard require for pdf-parse
const mammoth = require('mammoth'); // For DOCX extraction
const dotenv = require('dotenv'); // For loading environment variables
const os = require('os'); // To get temporary directory
const crypto = require('crypto'); // For generating unique temp filenames


// --- Configuration ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-1.5-pro-latest"; // Use latest stable or specify experimental if needed
const MAX_FILE_SIZE = '10mb'; // Set a max file size for the raw body parser

// --- Gemini AI Setup ---
let genAI;
let geminiModel;

if (!GEMINI_API_KEY) {
    console.error("❌ Critical Error: GEMINI_API_KEY not found in environment variables.");
} else {
    try {
        genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        geminiModel = genAI.getGenerativeModel({ model: MODEL_NAME });
        console.log(`✨ Gemini AI SDK configured with model: ${MODEL_NAME}`);
    } catch (error) {
        console.error(`❌ Error configuring Gemini SDK: ${error}`);
        geminiModel = null;
    }
}

// --- Text Extraction Functions ---

/** Extracts text from a PDF file */
async function extractTextFromPdf(filePath) {
    try {
        const data = await pdf(filePath);
        console.log(`📄 PDF text extracted (${path.basename(filePath)})`);
        return data.text.trim();
    } catch (error) {
        console.error(`❌ Error extracting text from PDF ${path.basename(filePath)}:`, error);
        throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
}

/** Extracts text from a DOCX file using Mammoth */
async function extractTextFromDocx(filePath) {
    try {
        const result = await mammoth.extractRawText({ path: filePath });
        console.log(`📄 DOCX text extracted (${path.basename(filePath)})`);
        return result.value.trim();
    } catch (error) {
        console.error(`❌ Error extracting text from DOCX ${path.basename(filePath)}:`, error);
        throw new Error(`Failed to extract text from DOCX: ${error.message}`);
    }
}

// --- Resume Parsing Prompt ---
const extractionPrompt = (resumeText) => `
You are an expert resume parser. Extract the following details from the provided resume text and return ONLY a valid JSON object adhering strictly to the specified structure. Do NOT include any explanatory text, markdown formatting (like \`\`\`json), or anything outside the JSON object itself.

**Strict JSON Structure:**
{{
    "Skills": ["Skill1", "Skill2", "Programming Language", "Database", "Cloud Platform", "Tool"],
    "Experience": [
        {{
            "Company": "Company Name",
            "Position": "Job Title",
            "StartDate": "Month YYYY",
            "EndDate": "Month YYYY or Present",
            "DurationMonths": Number,
            "Location": "City, State",
            "Description": "Bulleted or paragraph summary..."
        }}
    ],
    "Education": [
        {{
            "Institution": "University/College Name",
            "Degree": "Degree Name",
            "Major": "Field of Study",
            "StartDate": "Month YYYY",
            "EndDate": "Month YYYY or Expected Month YYYY",
            "CGPA": "e.g., 8.5/10 or 3.8/4.0",
            "Location": "City, State",
            "RelevantCourses": ["Course1", "Course2"]
        }}
    ],
    "Certifications": [
        {{
            "Name": "Certification Name",
            "IssuingOrganization": "Organization Name",
            "Date": "Month YYYY or YYYY"
        }}
    ],
    "Projects": [
        {{
            "Title": "Project Name",
            "Description": "Detailed description...",
            "Technologies": ["Tech1", "Tech2"],
            "Link": "github.com/..."
        }}
    ],
    "Summary": "A brief professional summary or objective statement, if present.",
    "Languages": ["Language1 (Proficiency)", "Language2 (Proficiency)"],
    "Other": "Any other relevant information extracted like Achievements, Awards, Publications sections..."
}}

*Parsing Rules:*
- Extract data ACCURATELY. Use null or empty list/string for missing fields.
- Standardize date formats (Month YYYY or YYYY). Use "Present" for current roles/education.
- Calculate 'DurationMonths' only if start and end dates are clearly present and calculable. Otherwise use null.
- Infer skills broadly (technical, soft skills, tools).
- Keep 'Description' comprehensive for Experience and Projects.
- If an 'Other' section exists, capture its text content.
- Return ONLY the JSON object. Start with \`{{\` and end with \`}}\`. No extra text or markdown.

Resume Content:
---
${resumeText}
---

JSON Output:
`;


// --- Gemini API Call and Parsing Logic ---
async function extractResumeDataGemini(resumeText) {
    if (!geminiModel) {
        console.error("❌ Gemini model is not available. Check API Key and SDK setup.");
        throw new Error("Gemini model not initialized.");
    }

    const prompt = extractionPrompt(resumeText);

    const generationConfig = {
        // responseMimeType: "application/json", // Consider enabling for Gemini 1.5 Pro if prompt adjusted
        maxOutputTokens: 8192,
        temperature: 0.2,
    };

    const safetySettings = [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];

    try {
        console.log("⏳ Calling Gemini API...");
        const startTime = Date.now();

        const result = await geminiModel.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig,
            safetySettings,
        });

        const response = result.response;
        const endTime = Date.now();
        console.log(`⏱️ Gemini API call took: ${(endTime - startTime) / 1000} seconds`);

        if (!response || response.promptFeedback?.blockReason) {
            const blockReason = response?.promptFeedback?.blockReason || "Unknown";
            console.error(`❌ Content generation blocked due to: ${blockReason}`);
            throw new Error(`Gemini content blocked: ${blockReason}`);
        }

        // Use response.text() which is the standard method
        const responseText = response.text();
        console.log("Raw Gemini Response Length:", responseText ? responseText.length : 0);
        if (!responseText) {
            console.error("❌ Gemini response text is empty.");
            throw new Error("Gemini API returned an empty response.");
        }

        // Cleaning and Workaround (Keep robust parsing)
        const cleanedText = responseText.trim().replace(/^```json\s*|\s*```$/g, '').trim();
        // Handle potential double braces from the prompt example (less likely with model improvements, but safe)
        let fixedText = cleanedText.replace(/\{\{/g, '{').replace(/\}\}/g, '}');

        // Robust JSON Parsing
        let parsedJson = null;
        try {
            parsedJson = JSON.parse(fixedText);
            console.log("✅ Successfully parsed JSON directly (after workaround).");
        } catch (jsonError) {
            console.warn(`⚠️ Direct JSON parsing failed (after workaround): ${jsonError.message}. Attempting regex extraction...`);
            // Regex to find the outermost JSON object
            const jsonMatch = fixedText.match(/\{[\s\S]*\}/);
            if (jsonMatch && jsonMatch[0]) {
                try {
                    parsedJson = JSON.parse(jsonMatch[0]);
                    console.log("✅ Successfully parsed JSON using regex (after workaround).");
                } catch (regexJsonError) {
                    console.error(`❌ Regex JSON parsing also failed (after workaround): ${regexJsonError.message}`);
                    console.error("--- String Portion Regex Tried (first 500 chars) ---");
                    console.error(jsonMatch[0].substring(0, 500) + "...");
                    throw new Error(`Failed to parse JSON response from Gemini (Regex Attempt): ${regexJsonError.message}`);
                }
            } else {
                console.error("❌ No JSON object found in the response using regex (after workaround).");
                console.error("--- Gemini Response Portion (first 500 chars) ---");
                console.error(fixedText.substring(0, 500) + "...");
                throw new Error("Failed to parse JSON response from Gemini (No JSON object found via Regex).");
            }
        }

        if (!parsedJson) {
            // Should not happen if parsing succeeded, but as a failsafe
            throw new Error("Failed to parse JSON response from Gemini (Parsing resulted in null).");
        }

        return parsedJson;

    } catch (error) {
        console.error(`❌ Error calling Gemini API or processing response:`, error);
        // Rethrow with a more specific type if possible, otherwise bubble up
        throw new Error(`Gemini API or processing error: ${error.message}`);
    }
}


// --- Schema Conversion Functions ---

/**
 * Parses potentially incomplete date strings (like "Sep 2023", "Present", or YYYY) into ISO 8601 format (YYYY-MM-DD).
 * Handles "Present" by returning null.
 * Attempts to create a valid date, defaulting to the 1st of the month if only month/year is provided.
 * Returns null if parsing fails or input is invalid.
 */
function parseFlexibleDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') {
        return null;
    }

    const cleanedStr = dateStr.trim();

    if (cleanedStr.toLowerCase() === 'present') {
        return null; // Represents ongoing
    }

    // Try parsing formats like "Mon YYYY" (e.g., "Sep 2023") or "YYYY-MM-DD" directly
    try {
        const date = new Date(cleanedStr);
        // Check if the date is valid. Invalid dates often result in NaN time.
        if (!isNaN(date.getTime())) {
            // Ensure year seems reasonable (e.g., not default 1970 from bad parse if only month given)
            // Also check if the input string *contains* a year digit - Date() might parse "June" to June 1st of current year
            if (date.getFullYear() > 1900 && date.getFullYear() < 2100 && /\d{4}/.test(cleanedStr)) {
                // Format to YYYY-MM-DD
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
                // Use getDate() which will be 1 if only month/year was parsed
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
        }
    } catch (e) {
        // Ignore parsing errors here, try next formats
    }

    // Try parsing just a year (YYYY)
    const yearMatch = cleanedStr.match(/^(\d{4})$/);
    if (yearMatch) {
        const year = parseInt(yearMatch[1], 10);
        if (year > 1900 && year < 2100) {
            return `${year}-01-01`; // Default to Jan 1st of the year
        }
    }

    // Try parsing Month YYYY format specifically if Date() failed or gave wrong year
    const monthYearMatch = cleanedStr.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{4})$/i);
    if (monthYearMatch) {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        // Match start of month name robustly
        const monthStr = monthYearMatch[1].toLowerCase().substring(0, 3);
        const monthIndex = months.findIndex(m => m.toLowerCase() === monthStr);
        if (monthIndex !== -1) {
            const year = parseInt(monthYearMatch[2], 10);
            const month = String(monthIndex + 1).padStart(2, '0');
            if (year > 1900 && year < 2100) {
                return `${year}-${month}-01`; // Default to 1st of the month
            }
        }
    }

    console.warn(`Could not parse date string: "${dateStr}". Returning null.`);
    return null; // Return null if no format matches or parsing fails
}

/**
 * Parses the 'Other' string from Gemini output to extract achievements matching the schema.
 * Schema requires: title (string), description (string), date (date YYYY-MM-DD)
 */
function parseAchievements(otherString) {
    if (!otherString || typeof otherString !== 'string') {
        return [];
    }
    const achievements = [];
    // Simple approach: look for lines potentially listing achievements, often starting with markers or containing years.
    const lines = otherString.split('\n');

    lines.forEach(line => {
        const trimmedLine = line.trim();
        // Example heuristic: Look for lines starting with common markers or containing a year in parenthesis/at the end
        // This needs refinement based on actual "Other" field content patterns from Gemini.
        if (trimmedLine.startsWith('-') || trimmedLine.startsWith('*') || /\(\d{4}\)$|\b\d{4}\b/.test(trimmedLine)) {
            let potentialTitle = trimmedLine.replace(/^[-*\s]+/, ''); // Remove list markers
            let date = null;
            let description = potentialTitle; // Default description to title

            // Try extracting a year (improves chances of it being an achievement/award)
            const dateMatch = potentialTitle.match(/\b(\d{4})\b/g); // Find any 4-digit year
            if (dateMatch) {
                 // Take the last year found as most likely relevant date
                 const yearStr = dateMatch[dateMatch.length - 1];
                 date = parseFlexibleDate(yearStr); // Format to YYYY-01-01
                 // Refine title by removing the date part if needed (optional)
                 // potentialTitle = potentialTitle.replace(yearStr, '').replace(/[()\s,]+$/, '').trim();
            }

            // Only add if we could parse a date, as schema validator requires it
            if (potentialTitle && date) {
                 achievements.push({
                    title: potentialTitle,
                    description: description, // Using full line as description for now
                    date: date,
                });
            }
            // No console warning here as many lines in 'Other' won't be achievements
        }
    });

    // If specific "Achievements:" header exists, prioritize parsing that section
    const achievementHeaderIndex = lines.findIndex(line => line.trim().toLowerCase().startsWith('achievements:'));
    if (achievementHeaderIndex !== -1) {
        const specificAchievements = [];
        for (let i = achievementHeaderIndex + 1; i < lines.length; i++) {
             const line = lines[i];
             const trimmedLine = line.trim();
             if (trimmedLine === '' || /^[A-Z\s]+:/.test(trimmedLine)) { // Stop if empty line or new section header
                 break;
             }
             if (trimmedLine.startsWith('-') || trimmedLine.startsWith('*')) {
                const achievementText = trimmedLine.substring(1).trim();
                const dateMatch = achievementText.match(/\((\d{4})\)$|\b(\d{4})\b/); // Match (YYYY) or just YYYY
                let title = achievementText;
                let date = null;
                let description = achievementText; // Use full text as description

                if (dateMatch) {
                    // Prefer year in parens if found, else standalone year
                    const yearStr = dateMatch[1] || dateMatch[2];
                    date = parseFlexibleDate(yearStr);
                    // Attempt to clean title (remove date/parens from end)
                    title = title.replace(/\(?\d{4}\)?\s*$/, '').trim().replace(/,$/, '');
                }

                if (title && date) { // Require title and date for schema
                    specificAchievements.push({
                        title: title,
                        description: description,
                        date: date,
                    });
                } else {
                     console.warn(`Skipping potential achievement under header due to missing title or parsable date: "${trimmedLine}"`);
                }
            }
        }
        // If we found specific achievements under a header, return those instead of the general parse
        if (specificAchievements.length > 0) {
            return specificAchievements;
        }
    }


    return achievements; // Return achievements found via general heuristics or empty array
}


/**
 * Converts the AI-extracted candidate JSON (from Gemini) to the format expected by the Sequelize Candidate model schema.
 * @param {object} inputJson - The candidate data extracted by AI (matching Gemini's output structure).
 * @returns {object|null} - An object formatted according to the Candidate schema, or null if input is invalid.
 */
function convertCandidateJsonToSchema(inputJson) {
    if (!inputJson || typeof inputJson !== 'object') {
         console.error("Invalid input to convertCandidateJsonToSchema: inputJson is null or not an object.");
        return null;
    }

    console.log("Mapping AI JSON to DB Schema...");

    const outputCandidate = {
        // --- Fields typically NOT in resume text, default to null/defaults ---
        // id: null, // Will be generated by DB
        // subscriptionId: null,
        // subscriptionStatus: "inactive",
        // subscriptionPlanId: null,
        // subscriptionStartDate: null,
        // subscriptionEndDate: null,
        // subscriptionType: "FREE",
        // subscriptionTier: null,
        // password: null, // Handled separately
        // profilePicture: null,
        // email: null, // Requires separate extraction/input
        // firstName: null, // Requires separate extraction/input
        // lastName: null, // Requires separate extraction/input
        // googleAccessToken: null,
        // googleRefreshToken: null,
        // resetToken: null,
        // resetTokenExpiry: null,
        // status: "dormant",
        // phone: null, // Requires separate extraction/input
        // title: null, // Professional title/headline, maybe from Summary?
        // experience: null, // Schema field 'experience' seems like a summary string (e.g. "5 years"), not the detailed list.
        // industry: null, // Needs inference or separate input
        // location: null, // Top-level location, maybe from latest job/education?
        // desiredSalary: null,
        // workPreference: null, // e.g., 'remote', 'hybrid', 'onsite'
        // country: null, // Needs inference or separate input
        // currency: null,
        // linkedin: null, // Needs separate extraction/input
        // github: null,   // Needs separate extraction/input
        // portfolio: null,// Needs separate extraction/input
        // resume: null,   // Link to the resume file usually stored separately
        // colours: null,  // UI preference?
        // publications: [], // Schema expects JSONB array, AI output doesn't have this field standard.
        // awards: [],     // Schema expects JSONB array, could potentially parse 'Other' if structured well by AI.

        // --- Mapped Fields from AI JSON ---

        // bio: inputJson.Summary || null, // Map Summary to bio

        // Use empty arrays as default if AI returns null or field is missing
        skills: Array.isArray(inputJson.Skills) ? inputJson.Skills : [],
        languages: Array.isArray(inputJson.Languages) ? inputJson.Languages : [],

        workExperience: Array.isArray(inputJson.Experience) ? inputJson.Experience.map(exp => {
            if (!exp || typeof exp !== 'object') return null; // Basic check

            const startDate = parseFlexibleDate(exp.StartDate);
            const endDate = parseFlexibleDate(exp.EndDate); // Handles "Present" -> null
            const isPresent = exp.EndDate === 'Present' || endDate === null; // Determine if current based on input or parsed end date

            // Schema validator requires: company, position, description, startDate
            if (!exp.Company || !exp.Position || !exp.Description || !startDate) {
                console.warn("Skipping invalid work experience entry (missing required fields):", exp);
                return null; // Skip entries missing essential fields for DB schema
            }

            // Additional check based on validator logic (isPresent=true means endDate MUST be null)
            if (isPresent && endDate !== null) {
                console.warn(`Experience has EndDate '${exp.EndDate}' but is also marked as Present. Forcing endDate to null for DB schema.`, exp);
                endDate = null;
            }

            return {
                company: exp.Company,
                position: exp.Position,
                description: exp.Description,
                startDate: startDate, // Should be YYYY-MM-DD
                endDate: endDate,     // Should be YYYY-MM-DD or null
                isPresent: isPresent, // Not in schema but useful for validation logic
                // location: exp.Location, // Schema doesn't specify location *within* workExperience object array
            };
        }).filter(exp => exp !== null) : [], // Ensure it's an array, filter out nulls

        education: Array.isArray(inputJson.Education) ? inputJson.Education.map(edu => {
             if (!edu || typeof edu !== 'object') return null;

            const startDate = parseFlexibleDate(edu.StartDate);
            const endDate = parseFlexibleDate(edu.EndDate); // Handles "Present" or expected dates
            const currentlyStudying = (typeof edu.EndDate === 'string' && edu.EndDate.toLowerCase().includes('present')) || endDate === null;

            // Schema validator requires: institution, degree, fieldOfStudy, startDate
            // Map AI's 'Major' to schema's 'fieldOfStudy'
            if (!edu.Institution || !edu.Degree || !edu.Major || !startDate) {
                console.warn("Skipping invalid education entry (missing required fields):", edu);
                return null;
            }
            // Validator check: endDate needed if not currentlyStudying
            if (!currentlyStudying && !endDate) {
                console.warn(`Education entry is not 'Present'/'current' but lacks a valid EndDate. Skipping for DB schema.`, edu);
                return null;
            }
             // If currently studying, ensure end date is null for schema
            if (currentlyStudying && endDate !== null) {
                 console.warn(`Education marked as current has EndDate '${edu.EndDate}'. Forcing endDate to null for DB schema.`, edu);
                 endDate = null;
            }


            return {
                institution: edu.Institution,
                degree: edu.Degree,
                fieldOfStudy: edu.Major, // Mapping Major to fieldOfStudy
                startDate: startDate, // YYYY-MM-DD
                endDate: endDate,     // YYYY-MM-DD or null
                currentlyStudying: currentlyStudying, // Not in schema but useful for validation
                // cgpa: edu.CGPA, // Schema doesn't specify CGPA within education object array
                // location: edu.Location, // Schema doesn't specify location within education object array
            };
        }).filter(edu => edu !== null) : [], // Ensure it's an array, filter out nulls

        certifications: Array.isArray(inputJson.Certifications) ? inputJson.Certifications.map(cert => {
            if (!cert || typeof cert !== 'object') return null;

            const issueDate = parseFlexibleDate(cert.Date); // Parse date (Month YYYY or YYYY)

            // Schema validator requires: title, issuer, issueDate
            // Map AI's 'Name' to schema's 'title', 'IssuingOrganization' to 'issuer'
            if (!cert.Name || !cert.IssuingOrganization) {
                console.warn("Skipping invalid certification entry (missing Name or IssuingOrganization):", cert);
                return null;
            }
            // Handle the date requirement - if input is null/unparseable, schema validation might fail
            if (!issueDate) {
                console.warn(`Certification "${cert.Name}" is missing a valid issue date. Storing as null, but DB validation might fail.`);
                // Return null if date is strictly required by DB and cannot be null
                // return null;
            }

            return {
                title: cert.Name,
                issuer: cert.IssuingOrganization,
                issueDate: issueDate, // YYYY-MM-DD or potentially null
            };
        }).filter(cert => cert !== null) : [], // Ensure it's an array, filter out nulls

        projects: Array.isArray(inputJson.Projects) ? inputJson.Projects.map(proj => {
             if (!proj || typeof proj !== 'object') return null;

            // Schema validation requires: title, description, technologies (array), link (string), startDate (date), endDate (date/null)
            // *** INPUT JSON FROM AI LACKS START/END DATES FOR PROJECTS ***
            // This WILL FAIL schema validation unless placeholders are used AND VALIDATOR ALLOWS THEM
            // Using placeholders here, acknowledge this limitation.

            const requiredLink = proj.Link || ""; // Validator expects a string, use empty string if null/missing
            const placeholderDate = '1970-01-01'; // Placeholder for missing dates - NEEDS VALIDATOR ACCEPTANCE

            // Check required fields from AI output
            if (!proj.Title || !proj.Description || !Array.isArray(proj.Technologies)) {
                console.warn("Skipping invalid project entry (missing Title, Description, or Technologies array):", proj);
                return null;
            }

            return {
                title: proj.Title,
                description: proj.Description,
                technologies: proj.Technologies, // Should be an array
                link: requiredLink, // Should be a string
                // --- Using placeholders for missing required dates ---
                startDate: placeholderDate, // Input JSON doesn't provide this
                endDate: null, // Input JSON doesn't provide this, null is valid if project is ongoing/end date unknown
                // --- End placeholders ---
            };
        }).filter(proj => proj !== null) : [], // Ensure it's an array, filter out nulls

        // Parse 'Other' field for achievements matching schema structure (title, description, date)
        achievements: parseAchievements(inputJson.Other),
    };

    // --- Post-processing: Infer some top-level fields if possible ---

    // Example: Infer top-level location/country from latest education
    if (outputCandidate.education && outputCandidate.education.length > 0) {
        // Find the original education entry corresponding to the *first* mapped entry
        // Assumes the first mapped entry corresponds to the latest education
        const latestMappedEdu = outputCandidate.education[0];
        const originalEdu = (inputJson.Education || []).find(e =>
            e.Institution === latestMappedEdu.institution && e.Degree === latestMappedEdu.degree
        );

        if (originalEdu && originalEdu.Location) {
            outputCandidate.location = originalEdu.Location;
            // Basic country inference (example)
            if (/\bIndia\b/i.test(originalEdu.Location)) {
                 outputCandidate.country = 'India';
            } else if (/\bUSA\b|\bUnited States\b/i.test(originalEdu.Location)) {
                 outputCandidate.country = 'USA';
            } // Add more countries as needed
        }
    }

     // Example: Infer top-level title from latest work experience
     if (outputCandidate.workExperience && outputCandidate.workExperience.length > 0) {
         // Find the work experience entry with the latest start date (or null end date)
         const latestExp = outputCandidate.workExperience.reduce((latest, current) => {
            if (!latest) return current;
            if (current.endDate === null && latest.endDate !== null) return current; // Prefer current ongoing
            if (current.endDate === null && latest.endDate === null) { // Both ongoing
                return new Date(current.startDate) > new Date(latest.startDate) ? current : latest;
            }
             if (current.endDate !== null && latest.endDate === null) return latest; // Prefer existing ongoing
             // Both have end dates
             return new Date(current.startDate) > new Date(latest.startDate) ? current : latest;
        }, null);

        if (latestExp && latestExp.position) {
            outputCandidate.title = latestExp.position;
        }
    }


    console.log("✅ Mapping complete.");
    return outputCandidate;
}


// --- Express Router Setup ---
const router = express.Router();

// --- Middleware for Raw Body Parsing ---
const rawBodyParser = express.raw({
    type: [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // MIME type for DOCX
    ],
    limit: MAX_FILE_SIZE // Apply file size limit
});


// --- API Route Definition ---
// Apply the rawBodyParser middleware specifically to this route
router.post('/parseResume', rawBodyParser, async (req, res) => {
    console.log("\n🚀 Received request for /api/parseResume (expecting raw body)");

    // --- Basic Checks ---
    if (!geminiModel) {
        return res.status(503).json({ error: "Service Unavailable: Gemini model not initialized." });
    }

    // Check request body validity
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        console.warn("⚠️ Request body is not a buffer or is empty. Check Content-Type header and if data was sent.");
        const contentType = req.headers['content-type'];
        if (!contentType) {
            return res.status(400).json({ error: "Missing Content-Type header. Please set to application/pdf or application/vnd.openxmlformats-officedocument.wordprocessingml.document." });
        } else if (!['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(contentType)) {
            return res.status(415).json({ error: `Unsupported Content-Type: ${contentType}. Only PDF and DOCX are supported.` });
        } else {
            // Caught by raw parser limit? express.raw() might throw error before handler
            // If not caught by limit, it means body is empty
            return res.status(400).json({ error: "Invalid or empty request body. Ensure file content is sent correctly." });
        }
    }

    const fileBuffer = req.body;
    const contentType = req.headers['content-type'];
    let fileExtension;
    let tempFilePath = null;

    // Determine file extension
    if (contentType === 'application/pdf') {
        fileExtension = '.pdf';
    } else if (contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        fileExtension = '.docx';
    } else {
        // Should be caught by type filter, but safety check
        return res.status(415).json({ error: `Unexpected Content-Type: ${contentType}.` });
    }

    console.log(`📄 Received file buffer (${(fileBuffer.length / 1024).toFixed(2)} KB), Content-Type: ${contentType}`);

    let resumeText = null;
    let structuredData = null; // Data directly from Gemini
    let mappedData = null;     // Data mapped to DB Schema
    let processingError = null;

    try {
        // --- Create and write to temporary file ---
        const tempFileName = `resume_${crypto.randomBytes(8).toString('hex')}${fileExtension}`;
        tempFilePath = path.join(os.tmpdir(), tempFileName);
        console.log(`💾 Writing buffer to temporary file: ${tempFilePath}`);
        await fs.writeFile(tempFilePath, fileBuffer);
        console.log(`✅ Buffer successfully written to ${tempFilePath}`);

        // --- 1. Extract Text ---
        console.log(`🔍 Extracting text for type: ${fileExtension}`);
        if (fileExtension === '.pdf') {
            resumeText = await extractTextFromPdf(tempFilePath);
        } else if (fileExtension === '.docx') {
            resumeText = await extractTextFromDocx(tempFilePath);
        }

        // --- 2. Process with Gemini ---
        if (resumeText && resumeText.length > 5) { // Basic check for non-empty text
            console.log(`✅ Text extracted successfully (${resumeText.length} characters).`);
            structuredData = await extractResumeDataGemini(resumeText); // Gets JSON matching AI's structure

            if (structuredData) {
                console.log(`✅ Structured data extracted via Gemini.`);

                // --- 3. Map to DB Schema ---
                try {
                    mappedData = convertCandidateJsonToSchema(structuredData); // Convert AI JSON to DB JSON
                    if (!mappedData) {
                        // The conversion function returned null, likely due to invalid input structure
                        throw new Error("Mapping function returned null, potentially due to issues in the AI-extracted JSON structure.");
                    }
                    console.log("✅ Data successfully mapped to target DB schema.");
                } catch (mappingError) {
                    console.error(`❌ Error mapping AI response to schema:`, mappingError);
                    processingError = `Mapping Error: ${mappingError.message}`;
                    // Invalidate data if mapping failed
                    structuredData = null;
                    mappedData = null;
                }
            } else {
                // Should not happen if extractResumeDataGemini throws errors correctly, but handle just in case
                processingError = "Failed to extract structured data using Gemini (returned null/undefined unexpectedly).";
                console.error(`❌ ${processingError}`);
            }
        } else {
            processingError = "No significant text could be extracted from the file content.";
            console.warn(`⚠️ ${processingError}`);
        }

    } catch (error) {
        // Catch errors from file writing, extraction, Gemini call/parsing
        console.error(`❌ Error during processing pipeline:`, error);
        processingError = error.message || "An unknown processing error occurred.";
         // Check for specific error types if needed (e.g., file size limit from express.raw)
        if (error.type === 'entity.too.large') {
             processingError = `File exceeds size limit of ${MAX_FILE_SIZE}.`;
        }
    } finally {
        // --- 4. Clean up temporary file ---
        if (tempFilePath) {
            try {
                await fs.unlink(tempFilePath); // Delete the temporary file
                console.log(`🗑️ Deleted temporary file: ${tempFilePath}`);
            } catch (unlinkError) {
                // Log warning but don't prevent response sending
                console.warn(`⚠️ Could not delete temporary file ${tempFilePath}:`, unlinkError);
            }
        }
    }

    // --- 5. Send Response ---
    if (mappedData && !processingError) {
        // SUCCESS: Send the data mapped to the DB schema
        // SUCCESS: Filter the mapped data to remove null root components before sending
        const filteredResponse = {};
        for (const key in mappedData) {
            // Keep key if value is not null AND not undefined
            if (mappedData[key] !== null && mappedData[key] !== undefined) {
                 // Note: This keeps empty arrays ([]) and empty strings ("")
                 filteredResponse[key] = mappedData[key];
            }
        }
        console.log(`✅ Filtered response to include only non-null root components.`);
        return res.status(200).json(filteredResponse); // Send the filtered object
        // console.log(`✅ Successfully processed resume. Sending mapped JSON response.`);
        // return res.status(200).json(mappedData);
    } else {
        // FAILURE: Determine appropriate status code based on the error
        let statusCode = 500; // Default Internal Server Error

        if (processingError) {
            if (processingError.includes("Missing Content-Type")) statusCode = 400;
            else if (processingError.includes("Unsupported Content-Type")) statusCode = 415;
            else if (processingError.includes("Invalid or empty request body")) statusCode = 400;
            else if (processingError.includes("exceeds size limit")) statusCode = 413;
            else if (processingError.includes("Failed to extract text")) statusCode = 422; // Content issue
            else if (processingError.includes("No significant text could be extracted")) statusCode = 422; // Content issue
            else if (processingError.includes("Gemini content blocked")) statusCode = 400; // Input issue (potentially)
            else if (processingError.includes("Failed to parse JSON response from Gemini")) statusCode = 502; // Upstream issue
            else if (processingError.includes("Gemini API or processing error")) statusCode = 502; // Upstream issue
            else if (processingError.includes("Gemini API returned an empty response")) statusCode = 502; // Upstream issue
            else if (processingError.includes("Mapping Error")) statusCode = 422; // Content/Structure issue preventing mapping
            else if (processingError.includes("Mapping function returned null")) statusCode = 422; // Content/Structure issue
        }

        // Log the final error details before sending response
        console.error(`❌ Failed processing resume. Sending error response. Status: ${statusCode}, Reason: ${processingError || "Unknown error"}`);

        return res.status(statusCode).json({
            error: "Failed to process resume.",
            details: processingError || "An unknown error occurred."
        });
    }
});

// --- Export the router ---
module.exports = router; // Make the router available