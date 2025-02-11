const router = require('express').Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/user');

const generateToken = (user) => {
  return jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });
};

router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      password: hashedPassword,
      name,
      provider: 'local'
    });
    const token = generateToken(user);
    res.json({ token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/login', passport.authenticate('local'), (req, res) => {
  const token = generateToken(req.user);
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

module.exports = router;
