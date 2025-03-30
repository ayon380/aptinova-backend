const router = require("express").Router();
const passport = require("passport");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const Candidate = require("../models/candidate");
const HR = require("../models/hr");
const { Op } = require("sequelize");
const HRManager = require("../models/hrManager");
const requireAuth = require("../middleware/jwtAuth");
const Organization = require("../models/organization");
const sendVerificationCode = require("../utils/sendVerificationCode"); // Utility to send verification code
const VerificationCode = require("../models/verificationCode"); // Model to store verification codes
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
  generateAuthenticationOptions,
} = require("@simplewebauthn/server");
const {
  isoUint8Array,
  isoBase64URL,
} = require("@simplewebauthn/server/helpers");
const Passkey = require("../models/passkey");
const { authenticateJWT } = require("../middleware/auth");
const GOOGLE_SCOPES = [
  // "https://www.googleapis.com/auth/calendar.events",
  // "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
];

const rpName = "Aptinova";
const rpID = process.env.WEBAUTHN_RP_ID || "localhost";
const origin = process.env.WEBAUTHN_ORIGIN || "http://localhost:4000";

// Update the token generation function to also create refresh tokens
const generateToken = (user) => {
  const accessToken = jwt.sign(
    { id: user.id, type: user.type },
    process.env.JWT_SECRET,
    {
      expiresIn: "24h", // Shorter lifetime for access tokens
    }
  );

  const refreshToken = jwt.sign(
    { id: user.id, type: user.type },
    process.env.REFRESH_TOKEN_SECRET || "refresh-secret-key",
    {
      expiresIn: "100d", // Longer lifetime for refresh tokens
    }
  );

  return { accessToken, refreshToken };
};

// Helper function to set refresh token cookie
const setRefreshTokenCookie = (res, refreshToken) => {
  // Set HTTP-only cookie that can't be accessed via JavaScript
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Only use HTTPS in production
    sameSite: "strict",
    maxAge: 100 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    path: "/", // Only accessible by the refresh endpoint
  });
};

// Add these helper functions at the top after the imports
const getCompanySubdomain = async (user) => {
  console.log("Runnging getCompanySubdomain");
  // console.log(user);

  const HrManager = await HRManager.findByPk(user.id);
  // console.log("HrM" + HrManager);

  console.log("Orgid" + HrManager.organizationId);

  const company = await Organization.findOne({
    where: { id: HrManager.organizationId },
  });
  console.log(company);
  return company?.subdomain || "";
};

const getCompanySubdomainHR = async (user) => {
  console.log("Runnging getCompanySubdomain");
  // console.log(user);

  const Hr = await HR.findByPk(user.id);
  // console.log("HrM" + HrManager);

  console.log("Orgid" + Hr.organizationId);

  const company = await Organization.findOne({
    where: { id: Hr.organizationId },
  });
  console.log(company);
  return company?.subdomain || "";
};

const constructRedirectUrl = async (
  baseUrl,
  user,
  userType,
  token,
  redirectUri = ""
) => {
  const url = new URL(baseUrl);
  if (userType != "candidate") {
    const subdomain = await getCompanySubdomain(user);
    console.log(subdomain);
    if (subdomain) {
      url.hostname = `${subdomain}.${url.hostname}`;
    }
  }

  const finalPath = redirectUri || `/auth/callback?token=${token}`;
  return `${url.toString()}${finalPath}`;
};

const WebAuthnSession = require("../models/webAuthnSession");

// Add session validation middleware
const validateSession = async (req, res, next) => {
  // Clean up expired sessions
  await WebAuthnSession.destroy({
    where: {
      expiresAt: { [Op.lt]: new Date() },
    },
  });
  next();
};

const crypto = require("crypto");
const sendPasswordResetEmail = require("../utils/sendPasswordResetEmail"); // You'll need to create this

router.post("/register", async (req, res) => {
  let user;
  try {
    const { email, password, name, userType } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(req.body);
    if (userType === "candidate") {
      user = await Candidate.findOne({ where: { email } });
    } else if (userType === "hr") {
      user = await HR.findOne({ where: { email } });
    } else if (userType === "hrManager") {
      user = await HRManager.findOne({ where: { email } });
    }
    if (user && user.status == "dormant") {
      await user.destroy();
    } else if (user) {
      return res.status(400).json({ error: "User already exists" });
    }
    if (userType === "candidate") {
      user = await Candidate.create({ email, password: hashedPassword, name });
    } else if (userType === "hr") {
      user = await HR.create({ email, password: hashedPassword, name });
    } else if (userType === "hrManager") {
      user = await HRManager.create({ email, password: hashedPassword, name });
    } else {
      return res.status(400).json({ error: "Invalid user type" });
    }
    const rec = await VerificationCode.findOne({ where: { email } });
    if (rec) {
      await rec.destroy();
    }

    const verificationCode = await sendVerificationCode(email);
    await VerificationCode.create({
      userId: user.id,
      email: email,
      code: verificationCode,
    });
    res.json({ message: "Verification code sent to email" });
  } catch (error) {
    console.log(error);
    if (user) {
      await user.destroy(); // Delete the user if an error occurs
    }
    res.status(400).json({ error: error.message });
  }
});
router.post("/resend-verifcation", async (req, res) => {
  const { email, userType } = req.body;

  // Fetch the record for the given email
  const Rec = await VerificationCode.findOne({ where: { email } });

  if (Rec) {
    // Convert createdAt to a JavaScript Date object (if it isn't already)
    const createdAt = new Date(Rec.created_at);
    const now = new Date();

    // Check if the difference is less than 1 minute (60000 ms)
    if (now - createdAt < 60000) {
      return res.status(400).json({
        error: "You can only resend verification code after 1 minute",
      });
    }

    // Delete the existing record if it exists
    await Rec.destroy();
  }

  // Fetch the user based on userType
  let user;
  if (userType === "candidate") {
    user = await Candidate.findOne({ where: { email } });
  } else if (userType === "hr") {
    user = await HR.findOne({ where: { email } });
  } else if (userType === "hrManager") {
    user = await HRManager.findOne({ where: { email } });
  }

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // Send the verification code and create a new record
  const verificationCode = await sendVerificationCode(email);
  await VerificationCode.create({
    userId: user.id,
    email: email,
    code: verificationCode,
  });

  res.json({ message: "Verification code sent to email" });
});

// Update the verify endpoint to return refresh tokens as well
router.post("/verify", async (req, res) => {
  const { email, code, userType } = req.body;
  const verificationRecord = await VerificationCode.findOne({
    where: { email, code },
  });
  if (!verificationRecord)
    return res.status(400).json({ error: "Invalid verification code" });

  let user;
  let subdomain = "";
  if (userType === "candidate") {
    user = await Candidate.findOne({ where: { email } });
  } else if (userType === "hr") {
    user = await HR.findOne({ where: { email } });
  } else if (userType === "hrManager") {
    user = await HRManager.findOne({ where: { email } });
  } else {
    return res.status(400).json({ error: "Invalid user type" });
  }
  if (userType != "candidate" && user.status != "dormant") {
    if (userType == "hrManager") {
      subdomain = await getCompanySubdomain(user);
    } else {
      subdomain = await getCompanySubdomainHR(user);
    }
  }
  if (!user) return res.status(400).json({ error: "User not found" });

  const tokens = generateToken({ id: user.id, type: userType });
  await verificationRecord.destroy(); // Delete the verification code after successful verification

  // Set refresh token in HTTP-only cookie
  setRefreshTokenCookie(res, tokens.refreshToken);

  if (user.status == "dormant") {
    if (userType == "candidate") {
      return res.redirect(
        `${process.env.FRONTEND_URL}/auth/get-started/${userType}?token=${tokens.accessToken}`
      );
    } else if (userType == "hrManager") {
      return res.redirect(
        `${process.env.FRONTEND_URL}/auth/get-started/org?token=${tokens.accessToken}`
      );
    }
  }

  // Return only the access token in the response body (refresh token in cookie)
  res.json({
    token: tokens.accessToken,
    userType,
    subdomain,
  });
});

router.post("/login", async (req, res) => {
  const { email, password, userType } = req.body;
  let user;
  if (userType === "candidate") {
    user = await Candidate.findOne({ where: { email } });
  } else if (userType === "hr") {
    user = await HR.findOne({ where: { email } });
  } else if (userType === "hrManager") {
    user = await HRManager.findOne({ where: { email } });
  } else {
    return res.status(400).json({ error: "Invalid user type" });
  }
  if (!user) return res.status(400).json({ error: "User not found" });
  if (!password || !user.password)
    return res.status(400).json({ error: "Password is required" });
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return res.status(400).json({ error: "Invalid password" });
  const rec = await VerificationCode.findOne({ where: { email } });
  if (rec) {
    await rec.destroy();
  }
  const verificationCode = await sendVerificationCode(email);
  await VerificationCode.create({
    userId: user.id,
    email: email,
    code: verificationCode,
  });
  res.json({ message: "Verification code sent to email" });
});

// Google Auth Routes
router.get("/google", (req, res, next) => {
  const userType = req.query.userType || "candidate"; // Default to candidate if not provided
  const action = req.query.action || "login"; // Default to login if not provided
  const redirectUri = req.query.redirect || "";
  const state = Buffer.from(
    JSON.stringify({ userType, action, redirectUri })
  ).toString("base64");
  console.log(userType);

  passport.authenticate("google", {
    scope: GOOGLE_SCOPES,
    accessType: "offline",
    // prompt: "consent",
    state: state,
    session: true, // Ensure session is enabled
  })(req, res, next);
});

// Update the Google auth callback to use cookies for refresh tokens
router.get("/google/callback", (req, res, next) => {
  passport.authenticate(
    "google",
    {
      session: true,
    },
    async (err, user, info) => {
      console.log("Google callback - Error:", err);
      console.log("Google callback - User:", user);
      console.log("Google callback - Info:", info);

      if (err) {
        console.error("Authentication error:", err);
        return res.redirect(
          `${
            process.env.FRONTEND_URL
          }/auth/callback?message=${encodeURIComponent(
            "Authentication failed due to server error"
          )}`
        );
      }

      // Check if info is undefined and handle accordingly
      if (!info) {
        info = { message: "Unknown authentication error", success: false };
      }

      if (!user) {
        const message = info.message || "Authentication failed";
        return res.redirect(
          `${
            process.env.FRONTEND_URL
          }/auth/callback?message=${encodeURIComponent(message)}`
        );
      }

      // Authentication successful
      if (user) {
        try {
          const tokens = generateToken({
            id: user.id,
            type: info.userType || "candidate",
          });
          // Set refresh token in cookie
          setRefreshTokenCookie(res, tokens.refreshToken);

          let state = {};
          if (req.query.state) {
            try {
              state = JSON.parse(
                Buffer.from(req.query.state, "base64").toString()
              );
            } catch (error) {
              console.error("Failed to parse state in callback:", error);
              state = {};
            }
          }

          // Use safe default values if state properties are missing
          const userType = info.userType || state.userType || "candidate";

          if (user.status == "dormant") {
            const redirectPath =
              userType === "candidate"
                ? `/auth/get-started/${userType}?token=${tokens.accessToken}`
                : `/auth/get-started/org?token=${tokens.accessToken}`;

            return res.redirect(
              await constructRedirectUrl(
                process.env.FRONTEND_URL,
                user,
                userType,
                tokens.accessToken,
                redirectPath
              )
            );
          }

          const redirectUrl = await constructRedirectUrl(
            process.env.FRONTEND_URL,
            user,
            userType,
            tokens.accessToken,
            state.redirectUri
              ? `${state.redirectUri}?token=${tokens.accessToken}`
              : null
          );
          return res.redirect(redirectUrl);
        } catch (error) {
          console.error("Error generating redirect URL:", error);
          return res.redirect(
            `${
              process.env.FRONTEND_URL
            }/auth/callback?message=${encodeURIComponent(
              "Error processing login"
            )}`
          );
        }
      } else {
        const message = info && info.message ? info.message : "Login failed";
        return res.redirect(
          `${
            process.env.FRONTEND_URL
          }/auth/callback?message=${encodeURIComponent(message)}`
        );
      }
    }
  )(req, res, next);
});

// Microsoft Auth Routes
router.get("/microsoft", (req, res, next) => {
  const userType = req.query.userType || "candidate";
  const action = req.query.action || "login";
  const redirectUri = req.query.redirect || "";
  const state = Buffer.from(
    JSON.stringify({ userType, action, redirectUri })
  ).toString("base64");

  passport.authenticate("microsoft", {
    state: state,
    session: true,
  })(req, res, next);
});

// Update the Microsoft auth callback to use cookies for refresh tokens
router.get("/microsoft/callback", (req, res, next) => {
  passport.authenticate(
    "microsoft",
    {
      session: true,
    },
    async (err, user, info) => {
      // console.log(user + info.success + info.message + info.userType);

      if (err) {
        console.error(err);
        const message = embedURIComponent(
          info && info.message
            ? info.message
            : "Authentication failed due to server error"
        );
        return res.redirect(
          `${process.env.FRONTEND_URL}/auth/callback?message=${message}`
        );
      }
      if (!user) {
        const message =
          info && info.message ? info.message : "Authentication failed";
        return res.redirect(
          `${
            process.env.FRONTEND_URL
          }/auth/callback?message=${encodeURIComponent(message)}`
        );
      }
      // Authentication successful
      if (user) {
        const tokens = generateToken({ id: user.id, type: info.userType });
        // Set refresh token in cookie
        setRefreshTokenCookie(res, tokens.refreshToken);

        const state = JSON.parse(
          Buffer.from(req.query.state, "base64").toString()
        );
        if (user.status == "dormant") {
          if (userType == "candidate") {
            const redirectPath =
              info.userType === "candidate"
                ? `/auth/get-started/${info.userType}?token=${tokens.accessToken}`
                : `/auth/get-started/org?token=${tokens.accessToken}`;
            return res.redirect(
              await constructRedirectUrl(
                process.env.FRONTEND_URL,
                user,
                userType,
                tokens.accessToken,
                redirectPath
              )
            );
          } else if (userType == "hrManager") {
            return res.redirect(
              `${process.env.FRONTEND_URL}/auth/get-started/org?token=${tokens.accessToken}`
            );
          }
        }

        const redirectUrl = await constructRedirectUrl(
          process.env.FRONTEND_URL,
          user,
          info.userType,
          tokens.accessToken,
          state.redirectUri
            ? `${state.redirectUri}?token=${tokens.accessToken}`
            : null
        );
        return res.redirect(redirectUrl);
      } else {
        const message = info && info.message ? info.message : "Login failed";
        return res.redirect(
          `${
            process.env.FRONTEND_URL
          }/auth/callback?message=${encodeURIComponent(message)}`
        );
      }
    }
  )(req, res, next);
});

// LinkedIn Auth Routes
router.get("/linkedin", (req, res, next) => {
  const userType = req.query.userType || "candidate";
  const action = req.query.action || "login";
  const redirectUri = req.query.redirect || "";
  const state = Buffer.from(
    JSON.stringify({ userType, action, redirectUri })
  ).toString("base64");

  passport.authenticate("linkedin", {
    state: state,
    session: true,
  })(req, res, next);
});

// Update the LinkedIn auth callback to use cookies for refresh tokens
router.get("/linkedin/callback", (req, res, next) => {
  passport.authenticate(
    "linkedin",
    {
      session: true,
    },
    async (err, user, info) => {
      // console.log(user + info.success + info.message + info.userType);

      if (err) {
        console.error(err);
        const message = embedURIComponent(
          info && info.message
            ? info.message
            : "Authentication failed due to server error"
        );
        return res.redirect(
          `${process.env.FRONTEND_URL}/auth/callback?message=${message}`
        );
      }
      if (!user) {
        const message =
          info && info.message ? info.message : "Authentication failed";
        return res.redirect(
          `${
            process.env.FRONTEND_URL
          }/auth/callback?message=${encodeURIComponent(message)}`
        );
      }
      // Authentication successful
      if (user) {
        const tokens = generateToken({ id: user.id, type: info.userType });
        // Set refresh token in cookie
        setRefreshTokenCookie(res, tokens.refreshToken);

        const state = JSON.parse(
          Buffer.from(req.query.state, "base64").toString()
        );
        if (user.status == "dormant") {
          if (userType == "candidate") {
            const redirectPath =
              info.userType === "candidate"
                ? `/auth/get-started/${info.userType}?token=${tokens.accessToken}`
                : `/auth/get-started/org?token=${tokens.accessToken}`;
            return res.redirect(
              await constructRedirectUrl(
                process.env.FRONTEND_URL,
                user,
                userType,
                tokens.accessToken,
                redirectPath
              )
            );
          } else if (userType == "hrManager") {
            return res.redirect(
              `${process.env.FRONTEND_URL}/auth/get-started/org?token=${tokens.accessToken}`
            );
          }
        }

        const redirectUrl = await constructRedirectUrl(
          process.env.FRONTEND_URL,
          user,
          info.userType,
          tokens.accessToken,
          state.redirectUri
            ? `${state.redirectUri}?token=${tokens.accessToken}`
            : null
        );
        return res.redirect(redirectUrl);
      } else {
        const message = info && info.message ? info.message : "Login failed";
        return res.redirect(
          `${
            process.env.FRONTEND_URL
          }/auth/callback?message=${encodeURIComponent(message)}`
        );
      }
    }
  )(req, res, next);
});

router.get("/user", authenticateJWT, async (req, res) => {
  let user;
  if (req.user.type === "candidate") {
    user = await Candidate.findByPk(req.user.id);
  } else if (req.user.type === "hr") {
    user = await HR.findByPk(req.user.id);
  } else if (req.user.type === "hrManager") {
    user = await HRManager.findByPk(req.user.id);
  } else {
    return res.status(400).json({ error: "Invalid user type" });
  }
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user, userType: req.user.type });
});

router.put("/user", requireAuth, async (req, res) => {
  const { name, profilePicture, department, resume } = req.body;
  let user;
  if (req.user.type === "candidate") {
    user = await Candidate.findByPk(req.user.id);
    if (user) {
      await user.update({ name, profilePicture, resume });
    }
  } else if (req.user.type === "hr") {
    user = await HR.findByPk(req.user.id);
    if (user) {
      await user.update({ name, profilePicture, department });
    }
  } else if (req.user.type === "hrManager") {
    user = await HRManager.findByPk(req.user.id);
    if (user) {
      await user.update({ name, profilePicture, department });
    }
  } else {
    return res.status(400).json({ error: "Invalid user type" });
  }
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    profilePicture: user.profilePicture,
  });
});

const PasskeyChallenge = require("../models/passkeyChallenge");
const { auth } = require("googleapis/build/src/apis/abusiveexperiencereport");

router.post(
  "/passkey/register/options",
  [authenticateJWT],
  async (req, res) => {
    try {
      const user = req.user;
      console.log("Generating registration options for user:", user.id);
      let userdata;
      if (user.type === "candidate") {
        userdata = await Candidate.findByPk(user.id);
      } else if (user.type === "hr") {
        userdata = await HR.findByPk(user.id);
      } else if (user.type === "hrManager") {
        userdata = await HRManager.findByPk(user.id);
      }
      if (!userdata) {
        return res.status(400).json({ error: "User not found" });
      }
      const userPasskeys = await Passkey.findAll({
        where: { userId: user.id }, // Changed from internal_user_id to userId
      });
      const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userID: isoUint8Array.fromUTF8String(user.id),
        timeout: 60000,
        userName: userdata.email,
        // Don't prompt users for additional information about the authenticator
        // (Recommended for smoother UX)
        attestationType: "none",
        // Prevent users from re-registering existing authenticators
        excludeCredentials: userPasskeys.map((passkey) => ({
          id: passkey.cred_id,
          // Optional
          transports: passkey.transports
            ? JSON.parse(passkey.transports)
            : undefined,
        })),
        // See "Guiding use of authenticators via authenticatorSelection" below
        authenticatorSelection: {
          // Defaults
          residentKey: "preferred",
          userVerification: "preferred",
          // Optional
          authenticatorAttachment: "platform",
        },
      });
      console.log("Registration options generated:", options);

      await PasskeyChallenge.destroy({
        where: { userId: user.id },
      });
      await PasskeyChallenge.create({
        userId: user.id,
        challenge: options.challenge,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes expiry
      });
      console.log("Registration options generated:", options);
      return res.json(options);
    } catch (error) {
      console.error("Registration options error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

router.post("/passkey/register/verify", [authenticateJWT], async (req, res) => {
  try {
    console.log("Verifying registration response");
    const { registration } = req.body;
    console.log("Registration Body " + JSON.stringify(registration));
    const cred_id = registration.id;
    // const credentialIDString = Buffer.from(cred_id).toString("base64url");

    const { deviceOS, deviceName, platform, browser } = req.body.deviceInfo;

    const challengeRecord = await PasskeyChallenge.findOne({
      where: {
        userId: req.user.id,
        expiresAt: { [Op.gt]: new Date() },
      },
    });
    const expectedChallenge = challengeRecord.challenge;
    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: registration,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
      });
    } catch (error) {
      console.error(error);
      return res.status(400).send({ error: error.message });
    }

    const { verified } = verification;
    const { registrationInfo } = verification;
    const { credential, credentialDeviceType, credentialBackedUp } =
      registrationInfo;
    console.log("Registration Public Key" + credential.publicKey);
    console.log(
      "REgistration Base 64" + isoBase64URL.fromBuffer(credential.publicKey)
    );

    if (verified) {
      const passkey = await Passkey.create({
        cred_id: cred_id,
        userId: req.user.id,
        userType: req.user.type,
        cred_public_key: isoBase64URL.fromBuffer(credential.publicKey),
        deviceType: credentialDeviceType,
        transports: JSON.stringify(credential.transports),
        backedUp: credentialBackedUp,
        deviceOS,
        deviceName,
        platform,
        browser,
        counter: credential.counter,
      });

      await challengeRecord.destroy();

      console.log(
        "Registration successful for credential ID:",
        passkey.cred_id
      );
      res.json({ success: true });
    }
  } catch (error) {
    console.error("Registration verification error:", error);
    console.error("Error details:", error.stack);
    res.status(400).json({ error: error.message });
  }
});

router.post(
  "/passkey/authenticate/options",
  [validateSession],
  async (req, res) => {
    try {
      const options = await generateAuthenticationOptions({
        rpID,
        allowCredentials: [],
        userVerification: "preferred",
        timeout: 60000,
      });

      console.log(options);
      const sessionId = crypto.randomBytes(16).toString("hex");
      const session = await WebAuthnSession.create({
        id: sessionId,
        challenge: options.challenge,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes expiry
      });

      res.json({ options, sessionId });
    } catch (error) {
      console.error("Authentication options error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Update passkey authentication to include refresh tokens
router.post(
  "/passkey/authenticate/verify",
  [validateSession],
  async (req, res) => {
    try {
      console.log("Signin Response" + JSON.stringify(req.body));
      const sessionId = req.body.sessionId;
      console.log("Session ID" + sessionId);

      const credentialId = req.body.asseResp.id || req.body.rawId;
      if (!credentialId) {
        return res.status(400).json({ error: "No credential ID provided" });
      }

      const credential = await Passkey.findOne({
        where: { cred_id: credentialId },
      });

      if (!credential) {
        return res.status(400).json({ error: "Credential not found" });
      }

      // Get the most recent valid session for this user
      const session = await WebAuthnSession.findOne({
        where: {
          id: sessionId,
        },
      });

      if (!session) {
        return res.status(400).json({ error: "No valid session found" });
      }

      const expectedChallenge = session.challenge;
      const cid = credential.cred_id;
      const cpk = Buffer.from(credential.cred_public_key, "base64url");
      console.log("Cred ID" + cid);
      console.log("Cred Public Key" + cpk);

      const verification = await verifyAuthenticationResponse({
        response: req.body.asseResp,
        expectedChallenge: expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: cid,
          publicKey: cpk,
          counter: credential.counter,
          transports: credential.transports,
        },
      });
      if (verification.verified) {
        await credential.update({
          counter: verification.authenticationInfo.newCounter,
        });

        const tokens = generateToken({
          id: credential.userId,
          type: credential.userType,
        });

        // Set refresh token in HTTP-only cookie
        setRefreshTokenCookie(res, tokens.refreshToken);

        // Clean up the used session
        await session.destroy();

        let subdomain = "";
        if (credential.userType !== "candidate") {
          if (credential.userType === "hrManager") {
            subdomain = await getCompanySubdomain({ id: credential.userId });
          } else {
            subdomain = await getCompanySubdomainHR({ id: credential.userId });
          }
        }

        // Return only the access token in the response body
        res.json({
          token: tokens.accessToken,
          userType: credential.userType,
          subdomain,
        });
      } else {
        res.status(400).json({ error: "Verification failed" });
      }
    } catch (error) {
      console.error("Authentication verification error:", error);
      res.status(400).json({ error: error.message });
    }
  }
);

router.get("/passkeys", [authenticateJWT], async (req, res) => {
  try {
    const passkeys = await Passkey.findAll({
      where: { userId: req.user.id },
      attributes: [
        "cred_id",
        "deviceName",
        "platform",
        "browser",
        "deviceOS",
        // "credentialID",
        "transports",
        "createdAt",
      ],
    });
    res.json(passkeys);
  } catch (error) {
    console.error("Error fetching passkeys:", error);
    res.status(500).json({ error: error.message });
  }
});

router.delete("/passkey/:id", [authenticateJWT], async (req, res) => {
  try {
    const passkey = await Passkey.findOne({
      where: {
        cred_id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!passkey) {
      return res
        .status(404)
        .json({ error: "Passkey not found or unauthorized" });
    }

    await passkey.destroy();
    res.json({ message: "Passkey deleted successfully" });
  } catch (error) {
    console.error("Error deleting passkey:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email, userType } = req.body;
    let user;

    if (userType === "candidate") {
      user = await Candidate.findOne({ where: { email } });
    } else if (userType === "hr") {
      user = await HR.findOne({ where: { email } });
    } else if (userType === "hrManager") {
      user = await HRManager.findOne({ where: { email } });
    }

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Update user with reset token
    await user.update({
      resetToken,
      resetTokenExpiry,
    });

    // Send password reset email
    const resetLink = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}&userType=${userType}`;
    await sendPasswordResetEmail(email, resetLink);

    res.json({ message: "Password reset email sent" });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: "Failed to process password reset request" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { token, password, userType } = req.body;
    let user;

    const whereClause = {
      resetToken: token,
      resetTokenExpiry: {
        [Op.gt]: new Date(),
      },
    };

    if (userType === "candidate") {
      user = await Candidate.findOne({ where: whereClause });
    } else if (userType === "hr") {
      user = await HR.findOne({ where: whereClause });
    } else if (userType === "hrManager") {
      user = await HRManager.findOne({ where: whereClause });
    }

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    // Hash new password and update user
    const hashedPassword = await bcrypt.hash(password, 10);
    await user.update({
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    });

    res.json({ message: "Password successfully reset" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

const InvalidToken = require("../models/invalidToken");
// Update refresh token endpoint to check for invalidated tokens
router.post("/refresh-token", async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token is required" });
  }

  // Check if token has been invalidated
  const invalidated = await InvalidToken.findOne({
    where: { token: refreshToken }
  });

  if (invalidated) {
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });
    return res.status(401).json({ error: "Token has been invalidated" });
  }

  // Verify the refresh token
  const { verifyRefreshToken } = require("../middleware/auth");
  const userData = verifyRefreshToken(refreshToken);

  if (!userData) {
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }

  // Generate new tokens
  const tokens = generateToken({ id: userData.id, type: userData.type });

  // Set new refresh token cookie
  setRefreshTokenCookie(res, tokens.refreshToken);

  // Invalidate the old refresh token
  await InvalidToken.create({
    token: refreshToken,
    expiresAt: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000), // Match refresh token expiry
  });

  // Clean up expired invalid tokens
  await InvalidToken.cleanup();

  res.json({
    accessToken: tokens.accessToken,
    userType: userData.type,
  });
});

// Update logout endpoint to invalidate the refresh token
router.post("/logout", async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (refreshToken) {
    // Store the token in InvalidToken table
    await InvalidToken.create({
      token: refreshToken,
      expiresAt: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000), // Match refresh token expiry
    });
  }

  // Clear the refresh token cookie
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });

  // Clean up expired invalid tokens
  await InvalidToken.cleanup();

  res.json({ success: true, message: "Logged out successfully" });
});

// Add an endpoint to verify token validity without refreshing
router.post("/verify-token", [authenticateJWT], (req, res) => {
  // If authenticateJWT middleware passed, the token is valid
  res.json({ valid: true, user: { id: req.user.id, type: req.user.type } });
});

module.exports = router;
