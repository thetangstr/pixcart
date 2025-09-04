# 🚨 CRITICAL: Production Environment Variables Required

## The production site is broken because Vercel is missing these environment variables:

### 1. **DATABASE_URL** (MOST CRITICAL)
```
DATABASE_URL=postgresql://postgres.mqkqyigujbamrvebrhsd:[YOUR_PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```
**Get from:** Supabase Dashboard → Settings → Database → Connection String (Use Transaction Pooler for Vercel)

### 2. **GEMINI_API_KEY** (Required for AI generation)
```
GEMINI_API_KEY=AIzaSyCezYU2wRlZcQDV28tMY1XwiIYbv3s7Hhs
```

### 3. **Supabase Keys** (May already be set)
```
NEXT_PUBLIC_SUPABASE_URL=https://mqkqyigujbamrvebrhsd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[Get from Supabase Dashboard]
SUPABASE_SERVICE_ROLE_KEY=[Get from Supabase Dashboard]
```

## How to Fix:

1. Go to: https://vercel.com/thetangstrs-projects/oil-painting-app/settings/environment-variables
2. Add each environment variable above
3. Click "Save"
4. Redeploy by clicking "Redeploy" button

## Current Issues This Will Fix:

- ❌ Admin console redirecting to homepage (database connection failing)
- ❌ AI generation "Failed to generate preview" (missing Gemini API key)
- ❌ Authentication not working properly (database connection failing)
- ✅ Double upload issue (already fixed in code)

## Admin Access Issue:

The admin console redirect is happening because:
1. Your Supabase user ID doesn't match the database user ID
2. The database connection is failing in production

Once the DATABASE_URL is set correctly, the admin console will work for thetangstr@gmail.com.