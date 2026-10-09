const router = require('express').Router();
const bcrypt = require('bcrypt');
const db = require('../db');
const { signToken } = require('../middleware/requireAuth');

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');

  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required' });
  if (name.length > 120) return res.status(400).json({ error: 'Name is too long' });
  if (email.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }
  // bcrypt ignores anything past 72 bytes, so cap it instead of silently truncating.
  if (password.length < 6 || password.length > 72) {
    return res.status(400).json({ error: 'Password must be 6–72 characters' });
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING ${db.USER_FIELDS}`,
      [name, email, await bcrypt.hash(password, 10)]
    );
    res.status(201).json({ token: signToken(rows[0].id, req.body.remember === true), user: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'An account with this email already exists' });
    throw err;
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const { rows } = await db.query(
    `SELECT ${db.USER_FIELDS}, password_hash FROM users WHERE LOWER(email) = $1`,
    [email]
  );
  const { password_hash, ...user } = rows[0] || {};
  if (rows[0] && !password_hash) {
    return res.status(401).json({ error: 'This account uses Google or GitHub sign-in. Use that button instead.' });
  }
  if (!rows[0] || !(await bcrypt.compare(password, password_hash))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  res.json({ token: signToken(user.id, req.body.remember === true), user });
});

module.exports = router;
