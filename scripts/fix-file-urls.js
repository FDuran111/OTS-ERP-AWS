const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixFileUrls() {
  try {
    console.log('Connecting to database...');
    
    // First, check current status
    const statusResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE "fileUrl" LIKE '/uploads/%') as old_urls,
        COUNT(*) FILTER (WHERE "fileUrl" LIKE '/api/uploads/%') as new_urls,
        COUNT(*) as total_files
      FROM "FileAttachment"
      WHERE active = true
    `);
    
    const stats = statusResult.rows[0];
    console.log('\nCurrent file URL status:');
    console.log(`- Total files: ${stats.total_files}`);
    console.log(`- Old URLs (/uploads/...): ${stats.old_urls}`);
    console.log(`- New URLs (/api/uploads/...): ${stats.new_urls}`);
    
    if (stats.old_urls > 0) {
      console.log(`\nUpdating ${stats.old_urls} file URLs...`);
      
      // Update the URLs
      const updateResult = await pool.query(`
        UPDATE "FileAttachment"
        SET 
          "fileUrl" = '/api' || "fileUrl",
          "thumbnailUrl" = CASE 
            WHEN "thumbnailUrl" IS NOT NULL THEN '/api' || "thumbnailUrl"
            ELSE NULL
          END,
          "updatedAt" = NOW()
        WHERE "fileUrl" LIKE '/uploads/%'
          AND "fileUrl" NOT LIKE '/api/uploads/%'
        RETURNING id, "fileName", "fileUrl", "thumbnailUrl"
      `);
      
      console.log(`\nSuccessfully updated ${updateResult.rowCount} file records!`);
      
      if (updateResult.rows.length > 0) {
        console.log('\nSample of updated files:');
        updateResult.rows.slice(0, 5).forEach(file => {
          console.log(`- ${file.fileName}: ${file.fileUrl}`);
        });
      }
    } else {
      console.log('\nNo files need updating - all URLs are already using the new format!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
    console.log('\nDatabase connection closed.');
  }
}

// Run the fix
fixFileUrls();