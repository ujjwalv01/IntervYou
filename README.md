# Intervu - AI Mock Interview Platform

Intervu is a voice-first AI mock interview platform that conducts real, adaptive conversations — not scripted quizzes. The AI interviewer (Aria) listens to your answers, follows up on vague points, pushes back when answers are weak, and acknowledges strong responses before moving on. After each session, you get a structured feedback report with scores, strengths, and areas for improvement.

## Architecture

```
Next.js Client (App Router) ←→ Express API ←→ Postgres (Neon)
       ↕                              ↕
  Vapi (WebRTC voice)           Groq (LLM feedback)
       ↕
  Groq (live conversation via Vapi)
```

- **Frontend**: Next.js 16, JavaScript, Tailwind CSS v4 - dark-mode glassmorphism UI
- **Backend**: Node.js + Express - REST API with JWT authentication
- **Database**: PostgreSQL on Neon (serverless) - users, sessions, feedback reports
- **Voice AI**: Vapi manages the full voice pipeline (STT → LLM → TTS) via browser WebRTC. The assistant is built as a "transient assistant" per session , no dashboard config needed.
- **LLM**: Groq (`openai/gpt-oss-120b` by default, override with `GROQ_MODEL`) — powers both the live conversational interview (via Vapi) and the post-interview feedback generation (direct API call).

## Setup

```bash
# 1. Clone & Install
git clone https://github.com/ujjwalv01/IntervU.git && cd IntervU && npm run install:all

# 2. Copy Environment Files (Fill in your keys in both files)
cp client/.env.example client/.env && cp server/.env.example server/.env

# 3. Initialize Database
npm run migrate

# 4. Start Application
npm run dev
```

The client runs on `http://localhost:3000`, the server on `http://localhost:5001`.

### Required Accounts
- **Neon** (neon.tech) — Postgres database, copy the pooled connection string
- **Vapi** (vapi.ai) — Copy Public Key + Private Key. Add your Groq API key in Vapi Dashboard → Provider Keys
- **Groq** (console.groq.com) — API key (free tier)

## Cost Analysis

Voice is handled by Vapi with Groq as the LLM. Realistic all-in cost is roughly **$0.10–0.15/min** of conversation (Vapi orchestration + Groq tokens + default STT/TTS), so a 15-minute mock interview costs well under $2. At scale, this is the dominant variable cost of the product and the main lever for margin — cheaper TTS/STT providers or a smaller Groq model would reduce it further at some quality cost.

## Key Features

- **Adaptive voice interviews** - Aria asks follow-up questions based on your actual answers, never from a fixed list
- **4 interview types** - Behavioral, Technical, System Design, HR/Culture Fit
- **Live transcript** - See the conversation as it happens
- **Structured feedback** - Overall score, category breakdown, strengths, improvements, question-by-question evaluation
- **Session history** - Dashboard with all past interviews and scores

## Known Limitations / Future Improvements

- **Feedback generation is synchronous** — adds a few seconds of latency after the call ends. If it fails, the report page offers a one-click retry from the saved transcript.
- **No resume/job-description upload** — the system prompt uses the user's stated role and level, but doesn't incorporate a specific JD or resume for targeted questions.
- **Vapi transcript fallback** — if the client-side transcript capture fails, the server reads the transcript from Vapi using the saved call id.
- **No admin panel** — no way for an evaluator to review interviews or override scores.
- **Single user type** — no distinction between candidate and recruiter roles.
