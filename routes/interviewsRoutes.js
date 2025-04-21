const { google } = require("googleapis");
const express = require("express");
const router = express.Router();
const { authenticateJWT, authorizeUserType,authorizeUserTypes } = require("../middleware/auth");
const { sum } = require("../models/organization");
const Interview = require("../models/interview");
const {
  sendInterviewEmail,
  sendInterviewerEmail,
} = require("../utils/emailService");
const Job = require("../models/job");
const Applicant = require("../models/applicant");
const Candidate = require("../models/candidate");

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);
oauth2Client.setCredentials({
  refresh_token: process.env.REFRESH_TOKEN,
});
const calendar = google.calendar({ version: "v3", auth: oauth2Client });

/**
 * Schedule an Interview
 * @route POST /schedule
 * @body { summary, description, startDateTime, duration, interviewers, jobId, applicantId, attendees }
 */
router.post(
  "/schedule",
  authenticateJWT,
  authorizeUserTypes(["hrManager", "candidate"]),
  async (req, res) => {
    try {
      console.log("Starting interview scheduling process");
      const {
        summary,
        description,
        startDateTime,
        duration,
        interviewers,
        jobId,
        applicantId,
        attendees,
      } = req.body;
      console.log(
        summary,
        description,
        startDateTime,
        duration,
        interviewers,
        jobId,
        applicantId,
        attendees
      );
      // Get candidate details
      console.log("Fetching candidate details for ID:", applicantId);
      const applicant = await Applicant.findByPk(applicantId);
      if (!applicant) {
        console.log("Applicant not found for ID:", applicantId);
        return res.status(404).json({ message: "Applicant not found" });
      }
      const candidate = await Candidate.findByPk(applicant.candidateId);
      if (!candidate) {
        console.log("Candidate not found for ID:", applicant.candidateId);
        return res.status(404).json({ message: "Candidate not found" });
      }

      // Calculate end time based on duration (in minutes)
      const startTime = new Date(startDateTime);
      const endTime = new Date(startTime.getTime() + duration * 60000);
      console.log("Calculated time period:", startTime, "to", endTime);

      // Ensure consistent timezone handling
      const timezone = "Asia/Kolkata"; // IST timezone in IANA format

      // Combine attendees and interviewers for the meeting
      const allAttendees = [...(attendees || [])];

      // Add interviewers to attendees if they exist
      if (interviewers && interviewers.length) {
        interviewers.forEach((interviewer) => {
          const email =
            typeof interviewer === "object" ? interviewer.email : interviewer;
          // Check if interviewer is already in attendees to avoid duplicates
          if (
            !allAttendees.some(
              (att) =>
                (typeof att === "object" && att.email === email) ||
                att === email
            )
          ) {
            allAttendees.push(interviewer);
          }
        });
      }

      const event = {
        summary: summary || "Interview",
        description: description || "Interview Meeting",
        start: { dateTime: startTime.toISOString(), timeZone: timezone },
        end: { dateTime: endTime.toISOString(), timeZone: timezone },
        attendees: allAttendees.map((attendee) => ({
          email: typeof attendee === "object" ? attendee.email : attendee,
        })),
        conferenceData: {
          createRequest: {
            requestId: `meeting-${Date.now()}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      };

      // Insert event into Google Calendar
      console.log("Calling Google Calendar API...");
      const response = await calendar.events.insert({
        calendarId: "primary",
        resource: event,
        conferenceDataVersion: 1,
      });
      console.log(
        "Google Calendar API response received:",
        response.data.hangoutLink
      );

      // Get job details for the interviewer email
      console.log("Fetching job details for ID:", jobId);
      const job = await Job.findByPk(jobId);
      if (!job) {
        console.log("Job not found for ID:", jobId);
        return res.status(404).json({ message: "Job not found" });
      }
      console.log("Found job:", job.title);

      // Create interview record
      console.log("Creating interview record in database");
      const interview = await Interview.create({
        jobId,
        orgId: job.organizationId,
        timezone: "IST",
        summary,
        description,
        interviewers:
          interviewers ||
          attendees
            .map((att) => (typeof att === "object" ? att.email : att))
            .filter((email) => email !== candidate.email),
        candidateId: candidate.id,
        applicantid: applicantId,
        startDateTime: startTime,
        endDateTime: endTime,
        status: "Scheduled",
        meetingLink: response.data.hangoutLink,
      });
      console.log("Interview record created with ID:", interview.id);

      // Generate feedback URL
      const feedbackUrl = `${process.env.FRONTEND_URL}/orgs/feedback/${interview.id}`;
      console.log("Feedback URL generated:", feedbackUrl);

      // Prepare interviewers list for emails
      const interviewersList = Array.isArray(interviewers) ? interviewers : [];
      console.log("Interviewers for email:", interviewersList);

      // Send email to candidate
      console.log("Attempting to send email to candidate:", candidate.email);
      await sendInterviewEmail(
        candidate.email,
        candidate.firstName,
        summary,
        description,
        startTime,
        endTime,
        response.data.hangoutLink,
        feedbackUrl,
        interviewersList
      );

      // Send emails to interviewers
      console.log("Processing emails for interviewers");
      const interviewerEmails = Array.isArray(interviewers)
        ? interviewers.filter((email) => email && typeof email === "string")
        : [];

      console.log("Interviewer emails prepared:", interviewerEmails);

      for (const email of interviewerEmails) {
        console.log("Sending email to interviewer:", email);
        await sendInterviewerEmail(
          email,
          email.split("@")[0], // Extract name from email
          candidate.firstName,
          summary,
          description,
          startTime,
          endTime,
          response.data.hangoutLink,
          candidate.resume,
          feedbackUrl,
          job.title
        );
      }

      console.log("All interview emails sent successfully");
      res.status(201).json({
        message: "Meeting scheduled successfully",
        meetingLink: response.data.hangoutLink,
        eventDetails: response.data,
        interview,
      });
    } catch (error) {
      console.error("Error in interview scheduling:", error);
      res
        .status(500)
        .json({ message: "Failed to schedule meeting", error: error.message });
    }
  }
);

/**
 * Submit interview feedback
 * @route POST /feedback/:id
 * @param {string} id - Interview ID
 * @body {feedback, score}
 */
router.post("/feedback/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { feedback, score } = req.body;

    // Find the interview
    const interview = await Interview.findByPk(id);
    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }

    // Check if feedback can be submitted at this time
    const now = new Date();
    const startTimeLimit = new Date(
      interview.startDateTime.getTime() - 15 * 60000
    ); // 15 mins before start
    const endTimeLimit = new Date(interview.endDateTime.getTime() + 30 * 60000); // 30 mins after end

    if (now < startTimeLimit || now > endTimeLimit) {
      return res.status(403).json({
        message:
          "Feedback can only be submitted 15 minutes before interview start until 30 minutes after interview completion",
      });
    }

    // Update interview with feedback
    interview.feedback = feedback;
    interview.score = score;
    interview.status = "Completed";
    await interview.save();

    res.status(200).json({
      message: "Feedback submitted successfully",
      interview,
    });
  } catch (error) {
    console.error("Error submitting feedback:", error);
    res.status(500).json({
      message: "Failed to submit feedback",
      error: error.message,
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const interview = await Interview.findByPk(id, {
      include: [
        {
          model: Job,
          attributes: ["title"],
        },
        {
          model: Applicant,
          attributes: ["id", "status"],
          include: [
            {
              model: Candidate,
              attributes: ["firstName", "lastName", "email"],
            },
          ],
        },
      ],
    });
    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }
    res.status(200).json(interview);
  } catch (error) {
    console.error("Error fetching interview:", error);
    res.status(500).json({ message: "Failed to fetch interview" });
  }
});
module.exports = router;
