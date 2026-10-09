require('dotenv').config();
const express = require('express');
const cors = require('cors');

for (const key of ['DATABASE_URL', 'JWT_SECRET', 'GROQ_API_KEY']) {
  if (!process.env[key]) {
    console.error(`Missing ${key} in server/.env`);
    process.exit(1);
  }
}

const app = express();
// CLIENT_URL (comma-separated) restricts CORS in production; unset allows any origin.
app.use(cors({ origin: process.env.CLIENT_URL?.split(',') || true }));
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  req.body ??= {};
  next();
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/auth', require('./routes/oauth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/sessions', require('./routes/sessions'));
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Express 5 forwards errors thrown in async routes here — never leak stack traces.
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, '0.0.0.0', () => console.log(`IntervYou server running on port ${PORT}`));
