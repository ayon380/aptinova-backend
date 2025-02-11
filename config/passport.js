const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
const { Strategy: MicrosoftStrategy } = require('passport-microsoft');
const bcrypt = require('bcrypt');
const User = require('../models/user');

passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, async (email, password, done) => {
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return done(null, false, { message: 'User not found' });
    if (!user.password) return done(null, false, { message: 'Invalid login method' });
    
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return done(null, false, { message: 'Invalid password' });
    
    return done(null, user);
  } catch (error) {
    return done(error);
  }
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
        name: profile.displayName
      });
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
        name: profile.displayName
      });
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
        name: profile.displayName
      });
    }
    return done(null, user);
  } catch (error) {
    return done(error);
  }
}
));

// Add these lines for session support
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

module.exports = passport;
