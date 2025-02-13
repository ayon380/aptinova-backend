const router = require('express').Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Candidate = require('../models/candidate');
const HR = require('../models/hr');
const HRManager = require('../models/hrManager');
const requireAuth = require('../middleware/jwtAuth');

const generateToken = (user) => {
  return jwt.sign({ id: user.id, type: user.type }, process.env.JWT_SECRET, { expiresIn: '24h' });
};

router.post('/register', async (req, res) => {
  try {
    const { email, password, name, userType } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    let user;
    if (userType === 'candidate') {
      user = await Candidate.create({ email, password: hashedPassword, name });
    } else if (userType === 'hr') {
      user = await HR.create({ email, password: hashedPassword, name });
    } else if (userType === 'hrManager') {
      user = await HRManager.create({ email, password: hashedPassword, name });
    } else {
      return res.status(400).json({ error: 'Invalid user type' });
    }
    const token = generateToken({ id: user.id, type: userType });
    res.json({ token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
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
  const token = generateToken({ id: user.id, type: userType });
  res.json({ token });
});

// Google Auth Routes
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email'],
  state: true,
  failureRedirect: '/auth/login' 
}));
router.get('/google/callback', passport.authenticate('google', { 
  failureRedirect: '/auth/login',
  session: true 
}), (req, res) => {
  const token = generateToken(req.user);
  res.redirect(`${process.env.FRONTEND_URL}?token=${token}`);
});

// Microsoft Auth Routes
router.get('/microsoft', passport.authenticate('microsoft', { 
  state: true,
  failureRedirect: '/auth/login' 
}));
router.get('/microsoft/callback', passport.authenticate('microsoft', { 
  failureRedirect: '/auth/login',
  session: true 
}), (req, res) => {
  const token = generateToken(req.user);
  res.redirect(`${process.env.FRONTEND_URL}?token=${token}`);
});

// LinkedIn Auth Routes
router.get('/linkedin', passport.authenticate('linkedin', { 
  state: true,
  failureRedirect: '/auth/login' 
}));
router.get('/linkedin/callback', passport.authenticate('linkedin', { 
  failureRedirect: '/auth/login',
  session: true 
}), (req, res) => {
  const token = generateToken(req.user);
  res.redirect(`${process.env.FRONTEND_URL}?token=${token}`);
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
