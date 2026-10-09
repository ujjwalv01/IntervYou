require('dotenv').config();
const fs = require('fs');
const db = require('./db');

db.query(fs.readFileSync(`${__dirname}/schema.sql`, 'utf8'))
  .then(() => console.log('Migration complete'))
  .catch((err) => {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => db.pool.end());
