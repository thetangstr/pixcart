# GitHub Secrets Setup Guide

## Required Secrets for GitHub Actions Deployment

### 🔐 Repository Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

### For Vercel Deployment

| Secret Name | Description | How to Get It |
|-------------|-------------|---------------|
| `VERCEL_TOKEN` | Vercel authentication token | [Vercel Account Settings](https://vercel.com/account/tokens) → Create Token |
| `VERCEL_ORG_ID` | Your Vercel organization ID | Run `vercel link` in your project, or check `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | Your Vercel project ID | Run `vercel link` in your project, or check `.vercel/project.json` |

### For Firebase Deployment

| Secret Name | Description | How to Get It |
|-------------|-------------|---------------|
| `FIREBASE_TOKEN` | Firebase CLI token | Run `firebase login:ci` |
| `FIREBASE_PROJECT_ID` | Your Firebase project ID | From Firebase Console |
| `FIREBASE_SERVICE_ACCOUNT` | Service account JSON | Firebase Console → Project Settings → Service Accounts |

### For Environment Variables

| Secret Name | Example Value | Description |
|-------------|---------------|-------------|
| `GA_MEASUREMENT_ID` | `G-XXXXXXXXXX` | Google Analytics 4 Measurement ID |
| `SITE_URL` | `https://petcanvas.vercel.app` | Your production domain URL |
| `GEMINI_API_KEY` | `AIza...` | Google Gemini 2.5 Flash API key (Primary) |
| `A1111_BASE_URL` | `https://your-tunnel.ngrok.io` | Stable Diffusion WebUI tunnel URL (Legacy) |
| `COMFYUI_BASE_URL` | `https://comfyui-tunnel.ngrok.io` | ComfyUI tunnel URL (Legacy) |

### OAuth Secrets (for production)

| Secret Name | Description | Required |
|-------------|-------------|----------|
| `NEXTAUTH_SECRET` | NextAuth secret key | Yes (generated automatically in workflow) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Yes |
| `FACEBOOK_CLIENT_ID` | Facebook OAuth client ID | Optional |
| `FACEBOOK_CLIENT_SECRET` | Facebook OAuth client secret | Optional |

### Optional Secrets

| Secret Name | Description | Required |
|-------------|-------------|----------|
| `SLACK_WEBHOOK_URL` | Slack notification webhook | No |

## 🚀 Step-by-Step Setup

### 1. Get Vercel Credentials

```bash
# Install Vercel CLI if you haven't
npm install -g vercel

# Link your project (creates .vercel/project.json)
vercel link

# Get your organization and project IDs
cat .vercel/project.json
```

The output will look like:
```json
{
  "orgId": "team_XXXXXXXXXX",
  "projectId": "prj_XXXXXXXXXX"
}
```

### 2. Create Vercel Token

1. Go to [Vercel Account Settings](https://vercel.com/account/tokens)
2. Click "Create Token"
3. Name it "GitHub Actions - PetCanvas"
4. Copy the token (you won't see it again)

### 3. Set up GitHub Secrets

1. Go to your repository on GitHub
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret" for each required secret

### 4. Add Environment Variables

Set these in GitHub Secrets:

```
GA_MEASUREMENT_ID = G-XXXXXXXXXX (your Google Analytics ID)
SITE_URL = https://petcanvas.vercel.app (your production URL)
A1111_BASE_URL = http://localhost:7860 (or your tunnel URL)
COMFYUI_BASE_URL = http://localhost:8188 (or your tunnel URL)
```

## 🔧 Local Development Setup

For your `.env.local` file:

```env
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_SITE_URL=http://localhost:5174
A1111_BASE_URL=http://localhost:7860
COMFYUI_BASE_URL=http://localhost:8188
```

## 🌐 Production URLs for AI Models

### Option 1: Ngrok Tunnels (Recommended for Testing)

```bash
# Terminal 1: Start A1111
cd /path/to/stable-diffusion-webui
./webui.sh --api

# Terminal 2: Start ComfyUI  
cd /path/to/ComfyUI
python main.py

# Terminal 3: Create tunnels
ngrok http 7860 --subdomain=petcanvas-a1111
ngrok http 8188 --subdomain=petcanvas-comfyui
```

Set secrets:
- `A1111_BASE_URL` = `https://petcanvas-a1111.ngrok.io`
- `COMFYUI_BASE_URL` = `https://petcanvas-comfyui.ngrok.io`

### Option 2: Cloud VM (Production)

Deploy A1111 and ComfyUI on a cloud server (AWS/GCP/Azure) and use the public IPs.

### Option 3: Cloud Fallback

Set `USE_CLOUD_FALLBACK=true` in the workflow to use Replicate API as fallback.

## ✅ Verification Checklist

Before deploying, verify:

- [ ] All required secrets are set in GitHub
- [ ] Vercel project is linked and tokens are valid
- [ ] Local models are accessible via tunnels/cloud
- [ ] Google Analytics ID is correct
- [ ] Production URL is set correctly
- [ ] Tests pass locally with `npm test`

## 🚨 Security Notes

1. **Never commit secrets** to your repository
2. **Rotate tokens** regularly (especially after team changes)
3. **Use tunnel authentication** for model endpoints in production
4. **Monitor usage** of your model endpoints
5. **Set up rate limiting** on your AI model endpoints

## 🔄 Updating Secrets

To update a secret:
1. Go to repository Settings → Secrets and variables → Actions
2. Click on the secret name
3. Click "Update" and enter the new value
4. The next workflow run will use the updated secret

## 🆘 Troubleshooting

### Common Issues:

1. **"Invalid token" errors**: Check if VERCEL_TOKEN is correct and not expired
2. **"Project not found"**: Verify VERCEL_ORG_ID and VERCEL_PROJECT_ID match your `.vercel/project.json`
3. **Build failures**: Check that all environment variables are properly set
4. **AI model errors**: Verify your tunnel URLs are accessible and models are running

### Debug Steps:

```bash
# Test Vercel deployment locally
vercel --prod --token=YOUR_TOKEN

# Test your tunnels
curl https://your-a1111-tunnel.ngrok.io/sdapi/v1/sd-models
curl https://your-comfyui-tunnel.ngrok.io/api/prompt

# Verify environment in GitHub Actions
echo ${{ secrets.VERCEL_TOKEN }} # (will be masked)
```