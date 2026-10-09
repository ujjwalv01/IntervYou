const router = require('express').Router();
const db = require('../db');
const requireAuth = require('../middleware/requireAuth');

router.use(requireAuth);

// GET /api/users/me
router.get('/me', async (req, res) => {
  const { rows } = await db.query(`SELECT ${db.USER_FIELDS} FROM users WHERE id = $1`, [req.userId]);
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
});

// PATCH /api/users/me — any of name, role, experienceLevel; omitted fields are unchanged.
router.patch('/me', async (req, res) => {
  const clean = (value, max) => (typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null);
  const { rows } = await db.query(
    `UPDATE users
     SET name = COALESCE($1, name), role = COALESCE($2, role), experience_level = COALESCE($3, experience_level)
     WHERE id = $4
     RETURNING ${db.USER_FIELDS}`,
    [clean(req.body.name, 120), clean(req.body.role, 120), clean(req.body.experienceLevel, 40), req.userId]
  );
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
});

module.exports = router;
