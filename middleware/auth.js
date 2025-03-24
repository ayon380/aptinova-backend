const jwt = require('jsonwebtoken');
const Candidate = require('../models/candidate');
const HRManager = require('../models/hrManager');

const authenticateJWT = (req, res, next) => {
  const token = req.header('Authorization').replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token is missing or invalid' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

const authorizeUserType = (userType) => {
  return async (req, res, next) => {
    try {
      let user;
      console.log(req.user);
      
      if (userType === 'candidate') {
        user = await Candidate.findByPk(req.user.id);
      } else if (userType === 'hrManager') {
        user = await HRManager.findByPk(req.user.id);
      }

      if (!user) {
        return res.status(403).json({ success: false, message: 'Forbidden: Invalid user type' });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };
};

module.exports = {
  authenticateJWT,
  authorizeUserType,
};
