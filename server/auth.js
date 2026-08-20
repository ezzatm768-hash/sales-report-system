const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db } = require('./database');

const JWT_SECRET = process.env.JWT_SECRET || 'vs-sales-system-secret-key-2026';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name, team_id: user.team_id },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}

function requireTeamLeader(req, res, next) {
  if (req.user.role !== 'team_leader') return res.status(403).json({ error: 'Team Leader access required' });
  next();
}

module.exports = { generateToken, authenticateToken, requireAdmin, requireTeamLeader, JWT_SECRET };
