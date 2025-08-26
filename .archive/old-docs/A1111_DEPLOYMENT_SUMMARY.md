# A1111 Deployment Summary for Oil Painting App

## 📦 What Was Created

Your oil-painting-app now has a complete deployment setup for Automatic1111 Stable Diffusion WebUI on Google Cloud Platform with GPU support.

### Files Created:
```
deployment/a1111/
├── Dockerfile                    # Multi-stage container with A1111 + SD v1.5
├── cloudbuild.yaml              # Cloud Build configuration
├── cloud-run-service.yaml       # Production Cloud Run config
├── cloud-run-testing.yaml       # Cost-optimized testing config
├── deploy.sh                    # Comprehensive deployment script
├── cost-optimization.md         # Detailed cost management guide
└── README.md                    # Complete deployment documentation

.github/workflows/
└── deploy-a1111.yml            # Automated GitHub Actions workflow

.env.example                     # Updated with A1111 configuration
```

### Code Updates:
- **`app/api/convert/route.ts`**: Updated to use environment variable for A1111 URL
- **Existing deployment workflows**: Already configured for A1111_BASE_URL

## 🚀 Quick Start Guide

### 1. For Testing (Cost-Optimized - Recommended First)
```bash
# Navigate to your project root
cd /Users/Kailor/Desktop/Projects/pixcart_v2/oil-painting-app

# Deploy cost-optimized testing version
./deployment/a1111/deploy.sh deploy-testing
```

**Cost**: ~$0.65/hour when active, scales to $0 when idle

### 2. Set Up Your Environment
```bash
# Add to your .env.local or Vercel environment variables
A1111_BASE_URL=https://a1111-webui-testing-[random].run.app

# For GitHub Actions, add these secrets:
GCP_PROJECT_ID=your-project-id
GCP_SA_KEY={"type": "service_account"...}
A1111_BASE_URL_BETA=https://a1111-webui-testing-[random].run.app
A1111_BASE_URL_PROD=https://a1111-webui-[random].run.app
```

### 3. Test the Integration
```bash
# Health check
curl https://your-service-url.run.app/sdapi/v1/options

# Test through your oil-painting-app
# Upload an image and select an oil painting style
```

## 💰 Cost Management (IMPORTANT)

### Your Current Setup Uses Firestore (No PostgreSQL costs!)
✅ **Database**: Firestore (pay-per-use, very cost-effective)
✅ **Hosting**: Vercel (generous free tier)
✅ **Authentication**: Firebase Auth (generous free tier)

### A1111 GPU Costs (Only new cost component)
- **Testing Config**: 2 CPU, 8GB RAM, 1 GPU → ~$0.65/hour when active
- **Production Config**: 4 CPU, 16GB RAM, 1 GPU → ~$1.30/hour when active
- **Auto-scaling**: Scales to $0 when not in use (no requests)

### Recommended Cost Strategy
1. **Start with testing config** (`deploy-testing`)
2. **Set billing alerts** in Google Cloud Console
3. **Monitor usage** for first week
4. **Typical development usage**: 2 hours/day = ~$40/month
5. **Production usage**: 10% utilization = ~$95/month

## 🔧 Integration with Your Current Architecture

### Database: Firestore ✅
Your app already uses Firestore, which is perfect for this deployment:
- **No PostgreSQL setup needed**
- **Pay-per-use pricing**
- **Automatic scaling**
- **No additional database costs for A1111 integration**

### Authentication: Firebase Auth ✅
Your existing Firebase Auth setup works perfectly:
- **No changes needed**
- **Same user sessions work with A1111 API**
- **Secure image processing**

### Hosting: Vercel ✅
Your oil-painting-app stays on Vercel:
- **No hosting changes needed**
- **A1111 runs separately on Cloud Run**
- **API calls from Vercel to Cloud Run**

## 🎯 Deployment Options

### Option 1: Manual Deployment (Recommended for first time)
```bash
# Quick testing deployment
./deployment/a1111/deploy.sh deploy-testing

# View cost information
./deployment/a1111/deploy.sh costs

# Test deployment
./deployment/a1111/deploy.sh test
```

### Option 2: GitHub Actions (After initial setup)
1. Go to **Actions** tab in your GitHub repository
2. Select **"Deploy A1111 to Cloud Run"**
3. Click **"Run workflow"**
4. Choose **"testing"** environment
5. Click **"Run workflow"**

## 🔍 What Happens During Deployment

### Container Build Process:
1. **Downloads Stable Diffusion v1.5 model** (4GB+)
2. **Installs CUDA and PyTorch** for GPU acceleration
3. **Configures A1111 for API-only mode** (no web UI)
4. **Optimizes for Cloud Run** with health checks
5. **Pushes to Google Container Registry**

### Cloud Run Deployment:
1. **Provisions NVIDIA L4 GPU instance**
2. **Configures auto-scaling** (0 to 1/10 instances)
3. **Sets up health checks** and monitoring
4. **Enables CORS** for your oil-painting-app
5. **Provides permanent HTTPS URL**

## 🧪 Testing Your Deployment

### 1. Direct API Test
```bash
curl https://your-service-url.run.app/sdapi/v1/options
```

### 2. Through Your App
1. Go to your oil-painting-app upload page
2. Upload a test image
3. Select an oil painting style
4. Click convert
5. Verify it processes using the Cloud Run A1111 instance

### 3. Monitor Performance
```bash
# View logs
gcloud run services logs read a1111-webui-testing --region=us-central1

# Check status
./deployment/a1111/deploy.sh info
```

## 🚨 Important Notes

### GPU Quota
- **You may need to request GPU quota** in Google Cloud Console
- **NVIDIA L4 GPUs** are available in limited regions
- **us-central1** is recommended and pre-configured

### First Deployment
- **Takes 30-60 minutes** (large model downloads)
- **Subsequent deployments are faster** (cached layers)
- **Cold starts take 1-2 minutes** (GPU initialization)

### Cost Monitoring
- **Set up billing alerts immediately**
- **Monitor usage in Google Cloud Console**
- **Use testing config during development**

## 🔄 Next Steps

1. **✅ Deploy testing configuration**
   ```bash
   ./deployment/a1111/deploy.sh deploy-testing
   ```

2. **✅ Set up billing alerts**
   - Go to Google Cloud Console → Billing
   - Create budget alert for $50/month

3. **✅ Test integration**
   - Update A1111_BASE_URL in your environment
   - Test image conversion through your app

4. **✅ Monitor costs**
   - Check daily for first week
   - Adjust configuration as needed

5. **✅ Deploy production when ready**
   ```bash
   ./deployment/a1111/deploy.sh deploy
   ```

## 📋 Deployment Checklist

- [ ] Google Cloud Project created
- [ ] Billing enabled
- [ ] `gcloud` CLI installed and authenticated
- [ ] GPU quota requested (if needed)
- [ ] Testing deployment completed
- [ ] Billing alerts configured
- [ ] A1111_BASE_URL updated in environment
- [ ] Integration tested with oil-painting-app
- [ ] Cost monitoring in place
- [ ] Production deployment (when ready)

## 🆘 Emergency Procedures

### Stop All GPU Usage Immediately
```bash
# Scale testing service to zero
gcloud run services update a1111-webui-testing --max-instances=0 --region=us-central1

# Scale production service to zero
gcloud run services update a1111-webui --max-instances=0 --region=us-central1
```

### Delete Service Completely
```bash
# Delete testing service
gcloud run services delete a1111-webui-testing --region=us-central1

# Delete production service
gcloud run services delete a1111-webui --region=us-central1
```

## 📞 Support

For issues or questions:
1. **Check deployment logs**: `./deployment/a1111/deploy.sh test`
2. **Review cost guide**: `./deployment/a1111/deploy.sh costs`
3. **Check service status**: `./deployment/a1111/deploy.sh info`
4. **View complete documentation**: `deployment/a1111/README.md`

---

**🎉 Your oil-painting-app is now ready for GPU-powered AI image processing with cost-optimized Cloud Run deployment!**