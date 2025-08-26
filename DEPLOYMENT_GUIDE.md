# 🚀 PetCanvas Deployment Guide

Complete guide to deploy PetCanvas Oil Painting App using GitHub Actions and Vercel.

## 📋 Quick Start Checklist

- [ ] GitHub repository set up
- [ ] Vercel account created  
- [ ] AI models running locally
- [ ] GitHub secrets configured
- [ ] Tunnels set up for AI models
- [ ] Deploy via GitHub Actions

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   GitHub Repo   │───▶│  GitHub Actions  │───▶│     Vercel      │
│                 │    │                  │    │   (Frontend)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        │
                       ┌──────────────────┐             │
                       │   Build & Test   │             │
                       └──────────────────┘             │
                                                         ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Local AI Models│◀───│   Ngrok Tunnels  │◀───│  Production App │
│ • Stable Diff   │    │                  │    │                 │
│ • ComfyUI       │    └──────────────────┘    └─────────────────┘
└─────────────────┘
```

## 🚀 Deployment Methods

### Method 1: GitHub Actions (Recommended)

Fully automated deployment triggered by git pushes.

#### Step 1: Set up GitHub Secrets

See [GITHUB_SECRETS_SETUP.md](./GITHUB_SECRETS_SETUP.md) for detailed instructions.

Required secrets:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID` 
- `VERCEL_PROJECT_ID`
- `GA_MEASUREMENT_ID`
- `SITE_URL`
- `A1111_BASE_URL`
- `COMFYUI_BASE_URL`

#### Step 2: Push to Main Branch

```bash
# Commit your changes
git add .
git commit -m "feat: ready for deployment"
git push origin main
```

The GitHub Action will automatically:
1. ✅ Run linting and type checking
2. 🧪 Execute E2E tests
3. 🏗️ Build the Next.js application
4. 🚀 Deploy to Vercel
5. 🔍 Run Lighthouse performance checks
6. 📊 Generate deployment summary

#### Step 3: Monitor Deployment

- Check the Actions tab in your GitHub repository
- View real-time logs and deployment progress
- Get the live URL from the deployment summary

### Method 2: Manual Deployment Script

For quick local deployments or testing.

#### Prerequisites

```bash
# Install Vercel CLI
npm install -g vercel

# Link your project
vercel link
```

#### Deploy to Preview

```bash
./scripts/deploy-vercel.sh preview
```

#### Deploy to Production

```bash
./scripts/deploy-vercel.sh production
```

## 🌐 AI Model Setup for Production

### Option 1: Ngrok Tunnels (Quick Setup)

#### Step 1: Start AI Services

```bash
# Terminal 1: Start Stable Diffusion WebUI
cd /path/to/stable-diffusion-webui
./webui.sh --api --listen

# Terminal 2: Start ComfyUI
cd /path/to/ComfyUI  
python main.py --listen 0.0.0.0
```

#### Step 2: Set up Tunnels

```bash
# Run the tunnel setup script
./scripts/setup-tunnels.sh
```

This script will:
- ✅ Check if AI services are running
- 🌐 Create ngrok tunnels with unique subdomains
- 🧪 Test tunnel connectivity  
- 📝 Generate `.env.production` with tunnel URLs
- 💾 Save tunnel info to `tunnel-info.json`

#### Step 3: Update GitHub Secrets

Copy the tunnel URLs from the script output and update your GitHub secrets:

```
A1111_BASE_URL = https://petcanvas-a1111-1226.ngrok.io
COMFYUI_BASE_URL = https://petcanvas-comfyui-1226.ngrok.io
```

### Option 2: Cloud Deployment (Production)

Deploy AI models on cloud infrastructure:

#### AWS EC2 Setup

```bash
# Launch EC2 instance (g4dn.xlarge recommended)
# Install dependencies
sudo apt update
sudo apt install -y python3-pip git

# Clone and setup Stable Diffusion WebUI
git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git
cd stable-diffusion-webui
./webui.sh --api --listen --port 7860

# Clone and setup ComfyUI  
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI
python main.py --listen 0.0.0.0 --port 8188
```

Set GitHub secrets:
```
A1111_BASE_URL = http://your-ec2-ip:7860
COMFYUI_BASE_URL = http://your-ec2-ip:8188
```

#### Security Configuration

```bash
# Configure security groups to allow:
# - Port 7860 (A1111) from your Vercel IPs
# - Port 8188 (ComfyUI) from your Vercel IPs
# - Port 22 (SSH) from your IP only

# Optional: Add API key authentication
# Set up nginx reverse proxy with auth
```

### Option 3: Replicate API Fallback

For testing without local models:

```bash
# Set in GitHub secrets
A1111_BASE_URL = https://api.replicate.com/v1/predictions
COMFYUI_BASE_URL = https://api.replicate.com/v1/predictions
USE_CLOUD_FALLBACK = true
REPLICATE_API_TOKEN = your_replicate_token
```

## 📊 Monitoring & Analytics

### GitHub Actions Monitoring

- **Build Status**: Check Actions tab for real-time status
- **Test Results**: Download Playwright reports from artifacts
- **Performance**: View Lighthouse scores in job summaries
- **Deployment URLs**: Get live URLs from deployment outputs

### Production Monitoring

```bash
# Check deployment status
curl https://petcanvas.vercel.app/api/health

# Monitor AI model endpoints
curl https://your-a1111-tunnel.ngrok.io/sdapi/v1/sd-models
curl https://your-comfyui-tunnel.ngrok.io/api/prompt
```

### Analytics Setup

1. **Google Analytics**: Set `GA_MEASUREMENT_ID` in GitHub secrets
2. **Error Tracking**: Sentry integration (optional)
3. **Performance**: Vercel Analytics (built-in)

## 🔧 Advanced Configuration

### Custom Domains

```bash
# Add custom domain in Vercel dashboard
# Update GitHub secret:
SITE_URL = https://petcanvas.com
```

### Environment-Specific Deployments

```bash
# Deploy to staging
git push origin staging

# Manual staging deploy
./scripts/deploy-vercel.sh staging
```

### Database Integration

```bash
# For future database needs
DATABASE_URL = your_database_connection_string
REDIS_URL = your_redis_connection_string
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Deployment Fails

```bash
# Check build locally first
npm run build

# Verify environment variables
cat .env.production

# Test Vercel deployment locally  
vercel --prod --yes
```

#### 2. AI Models Not Accessible

```bash
# Test local models
curl http://localhost:7860/sdapi/v1/sd-models
curl http://localhost:8188/api/prompt

# Test tunnels
curl https://your-tunnel.ngrok.io/sdapi/v1/sd-models

# Check tunnel logs
cat /tmp/ngrok-a1111.log
cat /tmp/ngrok-comfyui.log
```

#### 3. Tests Failing

```bash
# Run tests locally
npm test

# Run specific test suite
npx playwright test tests/e2e/homepage.spec.ts

# Debug mode
npx playwright test --debug
```

#### 4. GitHub Actions Issues

- ✅ Verify all required secrets are set
- 🔍 Check secret names match exactly (case-sensitive)
- 🔄 Re-run failed jobs
- 📋 Check Actions logs for specific error messages

### Debug Commands

```bash
# Local development
npm run dev

# Production build test
npm run build && npm start

# Type checking
npm run type-check

# Linting
npm run lint

# Full test suite
npm test

# Test with headed browser
npm run test:headed
```

## 📋 Deployment Checklist

### Pre-Deployment

- [ ] All tests pass locally
- [ ] Build completes without errors
- [ ] AI models are accessible
- [ ] Environment variables are set
- [ ] GitHub secrets are configured
- [ ] Custom domain configured (if applicable)

### Post-Deployment

- [ ] Site loads correctly
- [ ] Upload functionality works
- [ ] Style selection works
- [ ] AI conversion works  
- [ ] Gallery displays properly
- [ ] Analytics are tracking
- [ ] Performance scores are good

### Production Readiness

- [ ] Error monitoring set up
- [ ] Backup strategy in place
- [ ] SSL certificates valid
- [ ] API rate limiting configured
- [ ] Load testing completed
- [ ] Documentation updated

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Playwright Testing Guide](https://playwright.dev/docs/intro)

## 🆘 Getting Help

If you encounter issues:

1. Check the [troubleshooting section](#-troubleshooting)
2. Review GitHub Actions logs
3. Test components individually
4. Check all environment variables
5. Verify AI model connectivity

## 🎉 Success!

Once deployed, your PetCanvas app will be live at your Vercel URL with:

- ✅ Automated deployments on every push
- 🧪 E2E test coverage
- 📊 Performance monitoring
- 🎨 AI-powered pet portrait generation
- 📱 Mobile-responsive design
- 🚀 Production-ready infrastructure

Happy deploying! 🎨🐕🖼️