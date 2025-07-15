const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xudcmdliqyarbfdqufbq.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY is not set in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupStorageBuckets() {
  try {
    console.log('Setting up Supabase Storage buckets...\n');
    
    // List existing buckets
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return;
    }
    
    console.log('Existing buckets:', existingBuckets?.map(b => b.name).join(', ') || 'none');
    
    // Setup main uploads bucket
    const uploadsBucket = 'uploads';
    const uploadsExists = existingBuckets?.some(b => b.name === uploadsBucket);
    
    if (!uploadsExists) {
      console.log(`\nCreating '${uploadsBucket}' bucket...`);
      const { data, error } = await supabase.storage.createBucket(uploadsBucket, {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/svg+xml',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain',
          'text/csv',
          'application/zip',
          'application/x-rar-compressed',
          'application/x-7z-compressed'
        ]
      });
      
      if (error) {
        console.error(`Error creating ${uploadsBucket} bucket:`, error);
      } else {
        console.log(`✓ ${uploadsBucket} bucket created successfully`);
      }
    } else {
      console.log(`✓ ${uploadsBucket} bucket already exists`);
    }
    
    // Setup thumbnails bucket
    const thumbnailsBucket = 'thumbnails';
    const thumbnailsExists = existingBuckets?.some(b => b.name === thumbnailsBucket);
    
    if (!thumbnailsExists) {
      console.log(`\nCreating '${thumbnailsBucket}' bucket...`);
      const { data, error } = await supabase.storage.createBucket(thumbnailsBucket, {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp'
        ]
      });
      
      if (error) {
        console.error(`Error creating ${thumbnailsBucket} bucket:`, error);
      } else {
        console.log(`✓ ${thumbnailsBucket} bucket created successfully`);
      }
    } else {
      console.log(`✓ ${thumbnailsBucket} bucket already exists`);
    }
    
    console.log('\n✅ Storage setup complete!');
    
    // Test bucket access
    console.log('\nTesting bucket access...');
    const { data: testList, error: testError } = await supabase.storage
      .from(uploadsBucket)
      .list('', { limit: 1 });
      
    if (testError) {
      console.error('Error accessing uploads bucket:', testError);
    } else {
      console.log('✓ Successfully accessed uploads bucket');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the setup
setupStorageBuckets();