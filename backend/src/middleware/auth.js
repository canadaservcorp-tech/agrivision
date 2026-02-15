// ═══ Auth Middleware ═══
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'agrivision-secret-change-me';

function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) { res.status(401).json({ error: 'Invalid token' }); }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

function generateToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
}

module.exports = { authenticate, requireRole, generateToken, JWT_SECRET };
