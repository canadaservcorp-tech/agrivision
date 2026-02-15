const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../models/database');
const { generateToken } = require('../middleware/auth');

// POST /api/v1/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role = 'farmer' } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'Missing fields' });
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name, role) VALUES ($1,$2,$3,$4) RETURNING id, email, name, role, plan',
      [email, hash, name, role]
    );
    const user = result.rows[0];
    res.status(201).json({ user, token: generateToken(user) });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: e.message });
  }
});

// POST /api/v1/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    if (!result.rows[0]) return res.status(401).json({ error: 'Invalid credentials' });
    const user = result.rows[0];
    if (!await bcrypt.compare(password, user.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
    const { password_hash, ...safe } = user;
    res.json({ user: safe, token: generateToken(safe) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
