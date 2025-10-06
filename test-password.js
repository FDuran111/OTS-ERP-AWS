const bcrypt = require('bcrypt');

const hash = '$2b$12$PmZtpIgDcfoKrOvvPWb2g.FC0EpCXBljSZQwbnS393bBakNkAbwTK';
const password = 'admin123';

bcrypt.compare(password, hash).then(result => {
  console.log('Password matches:', result);
  process.exit(result ? 0 : 1);
});
