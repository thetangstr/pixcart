# Deployment Troubleshooting

## Current Issue
Multiple Vercel deployment attempts are failing. Here's what to check:

## 1. Verify Vercel Secrets Format

In GitHub repository secrets, ensure these are EXACTLY formatted:

### VERCEL_TOKEN
- Should start with `vercel_`
- Example: `vercel_ABC123...`
- Get from: https://vercel.com/account/tokens

### VERCEL_ORG_ID  
- For teams: starts with `team_`
- For personal: just the ID without prefix
- Example: `team_ABC123...` OR `ABC123...`
- Get from: https://vercel.com/account (look for "Your ID")

### VERCEL_PROJECT_ID
- Should start with `prj_`
- You have: `prj_kPcQPH1Vq4a6jDAqyNRXrcLBSQD4`
- Get from: Vercel project → Settings → General

## 2. Alternative: Use Vercel's Git Integration

Instead of GitHub Actions, you can use Vercel's built-in Git integration:

1. Go to https://vercel.com/dashboard
2. Click "Import Project"
3. Select your GitHub repo: `thetangstr/pixcart`
4. Set root directory: `oil-painting-app`
5. Deploy

This bypasses GitHub Actions entirely and uses Vercel's native deployment.

## 3. Test Locally

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Test deployment
cd oil-painting-app
vercel --prod
```

## 4. Check Project Settings

In Vercel dashboard:
- Framework: Next.js
- Root Directory: oil-painting-app  
- Build Command: npm run build
- Output Directory: .next

## 5. Environment Variables in Vercel

Add these in Vercel dashboard → Project → Settings → Environment Variables:

```
GEMINI_API_KEY
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## Quick Fix Options

### Option A: Use Vercel Git Integration (Recommended)
- Disable GitHub Actions workflows
- Use Vercel's auto-deploy from Git

### Option B: Manual Deploy
```bash
cd oil-painting-app
vercel --prod
```

### Option C: Debug Secrets
1. Double-check all secret values in GitHub
2. Regenerate tokens if needed
3. Test with a simple workflow first