const fs = require('fs');
const path = require('path');

console.log('🔧 Preparing production environment...');

// Ensure PostgreSQL is used for production
const envContent = `DATABASE_URL=\${DATABASE_URL}`;
const envPath = path.join(process.cwd(), '.env.production');

try {
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Production environment file created');
} catch (error) {
  console.error('❌ Failed to create production environment file:', error.message);
  process.exit(1);
}

console.log('🚀 Production environment prepared successfully');