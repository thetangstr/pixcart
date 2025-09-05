# Fix "Failed to generate preview" Error

## Issue Summary
The application is failing to generate AI previews with the error "Failed to generate preview". This is caused by missing environment variables in production.

## Root Causes

1. **"Could not establish connection" error**: This is a browser extension error (likely from a password manager or ad blocker). It's harmless and doesn't affect the app functionality.

2. **401 errors on `/api/user/usage`**: These are expected for non-authenticated users. The app correctly returns 401 (Unauthorized) which is the proper behavior.

3. **"Failed to generate preview" error**: This is the critical issue - the GEMINI_API_KEY is not set in production.

## Solution

### 1. Set GEMINI_API_KEY in Vercel

Go to your Vercel dashboard → Project Settings → Environment Variables and add:

```
GEMINI_API_KEY=your-actual-gemini-api-key
```

To get a Gemini API key:
1. Go to https://makersuite.google.com/app/apikey
2. Create a new API key
3. Copy and paste it into Vercel

### 2. Verify All Required Environment Variables

Ensure these are ALL set in Vercel:

```bash
# Required for database
DATABASE_URL="postgresql://postgres.mqkqyigujbamrvebrhsd:anhuali11men@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Required for Supabase auth
NEXT_PUBLIC_SUPABASE_URL="https://mqkqyigujbamrvebrhsd.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here"

# Required for AI generation
GEMINI_API_KEY="your-gemini-api-key"

# Required for auth
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="https://oil-painting-app.vercel.app"
```

### 3. Redeploy After Setting Variables

After adding the GEMINI_API_KEY:
1. Trigger a new deployment in Vercel
2. Wait for deployment to complete
3. Test the generation feature

## Testing the Fix

Once deployed with the GEMINI_API_KEY:

1. Go to https://oil-painting-app.vercel.app
2. Sign in as admin (thetangstr@gmail.com)
3. Upload an image
4. Select a style
5. Click generate

The preview should now generate successfully.

## About the Errors You're Seeing

### Browser Console Errors
- **"Could not establish connection"**: Browser extension issue, not app-related
- **401 on /api/user/usage**: Expected behavior for unauthenticated requests

### Why It Works Locally But Not in Production
Your local `.env.local` file has the GEMINI_API_KEY set, but it wasn't added to Vercel's environment variables.

## Quick Test Endpoint

After setting the GEMINI_API_KEY, you can test if it's working:

```bash
curl -X POST https://oil-painting-app.vercel.app/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "imageData": "data:image/jpeg;base64,/9j/4AAQ...",
    "style": "renaissance"
  }'
```

If the API key is set correctly, you should get a response with preview data instead of an error.