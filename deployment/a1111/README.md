# Automatic1111 Stable Diffusion WebUI - Google Cloud Deployment

This directory contains a complete deployment setup for running Automatic1111 Stable Diffusion WebUI on Google Cloud Run with GPU support, optimized for the oil-painting-app.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Oil Painting  │───▶│   Cloud Run      │───▶│   NVIDIA L4     │
│   App (Vercel)  │    │   (A1111 API)    │    │   GPU Instance  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
       │                        │
       │                        ▼
       │               ┌──────────────────┐
       │               │   Container      │
       │               │   Registry       │
       │               │   (gcr.io)       │
       └──────────────▶│                  │
                       └──────────────────┘
```

## 📋 Quick Start

### Prerequisites
- Google Cloud Project with billing enabled
- `gcloud` CLI installed and authenticated
- Docker installed (for local testing)
- GPU quota for NVIDIA L4 in us-central1 region

### 1. Deploy for Testing (Cost-Optimized)
```bash
# Navigate to the oil-painting-app root
cd /path/to/oil-painting-app

# Deploy cost-optimized testing configuration
./deployment/a1111/deploy.sh deploy-testing
```

### 2. Deploy for Production
```bash
# Deploy production configuration
./deployment/a1111/deploy.sh
```

### 3. Update Your Application
Once deployed, update your Vercel environment variables:
```bash
# Set in Vercel dashboard or .env.local
A1111_BASE_URL=https://your-service-url.run.app
```

## 📁 Files Overview

### Core Deployment Files
- **`Dockerfile`** - Multi-stage container with A1111, CUDA, and SD v1.5 model
- **`cloudbuild.yaml`** - Cloud Build configuration for automated builds
- **`cloud-run-service.yaml`** - Production Cloud Run service configuration
- **`cloud-run-testing.yaml`** - Cost-optimized testing configuration
- **`deploy.sh`** - Comprehensive deployment script with multiple options

### Configuration Files
- **`cost-optimization.md`** - Detailed cost management strategies
- **`README.md`** - This comprehensive guide

### GitHub Actions
- **`.github/workflows/deploy-a1111.yml`** - Automated deployment workflow

## 🚀 Deployment Options

### Option 1: Manual Deployment (Recommended for First Time)
```bash
# Full deployment with all checks
./deployment/a1111/deploy.sh

# Individual steps
./deployment/a1111/deploy.sh build          # Build image only
./deployment/a1111/deploy.sh deploy         # Deploy production config
./deployment/a1111/deploy.sh deploy-testing # Deploy testing config
./deployment/a1111/deploy.sh test          # Test deployment
./deployment/a1111/deploy.sh info          # Show deployment info
./deployment/a1111/deploy.sh costs         # View cost optimization guide
```

### Option 2: GitHub Actions (Automated)
```bash
# Trigger via GitHub Actions
# Go to Actions tab → Deploy A1111 to Cloud Run → Run workflow

# Choose environment:
# - testing: Cost-optimized (2 CPU, 8GB RAM, max 1 instance)
# - production: Full resources (4 CPU, 16GB RAM, max 10 instances)
```

## 💰 Cost Management

### Testing Configuration (Recommended for Development)
- **Resources**: 2 CPUs, 8GB RAM, 1 NVIDIA L4 GPU
- **Scaling**: Max 1 instance, scale to zero when idle
- **Timeout**: 15 minutes maximum
- **Estimated Cost**: ~$0.65/hour when active

### Production Configuration
- **Resources**: 4 CPUs, 16GB RAM, 1 NVIDIA L4 GPU
- **Scaling**: Max 10 instances, scale to zero when idle
- **Timeout**: 60 minutes maximum
- **Estimated Cost**: ~$1.30/hour when active

### Cost Optimization Tips
1. **Always use testing config during development**
2. **Set up billing alerts** before deploying
3. **Group testing sessions** to minimize cold starts
4. **Monitor usage weekly** in Google Cloud Console
5. **Scale to zero automatically** when not in use

See `cost-optimization.md` for detailed cost management strategies.

## 🔧 Configuration

### Environment Variables

#### Required for Deployment
```bash
# Google Cloud Configuration
export PROJECT_ID="your-gcp-project-id"
export REGION="us-central1"  # GPU region
```

#### Required for Oil Painting App
```bash
# In your .env.local or Vercel environment
A1111_BASE_URL=https://a1111-webui-testing-xyz.run.app  # Testing
A1111_BASE_URL=https://a1111-webui-xyz.run.app          # Production
```

### GitHub Secrets (for Actions)
```bash
# Required secrets in your GitHub repository
GCP_PROJECT_ID=your-gcp-project-id
GCP_SA_KEY={"type": "service_account", ...}  # Service account JSON

# Required for oil-painting-app deployment
A1111_BASE_URL_PROD=https://a1111-webui-xyz.run.app
A1111_BASE_URL_BETA=https://a1111-webui-testing-xyz.run.app
```

## 🧪 Testing

### Health Check
```bash
# Test if service is running
curl https://your-service-url.run.app/sdapi/v1/options
```

### API Test
```bash
# Test image generation
curl -X POST "https://your-service-url.run.app/sdapi/v1/txt2img" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "oil painting of a landscape",
    "width": 768,
    "height": 768,
    "steps": 20,
    "cfg_scale": 7.5
  }'
```

### Integration Test
```bash
# Test with your oil-painting-app
# Upload an image through your app's UI
# Verify it processes correctly with the Cloud Run A1111 instance
```

## 🔍 Monitoring & Troubleshooting

### View Logs
```bash
# Production logs
gcloud run services logs read a1111-webui --region=us-central1

# Testing logs
gcloud run services logs read a1111-webui-testing --region=us-central1

# Real-time logs
gcloud run services logs tail a1111-webui-testing --region=us-central1
```

### Common Issues

#### 1. GPU Quota Exceeded
```
Error: Insufficient GPU quota
```
**Solution**: Request GPU quota increase in Google Cloud Console

#### 2. Cold Start Timeout
```
Error: Service timeout during startup
```
**Solution**: Increase timeout or use smaller model (already optimized in our config)

#### 3. Memory Issues
```
Error: Out of memory
```
**Solution**: 
- Use testing config with 8GB RAM for light usage
- Use production config with 16GB RAM for heavy usage

#### 4. Build Timeout
```
Error: Build timeout during model download
```
**Solution**: Model is cached in container, subsequent builds are faster

### Performance Monitoring
```bash
# Check service status
gcloud run services describe a1111-webui-testing --region=us-central1

# Monitor costs
gcloud billing budgets list --billing-account=YOUR_BILLING_ACCOUNT

# View metrics in Cloud Console
# Navigation: Cloud Run → Service → Metrics
```

## 🔒 Security

### Service Account Permissions
The deployment creates a service account with minimal required permissions:
- `roles/logging.logWriter` - For application logs
- `roles/monitoring.metricWriter` - For metrics collection

### Network Security
- Service allows unauthenticated requests (required for Vercel integration)
- CORS configured for your oil-painting-app domain
- No sensitive data stored in container

### Container Security
- Non-root user execution
- Minimal base image (Ubuntu 22.04)
- Regular security updates via scheduled rebuilds

## 🔄 Updates & Maintenance

### Automated Updates
```bash
# Weekly scheduled rebuild via GitHub Actions
# Includes security updates and latest A1111 version
```

### Manual Updates
```bash
# Force rebuild with latest A1111 version
./deployment/a1111/deploy.sh build

# Update production deployment
./deployment/a1111/deploy.sh deploy
```

### Model Updates
To update the Stable Diffusion model:
1. Edit the `Dockerfile` model download URLs
2. Rebuild and redeploy
3. Test with sample images

## 📊 Cost Estimates

### Development Usage (2 hours/day testing)
- **Testing Config**: $1.30/day = ~$40/month
- **Production Config**: $2.60/day = ~$80/month

### Production Usage (10% utilization)
- **24/7 availability**: ~$95/month
- **High usage periods**: Scale up automatically
- **Idle periods**: Scale to zero (no GPU costs)

### Cost Breakdown
- **GPU (NVIDIA L4)**: $0.60/hour (largest component)
- **CPU**: $0.048/hour (4 vCPUs)
- **Memory**: $0.0144/hour (16GB)
- **Network**: $0.12/GB egress (minimal for API responses)

## 🆘 Support

### Getting Help
1. **Check logs first**: `gcloud run services logs read a1111-webui-testing`
2. **Review cost guide**: `./deployment/a1111/deploy.sh costs`
3. **Test deployment**: `./deployment/a1111/deploy.sh test`
4. **Check service status**: `./deployment/a1111/deploy.sh info`

### Emergency Cost Control
```bash
# Immediately scale to zero
gcloud run services update a1111-webui-testing \
  --max-instances=0 \
  --region=us-central1

# Delete service entirely (if needed)
gcloud run services delete a1111-webui-testing \
  --region=us-central1
```

## 🎯 Next Steps

1. **Deploy testing configuration** first
2. **Set up billing alerts** in Google Cloud Console
3. **Test integration** with your oil-painting-app
4. **Monitor costs** for first week
5. **Deploy production** when ready
6. **Set up automated deployments** via GitHub Actions

## 📚 Additional Resources

- [Google Cloud Run GPU Documentation](https://cloud.google.com/run/docs/configuring/gpu)
- [Automatic1111 API Documentation](https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/API)
- [Cloud Build Documentation](https://cloud.google.com/build/docs)
- [Cost Optimization Guide](./cost-optimization.md)

---

**Note**: This deployment is optimized for the oil-painting-app's specific needs. The configuration balances cost, performance, and reliability for an AI-powered image processing service.