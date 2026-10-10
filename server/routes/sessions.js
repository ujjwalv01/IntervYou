const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../middleware/requireAuth');
const { buildAssistantConfig } = require('../services/buildAssistant');
const { generateFeedback } = require('../services/generateFeedback');
const { cleanTranscript, fetchVapiTranscript } = require('../services/transcript');
const { buildContext } = require('../services/extractProfile');

const VALID_TYPES = ['behavioral', 'technical', 'system_design', 'hr_culture_fit'];
// Target job of a tailored session (null for generic ones), read from the context snapshot.
const JOB_FIELDS = `s.context->'job'->>'title' AS "jobTitle", s.context->'job'->>'company' AS "jobCompany"`;
const notFound = (res) => res.status(404).json({ error: 'Session not found' });

router.use(requireAuth);
// Non-numeric ids would make Postgres throw; treat them as not found.
router.param('id', (req, res, next, id) => (/^\d+$/.test(id) ? next() : notFound(res)));

// Only ever load the current user's sessions, so other users' sessions look like 404s.
async function findSession(id, userId) {
  const { rows } = await db.query('SELECT * FROM interview_sessions WHERE id = $1 AND user_id = $2', [id, userId]);
  return rows[0];
}

async function findUser(id) {
  const { rows } = await db.query('SELECT name, role, experience_level FROM users WHERE id = $1', [id]);
  return rows[0];
}

// POST /api/sessions — create new session; optional jobDescription + useResume tailor it
router.post('/', async (req, res) => {
  const { interviewType, useResume } = req.body;
  const jobDescription = typeof req.body.jobDescription === 'string' ? req.body.jobDescription.replace(/\0/g, '').trim() : '';
  if (!VALID_TYPES.includes(interviewType)) {
    return res.status(400).json({ error: `Invalid interview type. Must be one of: ${VALID_TYPES.join(', ')}` });
  }
  if (jobDescription.length > 15000) return res.status(400).json({ error: 'Job description is too long (max 15,000 characters).' });

  const resume = useResume
    ? (await db.query('SELECT resume_profile FROM users WHERE id = $1', [req.userId])).rows[0]?.resume_profile
    : null;
  const context = await buildContext({ jobDescription, resume });

  const { rows } = await db.query(
    'INSERT INTO interview_sessions (user_id, interview_type, job_description, context) VALUES ($1, $2, $3, $4) RETURNING id',
    [req.userId, interviewType, jobDescription || null, context && JSON.stringify(context)]
  );
  res.status(201).json({ sessionId: rows[0].id });
});

// GET /api/sessions — list the user's sessions, newest first
router.get('/', async (req, res) => {
  const { rows } = await db.query(
    `SELECT s.id, s.interview_type AS "interviewType", s.status, s.started_at AS "startedAt",
            s.ended_at AS "endedAt", f.overall_score AS "overallScore", ${JOB_FIELDS}
     FROM interview_sessions s
     LEFT JOIN feedback_reports f ON f.session_id = s.id
     WHERE s.user_id = $1
     ORDER BY s.started_at DESC`,
    [req.userId]
  );
  res.json(rows);
});

// GET /api/sessions/:id
router.get('/:id', async (req, res) => {
  const s = await findSession(req.params.id, req.userId);
  if (!s) return notFound(res);
  res.json({
    id: s.id,
    interviewType: s.interview_type,
    status: s.status,
    startedAt: s.started_at,
    endedAt: s.ended_at,
    jobTitle: s.context?.job?.title || null,
    jobCompany: s.context?.job?.company || null,
    usesResume: Boolean(s.context?.resume),
  });
});

// PATCH /api/sessions/:id — store the Vapi call id (used for the transcript fallback)
router.patch('/:id', async (req, res) => {
  const { vapiCallId } = req.body;
  if (typeof vapiCallId !== 'string' || !vapiCallId) return res.status(400).json({ error: 'vapiCallId is required' });
  const { rowCount } = await db.query(
    'UPDATE interview_sessions SET vapi_call_id = $1 WHERE id = $2 AND user_id = $3',
    [vapiCallId.slice(0, 100), req.params.id, req.userId]
  );
  if (!rowCount) return notFound(res);
  res.json({ success: true });
});

// DELETE /api/sessions/:id
router.delete('/:id', async (req, res) => {
  const { rowCount } = await db.query('DELETE FROM interview_sessions WHERE id = $1 AND user_id = $2', [
    req.params.id,
    req.userId,
  ]);
  if (!rowCount) return notFound(res);
  res.status(204).end();
});

// GET /api/sessions/:id/assistant-config — Vapi transient assistant for this session
router.get('/:id/assistant-config', async (req, res) => {
  const session = await findSession(req.params.id, req.userId);
  if (!session) return notFound(res);
  if (session.status !== 'in_progress') return res.status(400).json({ error: 'This session has already been completed' });
  res.json(buildAssistantConfig({ session, user: await findUser(req.userId) }));
});

// POST /api/sessions/:id/end — store transcript and generate feedback.
// Safe to call again: it reuses an existing report, or retries feedback from the stored transcript.
router.post('/:id/end', async (req, res) => {
  const session = await findSession(req.params.id, req.userId);
  if (!session) return notFound(res);

  const existing = await db.query('SELECT id FROM feedback_reports WHERE session_id = $1', [session.id]);
  if (existing.rows[0]) return res.json({ reportId: existing.rows[0].id });

  let transcript = session.status === 'completed' ? cleanTranscript(session.transcript) : cleanTranscript(req.body.transcript);
  if (!transcript.length && session.vapi_call_id) transcript = await fetchVapiTranscript(session.vapi_call_id);

  await db.query(
    `UPDATE interview_sessions SET transcript = $1, status = 'completed', ended_at = COALESCE(ended_at, now()) WHERE id = $2`,
    [JSON.stringify(transcript), session.id]
  );

  let feedback;
  try {
    feedback = await generateFeedback({
      transcript,
      interviewType: session.interview_type,
      user: await findUser(req.userId),
      context: session.context,
    });
  } catch (err) {
    console.error('Feedback generation failed:', err.message);
    return res.status(502).json({ error: 'Could not generate your feedback right now. Please try again.' });
  }

  // ON CONFLICT: if two end requests race, both get the same report id back.
  const { rows } = await db.query(
    `INSERT INTO feedback_reports
       (session_id, overall_score, category_scores, strengths, improvements, question_breakdown, summary, jd_fit)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (session_id) DO UPDATE SET session_id = EXCLUDED.session_id
     RETURNING id`,
    [
      session.id,
      feedback.overall_score,
      JSON.stringify(feedback.category_scores),
      JSON.stringify(feedback.strengths),
      JSON.stringify(feedback.improvements),
      JSON.stringify(feedback.question_breakdown),
      feedback.summary,
      JSON.stringify(feedback.jd_fit),
    ]
  );
  res.json({ reportId: rows[0].id });
});

// GET /api/sessions/:id/report
router.get('/:id/report', async (req, res) => {
  const { rows } = await db.query(
    `SELECT s.id AS "sessionId", s.interview_type AS "interviewType", s.started_at AS "startedAt",
            s.ended_at AS "endedAt", s.transcript, f.overall_score AS "overallScore",
            f.category_scores AS "categoryScores", f.strengths, f.improvements,
            f.question_breakdown AS "questionBreakdown", f.summary, f.jd_fit AS "jdFit", ${JOB_FIELDS}
     FROM interview_sessions s
     JOIN feedback_reports f ON f.session_id = s.id
     WHERE s.id = $1 AND s.user_id = $2`,
    [req.params.id, req.userId]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Report not found' });
  res.json(rows[0]);
});

module.exports = router;
