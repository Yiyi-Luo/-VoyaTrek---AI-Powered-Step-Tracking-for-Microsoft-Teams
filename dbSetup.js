const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function setup() {
  try {
    await client.connect();
    console.log('Connected to database');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS step_logs (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        step_count INTEGER NOT NULL,
        log_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('Table created successfully');
    await client.end();
  } catch (err) {
    console.error('Error setting up database:', err);
    await client.end();
  }
}

setup();