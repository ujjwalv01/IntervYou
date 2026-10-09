// Keep only well-formed { role: 'user' | 'assistant', content } entries.
function cleanTranscript(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m) => ['user', 'assistant'].includes(m?.role) && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.trim() }));
}

// Fallback when the browser didn't capture a transcript: read it from Vapi's call record.
async function fetchVapiTranscript(callId) {
  try {
    const res = await fetch(`https://api.vapi.ai/call/${encodeURIComponent(callId)}`, {
      headers: { Authorization: `Bearer ${process.env.VAPI_PRIVATE_KEY}` },
    });
    const call = await res.json();
    const messages = call.artifact?.messages || call.messages || [];
    return cleanTranscript(messages.map((m) => ({ role: m.role === 'bot' ? 'assistant' : m.role, content: m.message })));
  } catch (err) {
    console.error('Vapi transcript fallback failed:', err.message);
    return [];
  }
}

module.exports = { cleanTranscript, fetchVapiTranscript };
