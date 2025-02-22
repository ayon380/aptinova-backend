const router = require('express').Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Candidate = require('../models/candidate');
const HR = require('../models/hr');
const HRManager = require('../models/hrManager');
const requireAuth = require('../middleware/jwtAuth');
const sendVerificationCode = require('../utils/sendVerificationCode'); // Utility to send verification code
const VerificationCode = require('../models/verificationCode'); // Model to store verification codes

const generateToken = (user) => {
  return jwt.sign({ id: user.id, type: user.type }, process.env.JWT_SECRET, { expiresIn: '24h' });
};

router.post('/register', async (req, res) => {
  let user;
  try {
    const { email, password, name, userType } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(req.body);

    if (userType === 'candidate') {
      user = await Candidate.create({ email, password: hashedPassword, name });
    } else if (userType === 'hr') {
      user = await HR.create({ email, password: hashedPassword, name });
    } else if (userType === 'hrManager') {
      user = await HRManager.create({ email, password: hashedPassword, name });
    } else {
      return res.status(400).json({ error: 'Invalid user type' });
    }
    const verificationCode = await sendVerificationCode(email);
    await VerificationCode.create({ userId: user.id, email: email, code: verificationCode });
    res.json({ message: 'Verification code sent to email' });
  } catch (error) {
    console.log(error);
    if (user) {
      await user.destroy(); // Delete the user if an error occurs
    }
    res.status(400).json({ error: error.message });
  }
});

router.post('/verify', async (req, res) => {
  const { email, code, userType } = req.body;
  const verificationRecord = await VerificationCode.findOne({ where: { email, code } });
  if (!verificationRecord) return res.status(400).json({ error: 'Invalid verification code' });

  let user;
  if (userType === 'candidate') {
    user = await Candidate.findOne({ where: { email } });
  } else if (userType === 'hr') {
    user = await HR.findOne({ where: { email } });
  } else if (userType === 'hrManager') {
    user = await HRManager.findOne({ where: { email } });
  } else {
    return res.status(400).json({ error: 'Invalid user type' });
  }

  if (!user) return res.status(400).json({ error: 'User not found' });

  const token = generateToken({ id: user.id, type: userType });
  await verificationRecord.destroy(); // Delete the verification code after successful verification
  res.json({ token });
});

router.post('/login', async (req, res) => {
  const { email, password, userType } = req.body;
  let user;
  if (userType === 'candidate') {
    user = await Candidate.findOne({ where: { email } });
  } else if (userType === 'hr') {
    user = await HR.findOne({ where: { email } });
  } else if (userType === 'hrManager') {
    user = await HRManager.findOne({ where: { email } });
  } else {
    return res.status(400).json({ error: 'Invalid user type' });
  }
  if (!user) return res.status(400).json({ error: 'User not found' });
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return res.status(400).json({ error: 'Invalid password' });
  const rec = await VerificationCode.findOne({ where: { email } });
  if (rec) {
    await rec.destroy();
  } const verificationCode = await sendVerificationCode(email);
  await VerificationCode.create({ userId: user.id, email: email, code: verificationCode });
  res.json({ message: 'Verification code sent to email' });
});


// Google Auth Routes
router.get('/google', (req, res, next) => {
  const userType = req.query.userType || 'candidate'; // Default to candidate if not provided
  const action = req.query.action || 'login'; // Default to login if not provided
  const state = Buffer.from(JSON.stringify({ userType, action })).toString('base64');

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: state,
    session: true // Ensure session is enabled
  })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', {
    session: true
  }, (err, user, info) => {
    console.log(user + info.success+info.message +info.userType);
    
    if (err) {
      console.error(err);
      const message =embedURIComponent(info && info.message ? info.message : 'Authentication failed due to server error');
      return res.redirect(`${process.env.FRONTEND_URL}/auth/callback?message=${message}`);
    }
    if (!user) {
      const message = info && info.message ? info.message : 'Authentication failed';
      return res.redirect(`${process.env.FRONTEND_URL}/auth/callback?message=${encodeURIComponent(message)}`);
    }
    // Authentication successful
    if (user) {

      const token = generateToken({id : user.id, type: info.userType}); // Generate token using the authenticated user
      return res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
    } else {
      const message = info && info.message ? info.message : 'Login failed';
      return res.redirect(`${process.env.FRONTEND_URL}/auth/callback?message=${encodeURIComponent(message)}`);
    }
  })(req, res, next);
});

// Microsoft Auth Routes
router.get('/microsoft', (req, res, next) => {
  const userType = req.query.userType || 'candidate';
  const action = req.query.action || 'login';
  const state = Buffer.from(JSON.stringify({ userType, action })).toString('base64');

  passport.authenticate('microsoft', {
    state: state,
    session: true
  })(req, res, next);
});

router.get('/microsoft/callback', (req, res, next) => {
  passport.authenticate('microsoft', {
    session: true
  }, (err, user, info) => {
    if (err) {
      console.error(err);
      return res.redirect(`${process.env.FRONTEND_URL}/auth/callback?message=Authentication failed due to server error`);
    }
    if (!user) {
      const message = info && info.message ? info.message : 'Authentication failed';
      return res.redirect(`${process.env.FRONTEND_URL}/auth/callback?message=${encodeURIComponent(message)}`);
    }
    // Authentication successful
    const token = generateToken(user); // Generate token using the authenticated user
    return res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  })(req, res, next);
});

// LinkedIn Auth Routes
router.get('/linkedin', (req, res, next) => {
  const userType = req.query.userType || 'candidate';
  const action = req.query.action || 'login';
  const state = Buffer.from(JSON.stringify({ userType, action })).toString('base64');

  passport.authenticate('linkedin', {
    state: state,
    session: true
  })(req, res, next);
});

router.get('/linkedin/callback', (req, res, next) => {
  passport.authenticate('linkedin', {
    session: true
  }, (err, user, info) => {
    if (err) {
      console.error(err);
      return res.redirect(`${process.env.FRONTEND_URL}/auth/callback?message=Authentication failed due to server error`);
    }
    if (!user) {
      const message = info && info.message ? info.message : 'Authentication failed';
      return res.redirect(`${process.env.FRONTEND_URL}/auth/callback?message=${encodeURIComponent(message)}`);
    }
    // Authentication successful
    const token = generateToken(user); // Generate token using the authenticated user
    return res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  })(req, res, next);
});


router.get('/user', requireAuth, async (req, res) => {
  let user;
  if (req.user.type === 'candidate') {
    user = await Candidate.findByPk(req.user.id);
  } else if (req.user.type === 'hr') {
    user = await HR.findByPk(req.user.id);
  } else if (req.user.type === 'hrManager') {
    user = await HRManager.findByPk(req.user.id);
  } else {
    return res.status(400).json({ error: 'Invalid user type' });
  }
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    profilePicture: user.profilePicture
  });
});

router.put('/user', requireAuth, async (req, res) => {
  const { name, profilePicture, department, resume } = req.body;
  let user;
  if (req.user.type === 'candidate') {
    user = await Candidate.findByPk(req.user.id);
    if (user) {
      await user.update({ name, profilePicture, resume });
    }
  } else if (req.user.type === 'hr') {
    user = await HR.findByPk(req.user.id);
    if (user) {
      await user.update({ name, profilePicture, department });
    }
  } else if (req.user.type === 'hrManager') {
    user = await HRManager.findByPk(req.user.id);
    if (user) {
      await user.update({ name, profilePicture, department });
    }
  } else {
    return res.status(400).json({ error: 'Invalid user type' });
  }
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    profilePicture: user.profilePicture
  });
});

module.exports = router;
