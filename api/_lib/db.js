const { neon } = require('@neondatabase/serverless');

let sql;

function getSql() {
  if (!sql) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) throw new Error('DATABASE_URL missing');
    sql = neon(url);
  }
  return sql;
}

module.exports = { getSql };
