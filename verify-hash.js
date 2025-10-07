const bcrypt = require('bcrypt');

const hash = '$2b$12$myQVuq5oj4x5KquKrx3ySOxRFjRY2tm/f9yyyY1fd1z2ptNoR.7jW';
const password = 'admin123';

console.log('Testing password:', password);
console.log('Against hash:', hash);

bcrypt.compare(password, hash).then(result => {
  console.log('Password matches:', result);
  if (result) {
    console.log('✅ Password is correct');
  } else {
    console.log('❌ Password does not match');
    console.log('Generating new hash...');
    return bcrypt.hash(password, 12);
  }
}).then(newHash => {
  if (newHash) {
    console.log('New hash:', newHash);
  }
});
