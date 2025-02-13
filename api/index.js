require('dotenv').config();
const express = require('express');
const passport = require('passport');
const cors = require('cors');
const session = require('express-session');
const sequelize = require('../config/database');
require('../config/passport');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(passport.initialize());
app.use(passport.session());

const authRoutes = require('../routes/auth');
app.use('/auth', authRoutes);

const jobRoutes = require('../routes/jobs');
app.use('/jobs', jobRoutes);

sequelize.sync().then(() => {
  console.log('Database synchronized');
});

app.get('/', (req, res) => res.send('Express on Vercel'));

app.listen(3000, () => console.log('Server ready on port 3000.'));

module.exports = app;