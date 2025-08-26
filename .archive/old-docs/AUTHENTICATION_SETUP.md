# Authentication Setup Guide

## Overview
The oil painting app now has a complete authentication system with support for:
- Email/Password login
- Google OAuth
- Facebook OAuth
- Apple Sign In

## Features Implemented
✅ User registration and login pages
✅ NextAuth.js integration
✅ Session management
✅ User profile in navigation
✅ Protected routes
✅ Database schema with Prisma

## OAuth Provider Setup

### 1. Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)
6. Copy Client ID and Client Secret to `.env.local`

### 2. Facebook OAuth Setup
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add Facebook Login product
4. Settings → Basic → Copy App ID and App Secret
5. Add Valid OAuth Redirect URIs:
   - `http://localhost:3000/api/auth/callback/facebook` (development)
   - `https://yourdomain.com/api/auth/callback/facebook` (production)
6. Update `.env.local` with credentials

### 3. Apple Sign In Setup
1. Go to [Apple Developer](https://developer.apple.com/)
2. Create an App ID with Sign In with Apple capability
3. Create a Service ID
4. Configure Return URLs:
   - `http://localhost:3000/api/auth/callback/apple` (development)
   - `https://yourdomain.com/api/auth/callback/apple` (production)
5. Create a Private Key for Sign In with Apple
6. Update `.env.local` with all Apple credentials

## Database Setup

### For Development (SQLite)
1. Update DATABASE_URL in `.env.local`:
   ```
   DATABASE_URL="file:./dev.db"
   ```
2. Update schema.prisma datasource:
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
3. Run migrations:
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

### For Production (PostgreSQL)
1. Set up PostgreSQL database
2. Update DATABASE_URL in `.env.local`:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/oilpainting?schema=public"
   ```
3. Run migrations:
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

## Environment Variables
Update your `.env.local` file with actual values:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-a-secret-key-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Facebook OAuth
FACEBOOK_CLIENT_ID=your-facebook-app-id
FACEBOOK_CLIENT_SECRET=your-facebook-app-secret

# Apple OAuth
APPLE_ID=your-apple-service-id
APPLE_SECRET=your-apple-private-key
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id

# Database
DATABASE_URL="file:./dev.db"  # For SQLite development
```

## Generate NextAuth Secret
Run this command to generate a secure secret:
```bash
openssl rand -base64 32
```

## Testing Authentication
1. Navigate to http://localhost:3000
2. Click "Sign In" in the navigation
3. Test each authentication method:
   - Create account with email/password
   - Sign in with Google
   - Sign in with Facebook
   - Sign in with Apple
4. Check user menu in navigation after login
5. Test sign out functionality

## User Data
After authentication, user data is available in:
- Session: `useSession()` hook in components
- Server: `getServerSession(authOptions)` in API routes
- User profile stored in database with paintings history

## Protected Routes
To protect a page, check session:
```tsx
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'

export default function ProtectedPage() {
  const { data: session, status } = useSession()
  
  if (status === 'loading') return <Loading />
  if (!session) redirect('/auth/signin')
  
  return <YourContent />
}
```

## Next Steps
1. Set up OAuth providers with real credentials
2. Configure production database
3. Add email verification (optional)
4. Implement password reset flow (optional)
5. Add social sharing features