const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function updateUserPassword(email, newPassword) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update the user's password
    const result = await pool.query(
      'UPDATE "User" SET password = $1 WHERE email = $2 RETURNING id, email, name',
      [hashedPassword, email]
    );
    
    if (result.rows.length === 0) {
      console.error('User not found with email:', email);
      process.exit(1);
    }
    
    console.log('Password updated successfully for user:', result.rows[0].email);
    console.log('User details:', result.rows[0]);
    
  } catch (error) {
    console.error('Error updating password:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Get command line arguments
const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.log('Usage: node update-user-password.js <email> <new-password>');
  console.log('Example: node update-user-password.js admin@example.com newpassword123');
  process.exit(1);
}

// Run the update
updateUserPassword(email, newPassword);