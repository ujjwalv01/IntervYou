const { TYPE_LABELS, GROQ_MODEL } = require('./buildAssistant');

const CATEGORIES = ['communication', 'structure', 'depth', 'confidence'];

// Too little said to grade — skip the LLM, which would otherwise invent feedback.
const EMPTY_REPORT = {
  overall_score: 0,
  category_scores: Object.fromEntries(CATEGORIES.map((c) => [c, 0])),
  strengths: [],
  improvements: ['Stay in the interview long enough to answer a few questions so there is something to evaluate.'],
  question_breakdown: [],
  summary: 'The interview ended before you gave enough answers to evaluate. Start a new session and answer a few questions to get a full report.',
};

const clamp = (n, max) => Math.min(max, Math.max(0, Math.round(Number(n) || 0)));
const strings = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);

// Coerce the model's JSON into the exact shape the DB and UI expect.
function normalize(r) {
  return {
    overall_score: clamp(r.overall_score, 100),
    category_scores: Object.fromEntries(CATEGORIES.map((c) => [c, clamp(r.category_scores?.[c], 10)])),
    strengths: strings(r.strengths),
    improvements: strings(r.improvements),
    question_breakdown: (Array.isArray(r.question_breakdown) ? r.question_breakdown : []).map((q) => ({
      question: String(q?.question || ''),
      answer_summary: String(q?.answer_summary || ''),
      evaluation: String(q?.evaluation || ''),
    })),
    summary: String(r.summary || ''),
  };
}

// Throws if Groq fails, so the caller can ask the user to retry instead of storing a fake score.
async function generateFeedback({ transcript, interviewType, user }) {
  const candidateWords = transcript
    .filter((m) => m.role === 'user')
    .map((m) => m.content)
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;
  if (candidateWords < 15) return EMPTY_REPORT;

  const prompt = `You are grading a ${TYPE_LABELS[interviewType] || 'General'} mock interview transcript for a candidate targeting a ${user.role || 'Software Developer'} role at ${user.experience_level || 'Mid-level'} level. Base every judgment ONLY on what's actually in the transcript — never invent details. Respond with ONLY a JSON object of exactly this shape:
{
  "overall_score": <integer 0-100>,
  "category_scores": { "communication": <1-10>, "structure": <1-10>, "depth": <1-10>, "confidence": <1-10> },
  "strengths": ["...", "...", "..."],
  "improvements": ["...", "...", "..."],
  "question_breakdown": [ { "question": "...", "answer_summary": "...", "evaluation": "..." } ],
  "summary": "2-3 sentence overall narrative"
}`;
  const formatted = transcript.map((m) => `${m.role === 'assistant' ? 'Interviewer' : 'Candidate'}: ${m.content}`).join('\n');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: `Here is the full interview transcript:\n\n${formatted}` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Groq API error ${res.status}: ${await res.text()}`);

  const data = await res.json();
  return normalize(JSON.parse(data.choices[0].message.content));
}

module.exports = { generateFeedback };
