const jwt = require('jsonwebtoken');

module.exports = function requireAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer /, '');
    req.userId = jwt.verify(token, process.env.JWT_SECRET).userId;
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};
