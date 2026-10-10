const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../middleware/requireAuth');
const { extractResume } = require('../services/extractProfile');

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

// stale: older than 90 days, so the UI can ask "still current?"
const RESUME_FIELDS = `resume_profile AS profile, resume_updated_at AS "updatedAt", resume_updated_at < now() - interval '90 days' AS stale`;

// GET /api/users/me/resume — the saved resume summary, or null
router.get('/me/resume', async (req, res) => {
  const { rows } = await db.query(`SELECT ${RESUME_FIELDS} FROM users WHERE id = $1 AND resume_updated_at IS NOT NULL`, [req.userId]);
  res.json(rows[0] || null);
});

// PUT /api/users/me/resume — { text } → condensed profile Aria uses in tailored interviews
router.put('/me/resume', async (req, res) => {
  // PDF text can contain NUL characters, which Postgres refuses to store.
  const text = typeof req.body.text === 'string' ? req.body.text.replace(/\0/g, '').trim() : '';
  if (text.length < 100) return res.status(400).json({ error: 'That looks too short to be a resume. Paste the full text.' });
  if (text.length > 20000) return res.status(400).json({ error: 'Resume is too long (max 20,000 characters).' });

  let profile;
  try {
    profile = await extractResume(text);
  } catch (err) {
    console.error('Resume extraction failed:', err.message);
    return res.status(502).json({ error: "Couldn't read your resume right now. Please try again." });
  }
  const { rows } = await db.query(
    `UPDATE users SET resume_text = $1, resume_profile = $2, resume_updated_at = now() WHERE id = $3 RETURNING ${RESUME_FIELDS}`,
    [text, JSON.stringify(profile), req.userId]
  );
  res.json(rows[0]);
});

// DELETE /api/users/me/resume — past interviews keep their own snapshot
router.delete('/me/resume', async (req, res) => {
  await db.query('UPDATE users SET resume_text = NULL, resume_profile = NULL, resume_updated_at = NULL WHERE id = $1', [req.userId]);
  res.status(204).end();
});

module.exports = router;
