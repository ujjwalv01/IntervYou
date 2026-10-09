const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neon needs SSL; a local Postgres usually doesn't have it.
  ssl: /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL) ? false : { rejectUnauthorized: false },
});

// Neon closes idle connections; without this listener that error crashes the server.
pool.on('error', (err) => console.error('Postgres pool error:', err.message));

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  // Columns returned to the client for a user, already camelCased.
  USER_FIELDS: 'id, name, email, role, experience_level AS "experienceLevel", created_at AS "createdAt"',
};
