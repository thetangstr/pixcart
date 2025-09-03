#!/usr/bin/env node

// This script handles database setup for production
// It's run separately to avoid issues with special characters in DATABASE_URL during build

const { execSync } = require('child_process');

if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
  console.log('Skipping database push in production/Vercel environment');
  console.log('Database should be set up manually or through migrations');
  process.exit(0);
}

try {
  console.log('Setting up database...');
  execSync('npx prisma db push', { stdio: 'inherit' });
  console.log('Database setup complete!');
} catch (error) {
  console.error('Database setup failed:', error.message);
  // Don't fail the build if db push fails in production
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    console.log('Continuing despite database push failure (production mode)');
    process.exit(0);
  }
  process.exit(1);
}