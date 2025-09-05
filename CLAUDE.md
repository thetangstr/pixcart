# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: PixCart - AI Pet Portrait Platform

PixCart transforms pet photos into oil painting masterpieces using Google Gemini AI. Production site: https://oil-painting-app.vercel.app

## Essential Commands

```bash
# Development
npm run dev                    # Start dev server with Turbopack on port 3000

# Build & Deploy
npm run build                  # Production build (includes Prisma generation)
git push origin main           # Auto-deploys to Vercel

# Database
npx prisma db push             # Push schema changes to database
npx prisma generate            # Generate Prisma client
npx prisma studio              # Open database GUI

# Testing & Monitoring
npm run lint                   # ESLint (allows up to 100 warnings)
npx playwright test            # Run E2E tests
npm run monitor:comprehensive  # Check deployment status
```

## Critical Configuration Issues & Solutions

### Database Connection (Most Common Issue)
**Problem**: "Can't reach database server" or "Tenant or user not found"

**Solution**: The app now uses Supabase JS client for IPUsage/UserUsage operations instead of Prisma direct connection. This bypasses DATABASE_URL issues entirely. See `/src/lib/rate-limit-supabase.ts`.

**If DATABASE_URL is still needed**:
- Use pooler connection (port 6543), NOT direct (port 5432)
- Format: `postgresql://postgres.[project-ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`

### Required Environment Variables (Vercel)
```
NEXT_PUBLIC_SUPABASE_URL        # https://mqkqyigujbamrvebrhsd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY   # Your anon key
GEMINI_API_KEY                  # Google Gemini API key
DATABASE_URL                     # Pooler connection string (see above)
```

## Architecture & Key Design Decisions

### Hybrid Database Approach
- **Prisma**: Used for User, Order, Feedback tables (complex relations)
- **Supabase Client**: Used for IPUsage, UserUsage (rate limiting) to avoid connection issues
- This split approach solved persistent DATABASE_URL authentication problems

### Authentication & Access Control
- **Admin Email**: thetangstr@gmail.com (hardcoded check in multiple places)
- **Allowlist System**: New users are waitlisted by default, admin auto-approved
- **Rate Limiting**: 1 image/day for anonymous, 10/day for users, unlimited for admin

### API Route Structure
```
/api/generate          # Main image generation endpoint (uses Supabase client for rate limit)
/api/user/*           # User-specific endpoints (usage, beta status)
/api/admin/*          # Admin-only endpoints (require isAdmin check)
/api/feedback         # User feedback submission
/api/test-supabase    # Test endpoint to verify Supabase connection
```

### Image Generation Flow
1. User uploads image → `/api/generate`
2. Check rate limits via Supabase client (not Prisma)
3. Call Gemini API with `gemini-2.0-flash-exp` model
4. Track usage in database
5. Return generated image + usage stats

## Common Development Tasks

### Fix "Failed to generate preview" Error
1. Check browser console for specific error
2. Verify Gemini API key is set
3. Check rate limiting (IPUsage table)
4. Ensure image data is valid base64

### Add New User as Admin
```sql
-- Run in Supabase SQL Editor
UPDATE "User" 
SET "isAdmin" = true, "isAllowlisted" = true, "dailyImageLimit" = 999
WHERE email = 'user@example.com';
```

### Reset Rate Limits
```sql
-- Clear today's IP usage
DELETE FROM "IPUsage" WHERE date = '2025-09-05';

-- Reset user's daily usage
DELETE FROM "UserUsage" WHERE date = '2025-09-05';
```

### Deploy Emergency Fix
```bash
# Make changes
git add -A
git commit -m "Fix: [description]"
git push origin main
# Auto-deploys to Vercel, wait ~2 minutes
```

## File Organization

```
src/
  app/                    # Next.js app router pages
    api/                  # API routes
      generate/           # Main AI generation endpoint
      admin/              # Admin-only endpoints
    admin/                # Admin UI pages
  components/            # React components
    ui/                  # Shadcn UI components
  lib/                   # Utilities and configurations
    supabase/            # Supabase client setup
    rate-limit-supabase.ts  # Rate limiting using Supabase (NOT Prisma)
    gemini.ts            # Gemini AI integration
    prisma.ts            # Prisma client (for non-rate-limit operations)
```

## Production Monitoring

### Check Deployment Status
```bash
# View latest deployment
curl https://oil-painting-app.vercel.app/api/test-supabase

# Test image generation
curl -X POST https://oil-painting-app.vercel.app/api/generate \
  -H "Content-Type: application/json" \
  -d '{"imageData": "data:image/jpeg;base64,/9j/4AAQ...", "style": "renaissance"}'
```

### Monitor Errors
- Check Vercel Functions logs for API errors
- Browser console for client-side errors
- Supabase dashboard for database issues

## Important Notes

1. **Prisma Generation**: Always included in build script, required for Vercel deployments
2. **Git Hooks**: Pre-push validation runs automatically (can be slow)
3. **Rate Limiting**: Enforced at IP level for anonymous users, user level for authenticated
4. **Deployment**: Direct push to main auto-deploys, no PR needed for urgent fixes
5. **Database Tables**: Must exist in Supabase before app works (see supabase-sql-setup.sql)