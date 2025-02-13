const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
const { Strategy: MicrosoftStrategy } = require('passport-microsoft');
const bcrypt = require('bcrypt');
const Candidate = require('../models/candidate');
const HR = require('../models/hr');
const HRManager = require('../models/hrManager');

passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password',
  passReqToCallback: true
}, async (req, email, password, done) => {
  const { userType } = req.body;
  let user;
  if (userType === 'candidate') {
    user = await Candidate.findOne({ where: { email } });
  } else if (userType === 'hr') {
    user = await HR.findOne({ where: { email } });
  } else if (userType === 'hrManager') {
    user = await HRManager.findOne({ where: { email } });
  } else {
    return done(null, false, { message: 'Invalid user type' });
  }
  if (!user) return done(null, false, { message: 'User not found' });
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return done(null, false, { message: 'Invalid password' });
  return done(null, user);
}));

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ where: { providerId: profile.id, provider: 'google' } });
    if (!user) {
      user = await User.create({
        email: profile.emails[0].value,
        provider: 'google',
        providerId: profile.id,
        name: profile.displayName,
        profilePicture: profile.photos?.[0]?.value
      });
    } else if (!user.profilePicture && profile.photos?.length) {
      await user.update({ profilePicture: profile.photos[0].value });
    }
    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

passport.use(new MicrosoftStrategy({
  clientID: process.env.MICROSOFT_CLIENT_ID,
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
  callbackURL: '/auth/microsoft/callback',
  scope: ['user.read']
},
async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ 
      where: { 
        providerId: profile.id,
        provider: 'microsoft'
      }
    });

    if (!user) {
      user = await User.create({
        email: profile.emails[0].value,
        provider: 'microsoft',
        providerId: profile.id,
        name: profile.displayName,
        profilePicture: profile.photos?.[0]?.value
      });
    } else if (!user.profilePicture && profile.photos?.length) {
      await user.update({ profilePicture: profile.photos[0].value });
    }
    return done(null, user);
  } catch (error) {
    return done(error);
  }
}
));

passport.use(new LinkedInStrategy({
  clientID: process.env.LINKEDIN_CLIENT_ID,
  clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
  callbackURL: '/auth/linkedin/callback',
  scope: ['r_emailaddress', 'r_liteprofile'],
  state: true
},
async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({
      where: {
        providerId: profile.id,
        provider: 'linkedin'
      }
    });

    if (!user) {
      user = await User.create({
        email: profile.emails[0].value,
        provider: 'linkedin',
        providerId: profile.id,
        name: profile.displayName,
        profilePicture: profile.photos?.[0]?.value
      });
    } else if (!user.profilePicture && profile.photos?.length) {
      await user.update({ profilePicture: profile.photos[0].value });
    }
    return done(null, user);
  } catch (error) {
    return done(error);
  }
}
));

// Add these lines for session support
passport.serializeUser((user, done) => {
  done(null, { id: user.id, type: user.constructor.name });
});

passport.deserializeUser(async (obj, done) => {
  let user;
  if (obj.type === 'Candidate') {
    user = await Candidate.findByPk(obj.id);
  } else if (obj.type === 'HR') {
    user = await HR.findByPk(obj.id);
  } else if (obj.type === 'HRManager') {
    user = await HRManager.findByPk(obj.id);
  } else {
    return done(new Error('Invalid user type'));
  }
  done(null, user);
});

module.exports = passport;
