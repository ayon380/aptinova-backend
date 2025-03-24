const { google } = require("googleapis");
const express = require("express");
const router = express.Router();
const HRManager = require("../models/hrManager");
const HR = require("../models/hr");
const { authenticateJWT, authorizeUserType } = require("../middleware/auth");
async function createMeeting(user, meetingDetails) {
  console.log(user.dataValues);
  console.log(meetingDetails);

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials({
    access_token: user.dataValues.googleAcessToken,
    refresh_token: user.dataValues.googleRefreshToken,
  });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const event = {
    summary: meetingDetails.summary || "Interview",
    location: meetingDetails.location || "Online",
    description: meetingDetails.description || "Interview",
    start: {
      dateTime: meetingDetails.startDateTime || new Date() + 1,
      timeZone: "UTC",
    },
    end: {
      dateTime: meetingDetails.endDateTime || new Date() + 2,
      timeZone: "UTC",
    },
    attendees: [
      { email: "ayonsarkar385@gmail.com" },
      { email: "ayonsarkar381@gmail.com" },
    ],
    conferenceData: {
      createRequest: {
        requestId: "uniqueRequestId123",
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
  };

  const response = calendar.events.insert({
    calendarId: "primary",
    resource: event,
    conferenceDataVersion: 1,
  });

  return response.data;
}
router.post(
  "/schedule",
  authenticateJWT,
  authorizeUserType("hrManager") || authorizeUserType("hr"),
  async (req, res) => {
    try {
      const user = req.user;
      const meetingDetails = req.body;
      const meeting = await createMeeting(user, meetingDetails);
      res.status(201).json(meeting);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);
module.exports = router;
