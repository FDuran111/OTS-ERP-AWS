const bcrypt = require('bcryptjs');

async function generateHash(password) {
  const hash = await bcrypt.hash(password, 12);
  console.log(`Password: ${password}`);
  console.log(`Hash: ${hash}`);
  
  // Verify it works
  const isValid = await bcrypt.compare(password, hash);
  console.log(`Verification: ${isValid ? 'PASSED' : 'FAILED'}`);
}

generateHash('poCiX02QgnrV0kaL');