const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key';

function verify(token, options = {}) {
  return jwt.verify(token, JWT_SECRET, options);
}

function sign(payload, options = {}) {
  return jwt.sign(payload, JWT_SECRET, options);
}

module.exports = { verify, sign };
