const express = require('express');
const bcrypt = require('bcryptjs');
const { dbGet } = require('../database');
const { generateToken } = require('../auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const user = await dbGet('SELECT * FROM users WHERE username = $1', [username]);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const validPassword = bcrypt.compareSync(password, user.password);
  if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

  const token = generateToken(user);
  res.json({
    token,
    user: { id: user.id, username: user.username, role: user.role, name: user.name, team_id: user.team_id }
  });
});

router.get('/me', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../auth');
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await dbGet('SELECT id, username, role, name, team_id FROM users WHERE id = $1', [decoded.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(403).json({ error: 'Invalid token' });
  }
});

module.exports = router;
