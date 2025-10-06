const bcryptjs = require('bcryptjs');

const password = 'admin123';

bcryptjs.hash(password, 12).then(hash => {
  console.log('bcryptjs hash:', hash);

  // Verify it works
  return bcryptjs.compare(password, hash).then(matches => {
    console.log('Verification:', matches ? '✅ MATCHES' : '❌ DOES NOT MATCH');
    return hash;
  });
}).then(hash => {
  console.log('\nUpdate command:');
  console.log(`psql postgresql://localhost/ots_erp_local -c "UPDATE \\"User\\" SET password = '${hash}' WHERE email = 'admin@admin.com';"`);
});
