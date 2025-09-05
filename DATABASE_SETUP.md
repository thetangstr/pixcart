# Database Setup - IMPORTANT

## Current Issue
Your Supabase database has **NO TABLES** created. This is why the application is failing.

## Steps to Fix

### 1. Get Your Database Password
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your "pixcart" project
3. Go to **Settings** → **Database**
4. Find your database password (you may need to reset it)

### 2. Create Tables Using Prisma

Once you have the correct password, run this command locally:

```bash
# Replace YOUR_ACTUAL_PASSWORD with your real password
DATABASE_URL="postgresql://postgres:YOUR_ACTUAL_PASSWORD@db.mqkqyigujbamrvebrhsd.supabase.co:5432/postgres" \
npx prisma db push --skip-generate
```

This will create all the required tables:
- User
- IPUsage  
- OilPaintingOrder
- UserUsage
- Feedback
- Account
- Session
- VerificationToken

### 3. Update Vercel Environment Variables

After tables are created, update your Vercel DATABASE_URL to use the pooler connection:

```
DATABASE_URL="postgresql://postgres.mqkqyigujbamrvebrhsd:YOUR_ACTUAL_PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
```

### 4. Important Notes

- **Direct connection (port 5432)**: Use ONLY for migrations/schema changes
- **Pooler connection (port 6543)**: Use for production application

## Why This Happened

The application code expects these tables to exist, but they were never created in your Supabase database. Prisma needs to push the schema to create them.

## Quick Check

After running the migration, you should see these tables in your Supabase dashboard:
- Go to Table Editor in Supabase
- You should see all the tables listed above
- The User table should have columns like: id, email, name, isAllowlisted, isAdmin, etc.

## If Password is Lost

If you don't know your database password:
1. Go to Supabase Dashboard → Settings → Database
2. Click "Reset database password"
3. Copy the new password
4. Use it in the commands above