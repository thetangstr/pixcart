# Deployment Guide - Oil Painting App

## Overview
This guide covers deploying the oil painting app to Firebase Hosting via GitHub Actions CI/CD pipeline.

## Prerequisites
- GitHub account
- Firebase account
- Google Cloud Console access (for OAuth)
- Facebook Developer account (for OAuth)
- Apple Developer account (for OAuth)

## Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com/new)
2. Create a new repository named `oil-painting-app`
3. Make it public or private as preferred
4. Don't initialize with README (we already have one)

## Step 2: Push Code to GitHub

```bash
# Add remote origin
git remote add origin https://github.com/YOUR_USERNAME/oil-painting-app.git

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit - Oil Painting App with authentication"

# Push to main branch
git branch -M main
git push -u origin main

# Create beta branch for staging
git checkout -b beta
git push -u origin beta
```

## Step 3: Set Up Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (e.g., `oil-painting-app`)
3. Enable Firebase Hosting
4. Install Firebase CLI locally:
   ```bash
   npm install -g firebase-tools
   ```
5. Login to Firebase:
   ```bash
   firebase login
   ```
6. Initialize Firebase in project:
   ```bash
   firebase init hosting
   ```
   - Choose existing project
   - Public directory: `out`
   - Single-page app: Yes
   - GitHub Actions: Yes (optional)

## Step 4: Get Firebase Service Account Key

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Convert to base64:
   ```bash
   base64 -i service-account-key.json | pbcopy
   ```
5. Save this for GitHub Secrets

## Step 5: Configure GitHub Secrets

Go to GitHub repo → Settings → Secrets and variables → Actions

Add these secrets:

### Firebase Secrets
- `FIREBASE_PROJECT_ID`: Your Firebase project ID
- `FIREBASE_SERVICE_ACCOUNT`: Base64 encoded service account JSON

### NextAuth Secrets
- `NEXTAUTH_URL`: https://your-firebase-app.web.app
- `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`

### OAuth Secrets (After Setup)
- `GOOGLE_CLIENT_ID`: From Google Cloud Console
- `GOOGLE_CLIENT_SECRET`: From Google Cloud Console
- `FACEBOOK_CLIENT_ID`: From Facebook Developers
- `FACEBOOK_CLIENT_SECRET`: From Facebook Developers
- `APPLE_ID`: From Apple Developer
- `APPLE_SECRET`: From Apple Developer
- `APPLE_TEAM_ID`: From Apple Developer
- `APPLE_KEY_ID`: From Apple Developer

### Database
- `DATABASE_URL`: Your production database URL

### A1111 API
- `A1111_BASE_URL`: Your Stable Diffusion API endpoint (if deploying)

## Step 6: Deploy Beta Version

1. Push to beta branch:
   ```bash
   git checkout beta
   git push origin beta
   ```

2. GitHub Actions will automatically:
   - Run tests
   - Build the app
   - Deploy to Firebase Hosting beta channel

3. Access beta at: `https://your-project--beta-HASH.web.app`

## Step 7: Deploy Production

1. Merge beta to main:
   ```bash
   git checkout main
   git merge beta
   git push origin main
   ```

2. GitHub Actions will deploy to production
3. Access at: `https://your-firebase-app.web.app`

## Step 8: Configure OAuth with Production URLs

### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Add authorized redirect URIs:
   - `https://your-firebase-app.web.app/api/auth/callback/google`
   - `https://your-project--beta-*.web.app/api/auth/callback/google`

### Facebook OAuth
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Add Valid OAuth Redirect URIs:
   - `https://your-firebase-app.web.app/api/auth/callback/facebook`
   - `https://your-project--beta-*.web.app/api/auth/callback/facebook`

### Apple Sign In
1. Go to [Apple Developer](https://developer.apple.com/)
2. Configure Return URLs:
   - `https://your-firebase-app.web.app/api/auth/callback/apple`
   - `https://your-project--beta-*.web.app/api/auth/callback/apple`

## Step 9: Custom Domain (Optional)

1. In Firebase Console → Hosting → Add custom domain
2. Follow DNS verification steps
3. Update OAuth redirect URLs with custom domain

## Environment URLs

After deployment, you'll have:
- **Production**: `https://your-firebase-app.web.app`
- **Beta**: `https://your-project--beta-HASH.web.app`
- **PR Previews**: `https://your-project--pr-NUMBER-HASH.web.app`

## CI/CD Pipeline Features

The GitHub Actions workflow provides:
- ✅ Automatic deployment on push to main/beta
- ✅ PR preview deployments
- ✅ Test running before deployment
- ✅ Type checking and linting
- ✅ Environment variable injection
- ✅ Prisma client generation

## Monitoring

1. **GitHub Actions**: Check build status at repo → Actions tab
2. **Firebase Console**: Monitor hosting usage and analytics
3. **Error Tracking**: Consider adding Sentry or similar

## Rollback

If needed, rollback in Firebase Console:
1. Go to Hosting → Release history
2. Click three dots on previous release
3. Select "Rollback"

## Local Testing of Production Build

```bash
# Build production version
npm run build

# Test locally
npm run start

# Or use Firebase emulator
firebase serve --only hosting
```

## Troubleshooting

### Build Failures
- Check GitHub Actions logs
- Ensure all environment variables are set
- Verify Prisma schema is correct

### OAuth Not Working
- Check redirect URLs match exactly
- Ensure secrets are correctly set in GitHub
- Verify NEXTAUTH_URL matches deployment URL

### Static Export Issues
- API routes won't work with static export
- Consider using Vercel or similar for full Next.js features
- Or implement serverless functions separately

## Next Steps

1. Set up monitoring and analytics
2. Configure error tracking
3. Set up database backups
4. Implement CDN for images
5. Add performance monitoring

## Support

For issues:
1. Check GitHub Actions logs
2. Review Firebase Console logs
3. Test locally with production build
4. Check browser console for client-side errors