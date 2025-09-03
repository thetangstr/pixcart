# Claude Code - Agent Instructions

## Project Overview
PixCart is an AI-powered pet portrait platform that transforms pet photos into oil painting masterpieces using Google Gemini AI.

## Important Configuration

### Environment Variables (Required in Vercel)
```
DATABASE_URL=postgresql://username:password@db.mqkqyigujbamrvebrhsd.supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://mqkqyigujbamrvebrhsd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
GEMINI_API_KEY=[your-gemini-api-key]
```

### Deployment
- Deployed on Vercel at: https://oil-painting-app.vercel.app
- GitHub repository: https://github.com/thetangstr/pixcart
- Direct Vercel integration (no GitHub Actions needed)

## Sprint-Based Development Workflow

### 1. Check Active Sprint Feedback
When starting work, ALWAYS check for scheduled feedback items:

```bash
# Check for active sprint items
npx tsx scripts/check-sprint-items.ts
```

### 2. Feedback Processing Priority
1. **CRITICAL** - Production breaking issues (fix immediately)
2. **HIGH** - Major bugs affecting user experience
3. **MEDIUM** - Feature requests and improvements
4. **LOW** - Nice-to-have enhancements

### 3. Development Process
For each feedback item:
1. Read the feedback details (expected vs actual behavior)
2. Reproduce the issue locally
3. Implement the fix/feature
4. Test thoroughly
5. Update feedback status to RESOLVED
6. Deploy to preview environment

### 4. Testing Commands
```bash
# Run development server
npm run dev

# Run linting (currently configured to allow warnings)
npm run lint

# Build for production
npm run build

# Database migrations
npx prisma migrate dev
npx prisma db push
```

## Key Features & Architecture

### Authentication
- Supabase Auth with Google OAuth
- User roles: regular users, beta testers, admins
- Admin email: thetangstr@gmail.com

### Core Features
1. **Image Upload & Processing**
   - Upload pet photos
   - Select from 3 art styles (Classic, Van Gogh, Monet)
   - Generate AI preview using Gemini 2.0 Flash Experimental

2. **Feedback System**
   - Visible to all logged-in users (orange button, bottom-right)
   - Captures: type, message, expected/actual behavior
   - Admin panel at `/admin/feedback`
   - Sprint management for organizing work

3. **Order Management**
   - Track orders through various stages
   - Payment integration (Stripe - to be implemented)
   - Order history and status tracking

### Tech Stack
- **Frontend**: Next.js 15.5, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (Supabase)
- **AI**: Google Gemini API (gemini-2.0-flash-exp model)
- **Auth**: Supabase Authentication
- **Deployment**: Vercel

## Common Issues & Solutions

### Gemini API Not Working
- Check GEMINI_API_KEY is set in Vercel environment variables
- Ensure using correct model: "gemini-2.0-flash-exp"
- Check console logs for API errors

### Database Connection Issues
- Verify DATABASE_URL format and credentials
- URL-encode special characters in password (#→%23, @→%40)
- Check Supabase dashboard for connection limits

### Build/Deployment Failures
- ESLint and TypeScript errors are currently ignored in production
- Check Vercel logs for specific error messages
- Ensure all environment variables are set

## Admin Functions

### Make User Admin
```typescript
// Update user in database
await prisma.user.update({
  where: { email: 'user@example.com' },
  data: { isAdmin: true }
});
```

### Access Admin Panel
- Navigate to `/admin` when logged in as admin
- Manage users, feedback, and sprints

## Development Guidelines

1. **Code Style**
   - Follow existing patterns in the codebase
   - Use TypeScript for type safety
   - Keep components modular and reusable

2. **Database Changes**
   - Update Prisma schema
   - Run `npx prisma migrate dev` locally
   - Run `npx prisma generate` before building

3. **API Routes**
   - All admin routes require authentication check
   - Use proper HTTP status codes
   - Include error handling and logging

4. **UI/UX**
   - Maintain oil painting theme (amber/orange/yellow colors)
   - Ensure mobile responsiveness
   - Add loading states for async operations

## Feedback Implementation Checklist

When implementing feedback:
- [ ] Understand the issue completely
- [ ] Check if it affects other parts of the system
- [ ] Write clean, maintainable code
- [ ] Add proper error handling
- [ ] Test on multiple screen sizes
- [ ] Update relevant documentation
- [ ] Commit with clear message
- [ ] Deploy and verify in production

## Contact & Support
- Admin: thetangstr@gmail.com
- Repository: https://github.com/thetangstr/pixcart
- Live Site: https://oil-painting-app.vercel.app