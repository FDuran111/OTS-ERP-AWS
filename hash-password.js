const bcrypt = require('bcrypt');

bcrypt.hash('admin123', 12).then(hash => {
  console.log(hash);
});
