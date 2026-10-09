const jwt = require('jsonwebtoken');

// "Remember me" keeps the login for 30 days; otherwise it lasts a day.
const signToken = (userId, remember) => jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: remember ? '30d' : '1d' });

function requireAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer /, '');
    req.userId = jwt.verify(token, process.env.JWT_SECRET).userId;
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

module.exports = { requireAuth, signToken };
