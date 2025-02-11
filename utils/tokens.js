const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user.id },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

const generate2FACode = () => {
  const code = crypto.randomInt(100000, 999999).toString();
  const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return { code, expiry };
};

module.exports = { generateTokens, generate2FACode };
