const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const LinkedInStrategy = require("passport-linkedin-oauth2").Strategy;
const { Strategy: MicrosoftStrategy } = require("passport-microsoft");
const bcrypt = require("bcrypt");
const Candidate = require("../models/candidate");
const HR = require("../models/hr");
const HRManager = require("../models/hrManager");
const { google } = require("googleapis");

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      passReqToCallback: true,
    },
    async (req, email, password, done) => {
      try {
        const { userType } = req.body;
        let user;
        if (userType === "candidate") {
          user = await Candidate.findOne({ where: { email } });
        } else if (userType === "hr") {
          user = await HR.findOne({ where: { email } });
        } else if (userType === "hrManager") {
          user = await HRManager.findOne({ where: { email } });
        } else {
          return done(null, false, { message: "Invalid user type" });
        }
        if (!user) return done(null, false, { message: "User not found" });
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return done(null, false, { message: "Invalid password" });
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

const GOOGLE_SCOPES = [
  // "https://www.googleapis.com/auth/calendar.events",
  // "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
];

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "https://api.aptinova.tech/auth/google/callback",
      passReqToCallback: true, // Important: This allows you to access the request object
      scope: GOOGLE_SCOPES, // Add calendar scope
      accessType: "offline",
      // prompt: "consent",
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const state = JSON.parse(
          Buffer.from(req.query.state, "base64").toString("ascii")
        );
        console.log("Passport.js");

        // console.log(state);

        const userType = state.userType;
        const action = state.action;
        console.log(userType);
        if (action == "login") {
          let user;
          console.log("Login");

          if (userType === "hr") {
            user = await HR.findOne({
              where: { email: profile.emails[0].value },
            });
          } else if (userType === "hrManager") {
            user = await HRManager.findOne({
              where: { email: profile.emails[0].value },
            });
          } else {
            user = await Candidate.findOne({
              where: { email: profile.emails[0].value },
            });
          }
          if (user) {
            // console.log(accessToken + " " + refreshToken);

            await user.update({
              googleAccessToken: accessToken,
              googleRefreshToken: refreshToken,
            });
            return done(null, user, {
              message: "Logged in successfully",
              userType,
              success: true,
            });
          } else {
            return done(null, user, {
              message: "User not found",
              success: false,
            });
          }
        } else {
          let user;
          if (userType === "hr") {
            user = await HR.findOne({
              where: { email: profile.emails[0].value },
            });
          } else if (userType === "hrManager") {
            user = await HRManager.findOne({
              where: { email: profile.emails[0].value },
            });
          } else {
            user = await Candidate.findOne({
              where: { email: profile.emails[0].value },
            });
          }
          if (user) {
            await user.update({
              googleAccessToken: accessToken,
              googleRefreshToken: refreshToken,
            });
            return done(null, user, {
              message:
                "User already exists, Use Login Page to log into your account",
              userType,
              success: false,
            });
          }
          if (!user) {
            if (userType === "hr") {
              user = await HR.create({
                email: profile.emails[0].value,
                name: profile.displayName,
              });
            } else if (userType === "hrManager") {
              user = await HRManager.create({
                email: profile.emails[0].value,
                name: profile.displayName,
              });
            } else {
              user = await Candidate.create({
                email: profile.emails[0].value,
                name: profile.displayName,
              });
            }
          }
          await user.update({
            googleAceessToken: accessToken,
            googleRefreshToken: refreshToken,
          });
          return done(null, user, {
            message: "Signed up successfully",
            userType,
            success: true,
          });
        }
      } catch (error) {
        return done(error, null, {
          message: "Something went wrong, Try again after some time",
          success: false,
        });
      }
    }
  )
);
passport.use(
  new MicrosoftStrategy(
    {
      clientID: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      callbackURL: "/auth/microsoft/callback",
      authorizationURL:
        "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?prompt=select_account",
      scope: ["user.read"],
      passReqToCallback: true, // Add this line
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const state = JSON.parse(
          Buffer.from(req.query.state, "base64").toString("ascii")
        );
        console.log("Passport.js");

        // console.log(state);

        const userType = state.userType;
        const action = state.action;
        // console.log(profile);
        if (action == "login") {
          let user;
          console.log("Login");

          if (userType === "hr") {
            user = await HR.findOne({
              where: { email: profile.emails[0].value },
            });
          } else if (userType === "hrManager") {
            user = await HRManager.findOne({
              where: { email: profile.emails[0].value },
            });
          } else {
            user = await Candidate.findOne({
              where: { email: profile.emails[0].value },
            });
          }
          if (!user) {
            return done(null, user, {
              message: "User not found",
              success: false,
            });
          }
          return done(null, user, {
            message: "Logged in successfully",
            userType,
            success: true,
          });
        } else {
          let user;
          if (userType === "hr") {
            user = await HR.findOne({
              where: { email: profile.emails[0].value },
            });
          } else if (userType === "hrManager") {
            user = await HRManager.findOne({
              where: { email: profile.emails[0].value },
            });
          } else {
            user = await Candidate.findOne({
              where: { email: profile.emails[0].value },
            });
          }
          if (user) {
            return done(null, false, {
              message:
                "User already exists, Use Login Page to log into your account",
              userType,
              success: false,
            });
          }
          if (!user) {
            if (userType === "hr") {
              user = await HR.create({
                email: profile.emails[0].value,
                name: profile.displayName,
              });
            } else if (userType === "hrManager") {
              user = await HRManager.create({
                email: profile.emails[0].value,
                name: profile.displayName,
              });
            } else {
              user = await Candidate.create({
                email: profile.emails[0].value,
                name: profile.displayName,
              });
            }
          }
          return done(null, user, {
            message: "Signed up successfully",
            success: true,
          });
        }
      } catch (error) {
        return done(error, false, {
          message: "Something went wrong, Try again after some time",
          success: false,
        });
      }
    }
  )
);

passport.use(
  new LinkedInStrategy(
    {
      clientID: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      callbackURL: "/auth/linkedin/callback",
      scope: ["r_emailaddress", "r_liteprofile"],
      state: true,
      passReqToCallback: true, // Add this line
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const state = JSON.parse(
          Buffer.from(req.query.state, "base64").toString("ascii")
        );
        console.log("Passport.js");

        // console.log(state);

        const userType = state.userType;
        const action = state.action;
        // console.log(profile);
        if (action == "login") {
          let user;
          console.log("Login");

          if (userType === "hr") {
            user = await HR.findOne({
              where: { email: profile.emails[0].value },
            });
          } else if (userType === "hrManager") {
            user = await HRManager.findOne({
              where: { email: profile.emails[0].value },
            });
          } else {
            user = await Candidate.findOne({
              where: { email: profile.emails[0].value },
            });
          }
          if (!user) {
            return done(null, user, {
              message: "User not found",
              success: false,
            });
          }
          return done(null, user, {
            message: "Logged in successfully",
            userType,
            success: true,
          });
        } else {
          let user;
          if (userType === "hr") {
            user = await HR.findOne({
              where: { email: profile.emails[0].value },
            });
          } else if (userType === "hrManager") {
            user = await HRManager.findOne({
              where: { email: profile.emails[0].value },
            });
          } else {
            user = await Candidate.findOne({
              where: { email: profile.emails[0].value },
            });
          }
          if (user) {
            return done(null, false, {
              message:
                "User already exists, Use Login Page to log into your account",
              userType,
              success: false,
            });
          }
          if (!user) {
            if (userType === "hr") {
              user = await HR.create({
                email: profile.emails[0].value,
                name: profile.displayName,
              });
            } else if (userType === "hrManager") {
              user = await HRManager.create({
                email: profile.emails[0].value,
                name: profile.displayName,
              });
            } else {
              user = await Candidate.create({
                email: profile.emails[0].value,
                name: profile.displayName,
              });
            }
          }
          return done(null, user, {
            message: "Signed up successfully",
            success: true,
          });
        }
      } catch (error) {
        return done(error, false, {
          message: "Something went wrong, Try again after some time",
          success: false,
        });
      }
    }
  )
);

// Add these lines for session support
passport.serializeUser((user, done) => {
  done(null, { id: user.id, type: user.constructor.name });
});

passport.deserializeUser(async (obj, done) => {
  try {
    let user;
    if (obj.type === "Candidate") {
      user = await Candidate.findByPk(obj.id);
    } else if (obj.type === "HR") {
      user = await HR.findByPk(obj.id);
    } else if (obj.type === "HRManager") {
      user = await HRManager.findByPk(obj.id);
    } else {
      return done(new Error("Invalid user type"));
    }
    done(null, user);
  } catch (error) {
    done(error);
  }
});

module.exports = passport;
