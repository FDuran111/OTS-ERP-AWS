const { Client } = require('pg');

const client = new Client({
  host: 'db.xudcmdliqyarbfdqufbq.supabase.co',
  port: 5432,
  user: 'postgres',
  password: 'pU8yhL85GQxHtWuU',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

client.connect()
  .then(() => {
    console.log('Connected!');
    return client.query('SELECT NOW()');
  })
  .then(res => {
    console.log('Time:', res.rows[0].now);
    return client.end();
  })
  .catch(err => {
    console.error('Error:', err.message);
    console.error('Host:', err.host);
    console.error('Code:', err.code);
  });