const jwt = require('jsonwebtoken');
require('dotenv').config();

const generateToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
  };

  const options = {
    expiresIn: '24h', // Durée de vie du token
  };

  return jwt.sign(payload, process.env.JWT_SECRET, options);
};

module.exports = generateToken;