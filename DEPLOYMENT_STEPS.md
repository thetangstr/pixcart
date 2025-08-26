# 🚀 PetCanvas Deployment Guide

## Quick Deploy to Production

### Step 1: Set up Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Link your project
vercel link

# Get your IDs from .vercel/project.json
cat .vercel/project.json
```

### Step 2: Set up Firebase (Optional)
```bash
# Install Firebase CLI  
npm install -g firebase-tools

# Login and get token
firebase login:ci

# Initialize Firebase project
firebase init hosting
```

### Step 3: Configure GitHub Secrets

Go to GitHub repo → Settings → Secrets and variables → Actions

**Required Secrets:**
```
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=team_xxxxxxxxxx  
VERCEL_PROJECT_ID=prj_xxxxxxxxxx
SITE_URL=https://petcanvas.vercel.app
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_SECRET=your_nextauth_secret_32_chars
GA_MEASUREMENT_ID=G-XXXXXXXXXX
A1111_BASE_URL=http://localhost:7860
COMFYUI_BASE_URL=http://localhost:8188
```

**Firebase Secrets (if using Firebase):**
```
FIREBASE_TOKEN=your_firebase_token
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
```

### Step 4: Deploy

```bash
# Commit your changes
git add .
git commit -m "feat: add GitHub Actions CI/CD pipeline

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to trigger deployment
git push origin main
```

## What Happens During Deployment

1. **Lint & Type Check** - Code quality validation
2. **E2E Tests** - Playwright tests (non-blocking)
3. **Build** - Creates production build
4. **Deploy to Vercel** - Primary production deployment
5. **Deploy to Firebase** - Secondary/mirror deployment
6. **Lighthouse CI** - Performance testing
7. **Summary** - Deployment status report

## Your Public URLs

After successful deployment:

- **Primary**: `https://petcanvas.vercel.app`  
- **Mirror**: `https://your-project-id.web.app`

## OAuth Setup for Production

Update your Google Cloud Console OAuth app:

1. Go to Google Cloud Console → APIs & Services → Credentials
2. Edit your OAuth 2.0 Client ID  
3. Add to **Authorized redirect URIs**:
   - `https://petcanvas.vercel.app/api/auth/callback/google`
   - `https://your-project-id.web.app/api/auth/callback/google`

## Monitoring & Debugging

### GitHub Actions
- Check workflow runs: Repository → Actions tab
- View logs for failed deployments
- Download Playwright test reports

### Production Issues
```bash
# Check Vercel logs
vercel logs https://petcanvas.vercel.app

# Check Firebase logs  
firebase functions:log --project your-project-id
```

## Environment Variables in Production

The deployment automatically sets:
- `NEXTAUTH_URL` to your production domain
- `NODE_ENV=production`
- All secrets as environment variables
- `USE_CLOUD_FALLBACK=true` for AI model fallback

## Security Checklist

- ✅ All secrets stored in GitHub Secrets (not code)
- ✅ OAuth redirect URIs restricted to your domains
- ✅ Environment variables encrypted in transit
- ✅ No sensitive data in build logs
- ✅ HTTPS enforced on all domains

## Rollback Strategy

If deployment fails:
1. Check GitHub Actions logs for errors
2. Fix issues in a new commit
3. Push to main branch to trigger new deployment
4. Previous Vercel deployment remains live until new one succeeds

## Next Steps

1. **Monitor**: Set up alerts for uptime/performance
2. **Scale**: Configure auto-scaling for traffic spikes  
3. **Optimize**: Review Lighthouse reports for improvements
4. **Analytics**: Monitor user engagement via Google Analytics
5. **Feedback**: Review user feedback from floating feedback button

---

🎨 **PetCanvas is now live and ready for users!**