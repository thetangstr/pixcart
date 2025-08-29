# Vercel Setup Guide

## Step 1: Create Vercel Account & Import Project

1. Go to https://vercel.com/signup
2. Sign up with your GitHub account
3. Click "Import Project"
4. Select your repository: `thetangstr/pixcart`
5. Configure project:
   - Framework Preset: **Next.js**
   - Root Directory: **oil-painting-app**
   - Build Command: `npm run build`
   - Output Directory: `.next`

## Step 2: Get Vercel Credentials

### A. Get Vercel Token
1. Go to https://vercel.com/account/tokens
2. Click "Create Token"
3. Name it: `GitHub Actions`
4. Scope: Full Access
5. Click "Create" and copy the token

### B. Get Organization ID
1. Go to https://vercel.com/account
2. Under "General" tab, find your "Team ID" or "Personal Account ID"
3. Copy this ID (it looks like: `team_xxxxxxxxxxxxx`)

### C. Get Project ID
1. Go to your project on Vercel
2. Click "Settings" tab
3. Under "General", find "Project ID"
4. Copy this ID (it looks like: `prj_xxxxxxxxxxxxx`)

## Step 3: Add Secrets to GitHub

Go to: https://github.com/thetangstr/pixcart/settings/secrets/actions

Add these repository secrets:

| Secret Name | Value |
|------------|-------|
| `VERCEL_TOKEN` | Your token from Step 2A |
| `VERCEL_ORG_ID` | Your org/team ID from Step 2B |
| `VERCEL_PROJECT_ID` | Your project ID from Step 2C |

## Step 4: Add Environment Variables in Vercel

Go to your Vercel project → Settings → Environment Variables

Add these variables for Production:

```
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_GA_MEASUREMENT_ID=your_ga_id
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
```

## Step 5: Link Local Project (Optional)

If you want to deploy from command line:

```bash
cd oil-painting-app
npx vercel link
# Follow prompts to link to your project
```

## Step 6: Test Deployment

Push to main branch or run:

```bash
npx vercel --prod
```

## Troubleshooting

### If deployment fails with "Project not found":
1. Make sure you imported the project in Vercel first
2. Verify the VERCEL_PROJECT_ID is correct

### If "Invalid token":
1. Regenerate the token in Vercel
2. Update VERCEL_TOKEN in GitHub secrets

### If "Command failed":
1. Check build logs in Vercel dashboard
2. Ensure all environment variables are set

## Quick Check Commands

Test your setup locally:
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# List projects
vercel list

# Get project info
vercel project ls
```

## Support

- Vercel Docs: https://vercel.com/docs
- Next.js on Vercel: https://vercel.com/docs/frameworks/nextjs