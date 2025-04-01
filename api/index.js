require("dotenv").config();
const express = require("express");
const passport = require("passport");
const cors = require("cors");
const session = require("express-session");
const sequelize = require("../config/database");
const cookieParser = require("cookie-parser");
require("../config/passport");

// Import the sequelize store constructor
const SequelizeStore = require("connect-session-sequelize")(session.Store);

const app = express();

app.use(cookieParser());
app.use(
  cors({
    origin: ["https://aptinova.tech", "http://localhost:4000"],
    credentials: true,
  })
);

app.use(express.json());

// Create session store with Sequelize
const sessionStore = new SequelizeStore({
  db: sequelize,
  checkExpirationInterval: 15 * 60 * 1000, // Clean up expired sessions every 15 mins
  expiration: 24 * 60 * 60 * 1000, // Sessions expire after 1 day
});

app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      maxAge: 3600000,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
  })
);

// Initialize the session store tables
sessionStore.sync();

app.use(passport.initialize());
app.use(passport.session());

const authRoutes = require("../routes/auth");
app.use("/auth", authRoutes);

const candidateRoutes = require("../routes/candidateRoutes");
app.use("/candidate", candidateRoutes);

const paymentRoutes = require("../routes/paymentRoutes");
app.use("/payments", paymentRoutes);

const jobRoutes = require("../routes/jobRoutes");
app.use("/jobs", jobRoutes);

const getstartedRoutes = require("../routes/get-started");
app.use("/get-started", getstartedRoutes);

const hiringTestRoutes = require("../routes/hiringTestRoutes");
app.use("/hiring-tests", hiringTestRoutes);

const applicantRoutes = require("../routes/applicantRoutes");
app.use("/applicants", applicantRoutes);

const hrmroutes = require("../routes/hrmroutes");
app.use("/hrm", hrmroutes);

const domainRoutes = require("../routes/domains");
app.use("/domains", domainRoutes);

const interviewRoutes = require("../routes/interviewsRoutes");
app.use("/interviews", interviewRoutes);
// Add the code execution routes
const codeExecutionRoutes = require("../routes/codeExecutionRoutes");
app.use("/code", codeExecutionRoutes);

const teamRoutes = require("../routes/teamsRoutes");
app.use("/teams", teamRoutes);
sequelize.sync().then(() => {
  console.log("Database synchronized");
});

app.get("/", function (req, res) {
  if (req.session.page_views) {
    req.session.page_views++;
    res.send("You visited this page " + req.session.page_views + " times");
  } else {
    req.session.page_views = 1;
    res.send("Welcome to this page for the first time!");
  }
});
app.get("/l", (req, res) => {
  if (req.session.page_views) {
    req.session.page_views++;
    console.log(req.session);

    res.send("You visited this page " + req.session.page_views + " times");
  } else {
    req.session.page_views = 1;
    res.send("Welcome to this page for the first time!");
  }
});

app.listen(3000, () => console.log("Server ready on port 3000."));

module.exports = app;
