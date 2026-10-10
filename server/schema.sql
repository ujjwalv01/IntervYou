CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) UNIQUE NOT NULL,
  password_hash VARCHAR(200) NOT NULL,
  role VARCHAR(120),
  experience_level VARCHAR(40),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS interview_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  interview_type VARCHAR(40) NOT NULL,
  status VARCHAR(20) DEFAULT 'in_progress',
  vapi_call_id VARCHAR(100),
  transcript JSONB,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS feedback_reports (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES interview_sessions(id) ON DELETE CASCADE,
  overall_score INTEGER,
  category_scores JSONB,
  strengths JSONB,
  improvements JSONB,
  question_breakdown JSONB,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- One report per session. Older versions could insert duplicates, so keep only the newest first.
DELETE FROM feedback_reports a USING feedback_reports b WHERE a.session_id = b.session_id AND a.id < b.id;
CREATE UNIQUE INDEX IF NOT EXISTS feedback_reports_session_id_key ON feedback_reports (session_id);

-- Emails are matched case-insensitively.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key ON users (LOWER(email));

CREATE INDEX IF NOT EXISTS interview_sessions_user_id_idx ON interview_sessions (user_id, started_at DESC);

-- Google / GitHub accounts have no password.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Tailored interviews: resume on the user, job description + context snapshot on each session.
ALTER TABLE users ADD COLUMN IF NOT EXISTS resume_text TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS resume_profile JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS resume_updated_at TIMESTAMPTZ;
ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS job_description TEXT;
ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS context JSONB;
ALTER TABLE feedback_reports ADD COLUMN IF NOT EXISTS jd_fit JSONB;
