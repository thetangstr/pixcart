/**
 * Setup test admin user for Playwright tests
 * This creates a test admin user that can be used for automated testing
 */

require('dotenv').config({ path: '.env.local' });

const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
const prisma = new PrismaClient();

const TEST_ADMIN_EMAIL = 'admin.test@pixcart.com';
const TEST_ADMIN_PASSWORD = 'TestAdmin123!@#';

// Initialize Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function setupTestAdmin() {
  console.log('Setting up test admin user for Playwright tests...\n');
  
  try {
    // First, try to sign up the user in Supabase
    console.log('Creating Supabase auth user...');
    
    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === TEST_ADMIN_EMAIL);
    
    let authUser;
    if (existingUser) {
      console.log('Auth user already exists, updating password...');
      // Update password for existing user
      const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        { password: TEST_ADMIN_PASSWORD }
      );
      if (updateError) {
        console.error('Error updating user password:', updateError);
      } else {
        authUser = updatedUser.user;
        console.log('✅ Password updated for existing auth user');
      }
    } else {
      // Create new auth user
      const { data: newUser, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email: TEST_ADMIN_EMAIL,
        password: TEST_ADMIN_PASSWORD,
        email_confirm: true // Auto-confirm email
      });
      
      if (signUpError) {
        console.error('Error creating auth user:', signUpError);
        throw signUpError;
      }
      
      authUser = newUser.user;
      console.log('✅ Created new auth user');
    }
    
    if (!authUser) {
      throw new Error('Failed to create or find auth user');
    }
    
    // Now create or update the user in our database
    console.log('Setting up database user...');
    
    const dbUser = await prisma.user.upsert({
      where: { email: TEST_ADMIN_EMAIL },
      update: {
        id: authUser.id, // Ensure IDs match
        isAdmin: true,
        isBetaTester: true,
        isAllowlisted: true,
        isWaitlisted: false,
        dailyImageLimit: 999999,
        name: 'Test Admin',
        approvedAt: new Date()
      },
      create: {
        id: authUser.id, // Use Supabase auth user ID
        email: TEST_ADMIN_EMAIL,
        name: 'Test Admin',
        isAdmin: true,
        isBetaTester: true,
        isAllowlisted: true,
        isWaitlisted: false,
        dailyImageLimit: 999999,
        approvedAt: new Date()
      }
    });
    
    console.log('✅ Database user configured as admin');
    
    // Display the test credentials
    console.log('\n' + '='.repeat(50));
    console.log('TEST ADMIN USER CREATED SUCCESSFULLY');
    console.log('='.repeat(50));
    console.log(`Email: ${TEST_ADMIN_EMAIL}`);
    console.log(`Password: ${TEST_ADMIN_PASSWORD}`);
    console.log('Admin Status: ✅');
    console.log('Beta Tester: ✅');
    console.log('Daily Limit: Unlimited');
    console.log('='.repeat(50));
    console.log('\nUse these credentials in Playwright tests');
    
    // Test that we can sign in
    console.log('\nTesting authentication...');
    const { data: session, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: TEST_ADMIN_EMAIL,
      password: TEST_ADMIN_PASSWORD
    });
    
    if (signInError) {
      console.error('❌ Sign in test failed:', signInError);
    } else if (session?.user) {
      console.log('✅ Sign in test successful');
      // Sign out after test
      await supabaseAdmin.auth.signOut();
    }
    
  } catch (error) {
    console.error('Error setting up test admin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Export credentials for use in tests
module.exports = {
  TEST_ADMIN_EMAIL,
  TEST_ADMIN_PASSWORD
};

// Run if called directly
if (require.main === module) {
  setupTestAdmin();
}