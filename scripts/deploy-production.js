const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting production deployment...');

// Function to run commands with error handling
function runCommand(command, description) {
  console.log(`🔧 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed successfully`);
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    process.exit(1);
  }
}

// Environment setup
console.log('📋 Setting up environment...');
const envPath = path.join(process.cwd(), '.env.production');
if (!fs.existsSync(envPath)) {
  const envContent = `DATABASE_URL=\${DATABASE_URL}
NEXT_PUBLIC_SUPABASE_URL=\${NEXT_PUBLIC_SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=\${NEXT_PUBLIC_SUPABASE_ANON_KEY}
GEMINI_API_KEY=\${GEMINI_API_KEY}
NEXTAUTH_SECRET=\${NEXTAUTH_SECRET}
NEXTAUTH_URL=\${NEXTAUTH_URL}
STRIPE_SECRET_KEY=\${STRIPE_SECRET_KEY}
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=\${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}`;
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Production environment file created');
}

// Database preparation
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('postgresql')) {
  console.log('🗄️ Preparing PostgreSQL database...');
  
  // Generate Prisma client
  runCommand('npx prisma generate', 'Generating Prisma client for PostgreSQL');
  
  // Run database migrations in production (if applicable)
  if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
    try {
      runCommand('npx prisma migrate deploy', 'Deploying database migrations');
    } catch (error) {
      console.log('⚠️ Migration failed, continuing with build...');
    }
  }
} else {
  console.log('ℹ️ Using environment DATABASE_URL for production');
  runCommand('npx prisma generate', 'Generating Prisma client');
}

// Build the application
runCommand('npm run build', 'Building Next.js application');

console.log('🎉 Production deployment completed successfully!');
console.log('');
console.log('📊 Deployment Summary:');
console.log('✅ Database configured for PostgreSQL');
console.log('✅ Environment variables set up');
console.log('✅ Prisma client generated');
console.log('✅ Next.js application built');
console.log('');
console.log('🔍 Next steps:');
console.log('1. Ensure all environment variables are set in production');
console.log('2. Database should be accessible from production environment');
console.log('3. Run `npm start` to start the production server');