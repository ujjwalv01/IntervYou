const { TYPE_LABELS } = require('./buildAssistant');
const { groqJson } = require('./groq');

const CATEGORIES = ['communication', 'structure', 'depth', 'confidence'];
const FIT = ['strong', 'partial', 'missing'];

// Too little said to grade — skip the LLM, which would otherwise invent feedback.
const EMPTY_REPORT = {
  overall_score: 0,
  category_scores: Object.fromEntries(CATEGORIES.map((c) => [c, 0])),
  strengths: [],
  improvements: ['Stay in the interview long enough to answer a few questions so there is something to evaluate.'],
  question_breakdown: [],
  summary: 'The interview ended before you gave enough answers to evaluate. Start a new session and answer a few questions to get a full report.',
  jd_fit: [],
};

const clamp = (n, max) => Math.min(max, Math.max(0, Math.round(Number(n) || 0)));
const strings = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
const list = (v) => (Array.isArray(v) ? v : []);

// Coerce the model's JSON into the exact shape the DB and UI expect.
function normalize(r) {
  return {
    overall_score: clamp(r.overall_score, 100),
    category_scores: Object.fromEntries(CATEGORIES.map((c) => [c, clamp(r.category_scores?.[c], 10)])),
    strengths: strings(r.strengths),
    improvements: strings(r.improvements),
    question_breakdown: list(r.question_breakdown).map((q) => ({
      question: String(q?.question || ''),
      answer_summary: String(q?.answer_summary || ''),
      evaluation: String(q?.evaluation || ''),
    })),
    summary: String(r.summary || ''),
    jd_fit: list(r.jd_fit).map((f) => ({
      requirement: String(f?.requirement || ''),
      evidence: String(f?.evidence || ''),
      status: FIT.includes(f?.status) ? f.status : 'missing',
    })),
  };
}

// Throws if Groq fails, so the caller can ask the user to retry instead of storing a fake score.
async function generateFeedback({ transcript, interviewType, user, context }) {
  const candidateWords = transcript
    .filter((m) => m.role === 'user')
    .map((m) => m.content)
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;
  if (candidateWords < 15) return EMPTY_REPORT;

  const job = context?.job;
  const role = job?.title || user.role || 'Software Developer';
  // Job-tailored interviews also get rated against each must-have requirement.
  const jdFit = job?.must_have?.length
    ? `,\n  "jd_fit": [ { "requirement": "<one of: ${job.must_have.join(' | ')}>", "evidence": "what they said that shows it, or why it's missing", "status": "strong|partial|missing" } ]`
    : '';

  const prompt = `You are grading a ${TYPE_LABELS[interviewType] || 'General'} mock interview transcript for a candidate targeting a ${role} role at ${user.experience_level || 'Mid-level'} level. Base every judgment ONLY on what's actually in the transcript — never invent details. Respond with ONLY a JSON object of exactly this shape:
{
  "overall_score": <integer 0-100>,
  "category_scores": { "communication": <1-10>, "structure": <1-10>, "depth": <1-10>, "confidence": <1-10> },
  "strengths": ["...", "...", "..."],
  "improvements": ["...", "...", "..."],
  "question_breakdown": [ { "question": "...", "answer_summary": "...", "evaluation": "..." } ],
  "summary": "2-3 sentence overall narrative"${jdFit}
}`;
  const formatted = transcript.map((m) => `${m.role === 'assistant' ? 'Interviewer' : 'Candidate'}: ${m.content}`).join('\n');

  return normalize(await groqJson(prompt, `Here is the full interview transcript:\n\n${formatted}`));
}

module.exports = { generateFeedback };
