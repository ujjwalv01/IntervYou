// Groq retires models regularly — override with GROQ_MODEL instead of editing code.
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

// One JSON-mode chat call. Throws on failure so each caller decides how to recover.
async function groqJson(system, user) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Groq API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

module.exports = { GROQ_MODEL, groqJson };
