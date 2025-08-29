# GitHub Actions Setup for Vercel Deployment

## Required GitHub Secrets

Add these secrets to your GitHub repository:
(Go to Settings → Secrets and variables → Actions → New repository secret)

### 1. VERCEL_TOKEN
Generate a token at: https://vercel.com/account/tokens
- Click "Create Token"
- Name it: "GitHub Actions"
- Copy the token and add it as `VERCEL_TOKEN` secret

### 2. VERCEL_ORG_ID
```
team_fQ2HzGl0RS5yvezvCFP7Vjtm
```

### 3. VERCEL_PROJECT_ID
```
prj_kPcQPH1Vq4a6jDAqyNRXrcLBSQD4
```

## How It Works

### Production Deployment
- **Trigger**: Push to `main` branch
- **URL**: https://oil-painting-app.vercel.app
- **Workflow**: `.github/workflows/deploy-production.yml`

### Beta/Preview Deployment
- **Trigger**: 
  - Pull requests
  - Push to `beta` or `develop` branches
  - Push to any `feature/*` branch
- **URL**: Unique preview URL for each deployment
- **Workflow**: `.github/workflows/deploy-preview.yml`

## Manual Deployment

You can also trigger deployments manually:
1. Go to Actions tab in GitHub
2. Select the workflow (Production or Preview)
3. Click "Run workflow"

## Benefits

✅ **Automated deployments** on every push
✅ **Preview URLs** for pull requests
✅ **Build logs** visible in GitHub Actions
✅ **No local deployment needed**
✅ **Automatic rollback** on failed builds
✅ **Environment separation** (production vs beta)

## Testing

After adding the secrets, test by:
1. Make a small change
2. Commit and push to a feature branch
3. Check the Actions tab to see the deployment

## Troubleshooting

If deployment fails:
1. Check GitHub Actions logs
2. Verify all secrets are set correctly
3. Ensure Vercel project exists
4. Check that environment variables are set in Vercel dashboard