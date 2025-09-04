# Complete Deployment Guide: Supabase + Vercel + GitHub Integration

## Project Architecture Overview

This guide documents the complete setup and deployment process for a Next.js application with:
- **Frontend**: Next.js 15.5 with App Router and TypeScript
- **Authentication**: Supabase Auth (migrated from NextAuth)
- **Database**: PostgreSQL via Supabase (Prisma ORM)
- **Deployment**: Vercel
- **Version Control**: GitHub with automated deployment hooks
- **AI Integration**: Google Gemini API

## Table of Contents
1. [Initial Setup](#initial-setup)
2. [Database Configuration](#database-configuration)
3. [Authentication Setup](#authentication-setup)
4. [Environment Variables](#environment-variables)
5. [Deployment Configuration](#deployment-configuration)
6. [Common Pitfalls & Solutions](#common-pitfalls--solutions)
7. [Admin Console Requirements](#admin-console-requirements)
8. [User Profiles & Rate Limiting](#user-profiles--rate-limiting)
9. [Monitoring & Automation](#monitoring--automation)
10. [Testing Strategy](#testing-strategy)

## Initial Setup

### 1. Project Structure
```
pixcart/
├── src/
│   ├── app/             # Next.js App Router pages
│   ├── components/      # React components
│   ├── lib/            # Utilities and configurations
│   └── middleware.ts   # Auth and routing middleware
├── prisma/
│   ├── schema.prisma   # Database schema
│   └── seed.ts         # Database seeding
├── scripts/            # Deployment and monitoring scripts
├── tests/              # Playwright E2E tests
└── package.json        # Dependencies and scripts
```

### 2. Package Installation
```json
{
  "dependencies": {
    "@prisma/client": "^6.15.0",
    "@supabase/ssr": "^0.7.0",
    "@supabase/supabase-js": "^2.57.0",
    "@google/generative-ai": "^0.24.1",
    "next": "15.5.2",
    "prisma": "^6.15.0"
  }
}
```

## Database Configuration

### Critical Lesson: Database Provider Mismatch
**Problem**: Local development used SQLite while production required PostgreSQL.

**Solution**: Ensure schema.prisma matches production:
```prisma
datasource db {
  provider = "postgresql"  // NOT "sqlite"
  url      = env("DATABASE_URL")
}
```

### Database Migration Steps
1. **Initial Setup**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

2. **Production Build Script**:
   ```json
   "build": "prisma generate && next build"
   ```

3. **Vercel Build Configuration**:
   ```json
   "vercel-build": "prisma generate --schema ./prisma/schema.prisma && next build"
   ```

### Common Database Issues

#### Issue 1: Missing Tables in Production
**Symptom**: "Table 'IpUsage' does not exist"
**Solution**: Run `npx prisma db push` after schema changes

#### Issue 2: Prisma Client Not Generated
**Symptom**: "Cannot find module '.prisma/client'"
**Solution**: Add `prisma generate` to build scripts

#### Issue 3: User Lookup Failures
**Problem**: Supabase auth returns user ID, but database might have email-only records
**Solution**: Implement dual lookup pattern:
```typescript
let user = await prisma.user.findUnique({
  where: { id: authUser.id },
});
if (!user && authUser.email) {
  user = await prisma.user.findUnique({
    where: { email: authUser.email },
  });
}
if (!user) {
  user = await prisma.user.create({
    data: {
      id: authUser.id,
      email: authUser.email || `user_${authUser.id}@pixcart.com`,
      dailyImageLimit: 10,
    }
  });
}
```

## Authentication Setup

### Supabase Configuration
1. **Create Supabase Project**
2. **Configure Authentication Providers**
3. **Set up Database Connection**

### Middleware Configuration
```typescript
// src/middleware.ts
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) { /* handle cookies */ }
      }
    }
  )
  
  const { data: { user } } = await supabase.auth.getUser()
  // Handle authentication logic
}
```

### Protected Routes Pattern
```typescript
// API Route Protection
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // Continue with authenticated logic
}
```

## Environment Variables

### Required Variables
```env
# Database
DATABASE_URL="postgresql://..."

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."

# AI Services
GEMINI_API_KEY="AI..."

# Application
NEXTAUTH_SECRET="random-secret"
NEXTAUTH_URL="https://your-domain.vercel.app"

# Payment (Optional)
STRIPE_SECRET_KEY="sk_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_..."
```

### Vercel Environment Setup
1. **Add Variables in Vercel Dashboard**
2. **Set appropriate environments** (Production, Preview, Development)
3. **Use variable references** in .env:
   ```env
   DATABASE_URL="${DATABASE_URL}"
   ```

### Common Environment Issues

#### Issue: Variables Not Loading
**Solution**: Ensure variables are set for correct environment in Vercel

#### Issue: Build-time vs Runtime Variables
**Solution**: NEXT_PUBLIC_ prefix for client-side variables

## Deployment Configuration

### Vercel Project Setup
1. **Link to Correct Project**:
   ```bash
   vercel link
   # Select correct project (e.g., oil-painting-app)
   ```

2. **Configure Build Settings**:
   - Framework Preset: Next.js
   - Build Command: `prisma generate && next build`
   - Install Command: `npm install`

### Git Hooks for Automated Monitoring

#### Pre-push Hook
```bash
#!/bin/bash
# .git/hooks/pre-push

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate || {
    echo "Failed to generate Prisma client"
    exit 1
}

# Run build
echo "Running build..."
npm run build || {
    echo "Build failed"
    exit 1
}

# Run tests
echo "Running tests..."
npm test || {
    echo "Tests failed"
    exit 1
}
```

#### Post-commit Hook
```bash
#!/bin/bash
# .git/hooks/post-commit

# Log deployment
echo "[$(date '+%Y-%m-%d %H:%M:%S')] COMMIT: $(git rev-parse --short HEAD)" >> .git/hooks/deployment-log.txt
```

### macOS-specific Timeout Issue
**Problem**: `timeout` command not available on macOS
**Solution**: Use conditional command:
```bash
if command -v gtimeout >/dev/null 2>&1; then
    gtimeout 300 npm run build
elif command -v timeout >/dev/null 2>&1; then
    timeout 300 npm run build
else
    npm run build
fi
```

## Common Pitfalls & Solutions

### 1. Double File Upload Issue
**Problem**: Users need to upload images twice
**Solution**: Store image in sessionStorage between pages:
```typescript
// On upload page
sessionStorage.setItem('uploadedImage', imageData);

// On create page
const storedImage = sessionStorage.getItem('uploadedImage');
if (storedImage) {
  setImageData(storedImage);
  sessionStorage.removeItem('uploadedImage');
}
```

### 2. Admin Console Redirect Loop
**Problem**: Admin page redirects to public page
**Root Cause**: Database queries failing due to provider mismatch
**Solution**: Fix database configuration and user lookup logic

### 3. 500 Errors on API Endpoints
**Problem**: API routes returning server errors
**Common Causes**:
- Missing user in database
- Incorrect Prisma client
- Missing environment variables

**Solution**: Implement proper error handling and user creation:
```typescript
try {
  // API logic
} catch (error) {
  console.error('API Error:', error);
  return NextResponse.json(
    { error: 'Internal server error', details: error.message },
    { status: 500 }
  );
}
```

### 4. Route Group Confusion
**Problem**: Misunderstanding Next.js route groups
**Key Point**: Parentheses in folder names (e.g., `(auth)`) are NOT part of URL
```
app/(auth)/login/page.tsx → /login (NOT /auth/login)
app/(landing)/simple/page.tsx → /simple (NOT /landing/simple)
```

### 5. Vercel Project Confusion
**Problem**: Accidentally creating new project instead of using existing
**Solution**: Always verify with `vercel list` and use `vercel link` to correct

## Admin Console Requirements

### Features Required
1. **User Management**
   - View all users
   - Edit user profiles
   - Manage allowlist/waitlist status
   - Set rate limits

2. **API Usage Monitoring**
   - Track API calls by user
   - Monitor costs
   - View usage patterns

3. **System Configuration**
   - Manage global settings
   - Configure rate limits
   - A/B test management

### Implementation
```typescript
// Admin check in API routes
const isAdmin = user?.email === 'admin@example.com' || dbUser?.isAdmin;

if (!isAdmin) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

### Admin Navigation
Add admin link to user menu:
```tsx
{isAdmin && (
  <DropdownMenuItem asChild>
    <Link href="/admin">
      <Shield className="h-4 w-4" />
      Admin Console
    </Link>
  </DropdownMenuItem>
)}
```

## User Profiles & Rate Limiting

### User Types
1. **Anonymous Users**: IP-based rate limiting (3/day)
2. **Beta Users**: Account-based (10/day)
3. **Admin Users**: Unlimited access

### Rate Limiting Implementation

#### IP-Based Limiting
```typescript
const ip = request.headers.get('x-forwarded-for') || 'unknown';
const today = new Date();
today.setHours(0, 0, 0, 0);

const ipUsage = await prisma.ipUsage.upsert({
  where: { ip_date: { ip, date: today } },
  update: { count: { increment: 1 } },
  create: { ip, date: today, count: 1 }
});

if (ipUsage.count > 3) {
  return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
}
```

#### User-Based Limiting
```typescript
const usage = await prisma.apiUsage.count({
  where: {
    userId: user.id,
    createdAt: { gte: startOfDay }
  }
});

if (usage >= user.dailyImageLimit && !user.isAdmin) {
  return NextResponse.json({ error: 'Daily limit reached' }, { status: 429 });
}
```

### Database Schema for Users
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  isAdmin       Boolean   @default(false)
  isAllowlisted Boolean   @default(false)
  isWaitlisted  Boolean   @default(true)
  dailyImageLimit Int     @default(10)
  // ... other fields
}
```

## Monitoring & Automation

### Deployment Monitor Script
```javascript
// scripts/deployment-monitor.js
async function checkDeployment() {
  try {
    const response = await fetch('https://your-app.vercel.app/api/health');
    if (!response.ok) {
      console.error('Health check failed:', response.status);
      process.exit(1);
    }
  } catch (error) {
    console.error('Deployment check failed:', error);
    process.exit(1);
  }
}
```

### Comprehensive Monitor
```javascript
// scripts/comprehensive-monitor.js
async function runComprehensiveCheck() {
  const checks = [
    checkDatabase(),
    checkAuth(),
    checkAPIEndpoints(),
    checkRateLimiting()
  ];
  
  const results = await Promise.all(checks);
  const allPassed = results.every(r => r.success);
  
  if (!allPassed) {
    console.error('Some checks failed:', results);
    process.exit(1);
  }
}
```

## Testing Strategy

### Playwright E2E Tests
```typescript
// tests/production.spec.ts
test('user can generate AI preview', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Get Started');
  
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('test-image.jpg');
  
  await page.click('text=Generate Preview');
  await expect(page.locator('.preview-image')).toBeVisible();
});
```

### Test Configuration
```javascript
// playwright.config.js
export default {
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_URL || 'http://localhost:3000',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
};
```

### Running Tests
```bash
# Local testing
npm run dev & npm run test:e2e

# Production testing
PLAYWRIGHT_TEST_URL=https://your-app.vercel.app npm run test:e2e
```

## Deployment Checklist

### Pre-Deployment
- [ ] All environment variables set in Vercel
- [ ] Database schema matches production needs
- [ ] Prisma client generated for correct provider
- [ ] Build passes locally
- [ ] Tests pass locally

### Deployment
- [ ] Push to main branch
- [ ] Monitor Vercel deployment logs
- [ ] Check deployment URL immediately

### Post-Deployment
- [ ] Run health checks
- [ ] Test critical user flows
- [ ] Verify admin console access
- [ ] Check rate limiting
- [ ] Monitor error logs

## Recovery Procedures

### If Deployment Fails
1. Check Vercel build logs
2. Verify environment variables
3. Ensure Prisma schema is correct
4. Check for TypeScript errors
5. Review recent commits

### If Production Breaks
1. Rollback in Vercel dashboard
2. Identify breaking change
3. Fix locally with tests
4. Deploy fix with monitoring

### Database Issues
1. Check connection string
2. Verify schema migrations
3. Run `prisma db push` if needed
4. Check for data integrity

## Key Lessons Learned

1. **Always match local and production database providers**
2. **Include Prisma generation in build scripts**
3. **Implement dual user lookup (ID and email)**
4. **Use sessionStorage for multi-step flows**
5. **Add comprehensive error logging to API routes**
6. **Test with production URLs before declaring success**
7. **Automate deployment monitoring with Git hooks**
8. **Understand Next.js route groups (parentheses)**
9. **Verify correct Vercel project linking**
10. **Keep environment variables synchronized**

## Support & Troubleshooting

### Common Error Messages
- "Failed to generate preview" → Check Gemini API key and rate limits
- "Table does not exist" → Run prisma db push
- "Cannot find module '.prisma/client'" → Run prisma generate
- "Unauthorized" → Check Supabase auth configuration
- "Rate limit exceeded" → Check IP/user usage limits

### Debug Commands
```bash
# Check database connection
npx prisma db pull

# Verify schema
npx prisma validate

# Test build locally
npm run build

# Check deployed version
curl https://your-app.vercel.app/api/health

# View Vercel logs
vercel logs
```

## Conclusion

This deployment setup provides a robust, scalable architecture with:
- Secure authentication via Supabase
- Reliable database with PostgreSQL
- Automated deployment via Vercel
- Comprehensive monitoring and testing
- Clear separation of concerns

The key to success is maintaining consistency between local and production environments, implementing proper error handling, and automating deployment verification.