const jwt = require("jsonwebtoken");
const Candidate = require("../models/candidate");
const HRManager = require("../models/hrManager");
const HR = require("../models/hr");
const authenticateJWT = (req, res, next) => {
  const authHeader = req.header("Authorization");
  if (!authHeader) {
    return res
      .status(401)
      .json({ success: false, message: "Access token is missing or invalid" });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
  } catch (error) {
    return null;
  }
};

const authorizeUserType = (userType) => {
  return async (req, res, next) => {
    try {
      let user;
      console.log(req.user);

      if (userType === "candidate") {
        user = await Candidate.findByPk(req.user.id);
      } else if (userType === "hrManager") {
        user = await HRManager.findByPk(req.user.id);
      } else if (userType === "hr") {
        user = await HR.findByPk(req.user.id);
      }

      if (!user) {
        return res
          .status(403)
          .json({ success: false, message: "Forbidden: Invalid user type" });
      }

      req.user = user;
      next();
    } catch (error) {
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  };
};
const authorizeUserTypes = (userTypes) => {
  return async (req, res, next) => {
    try {
      let user = null;
      for (const type of userTypes) {
        if (type === "candidate") {
          user = await Candidate.findByPk(req.user.id);
        } else if (type === "hrManager") {
          user = await HRManager.findByPk(req.user.id);
        } else if (type === "hr") {
          user = await HR.findByPk(req.user.id);
        }
        if (user) break;
      }
      if (!user) {
        return res
          .status(403)
          .json({ success: false, message: "Forbidden: Invalid user type" });
      }
      req.user = user;
      next();
    } catch (error) {
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  };
};
module.exports = {
  authenticateJWT,
  authorizeUserType,
  authorizeUserTypes,
  verifyRefreshToken,
};
