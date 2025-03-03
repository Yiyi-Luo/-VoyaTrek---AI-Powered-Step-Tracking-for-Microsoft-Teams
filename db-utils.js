// db-utils.js
const { Client } = require('pg');
require('dotenv').config();

// Create a connection pool for better performance
const getDbClient = () => {
  return new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });
};

// Get user stats
async function getUserStats(username) {
  const client = getDbClient();
  
  try {
    await client.connect();
    
    const query = {
      text: `
        SELECT 
          SUM(step_count) as total_steps,
          AVG(step_count) as avg_steps,
          COUNT(*) as log_count
        FROM step_logs
        WHERE username = $1
      `,
      values: [username],
    };
    
    const result = await client.query(query);
    await client.end();
    
    return result.rows[0];
  } catch (error) {
    await client.end();
    throw error;
  }
}

// Get leaderboard data
async function getLeaderboard(limit = 10) {
  const client = getDbClient();
  
  try {
    await client.connect();
    
    const query = {
      text: `
        SELECT 
          username,
          SUM(step_count) as total_steps
        FROM step_logs
        GROUP BY username
        ORDER BY total_steps DESC
        LIMIT $1
      `,
      values: [limit],
    };
    
    const result = await client.query(query);
    await client.end();
    
    return result.rows;
  } catch (error) {
    await client.end();
    throw error;
  }
}

module.exports = {
  getDbClient,
  getUserStats,
  getLeaderboard
};