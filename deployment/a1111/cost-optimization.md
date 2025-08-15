# Cost Optimization Guide for A1111 on Google Cloud Run

## Overview

Running Stable Diffusion with GPU on Cloud Run can be expensive if not properly configured. This guide provides strategies to minimize costs during testing and development.

## Cost Components

### 1. GPU Costs (Most Expensive)
- **NVIDIA L4 GPU**: ~$0.50-0.70 per hour
- **Billing**: Per-second billing with 1-minute minimum
- **Key Strategy**: Scale to zero when not in use

### 2. CPU and Memory
- **CPU**: ~$0.000024 per vCPU-second
- **Memory**: ~$0.0000025 per GB-second
- **Strategy**: Use minimum required resources

### 3. Network Egress
- **Cost**: ~$0.12 per GB (first 1GB free per month)
- **Strategy**: Optimize image sizes and caching

## Cost Optimization Strategies

### 1. Use Testing Configuration

```bash
# Deploy cost-optimized testing version
./deployment/a1111/deploy.sh deploy-testing
```

**Testing Configuration Benefits:**
- **2 CPUs instead of 4**: 50% CPU cost reduction
- **8GB RAM instead of 16GB**: 50% memory cost reduction
- **Max 1 instance**: Prevents accidental scaling
- **15-minute timeout**: Reduces maximum billable time
- **Aggressive scale-to-zero**: Minimizes idle costs

### 2. Smart Usage Patterns

#### During Development:
```bash
# Start service for testing session
curl https://your-service-url/sdapi/v1/options

# Use the service for ~30 minutes of active testing

# Let it auto-scale to zero (no manual action needed)
```

#### For Production:
```bash
# Deploy production configuration only when ready
./deployment/a1111/deploy.sh deploy-production
```

### 3. Cost Monitoring Setup

```bash
# Set up billing alerts
gcloud alpha billing budgets create \
  --billing-account=BILLING_ACCOUNT_ID \
  --display-name="A1111 GPU Budget" \
  --budget-amount=50USD \
  --threshold-rule=percent:50 \
  --threshold-rule=percent:90 \
  --all-updates-rule-monitoring-notification-channels=NOTIFICATION_CHANNEL \
  --all-updates-rule-pubsub-topic=projects/PROJECT_ID/topics/billing-alerts
```

### 4. Development Best Practices

#### Use Local Development First
```bash
# Install A1111 locally for initial testing
git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git
cd stable-diffusion-webui
./webui.sh --api --listen --cors-allow-origins="http://localhost:3000"
```

#### Batch Testing Sessions
- Group multiple tests into single sessions
- Avoid frequent deployments
- Use Cloud Run's 15-minute minimum billing window efficiently

### 5. Automated Cost Controls

#### Set Maximum Instances
```yaml
# In cloud-run-testing.yaml
autoscaling.knative.dev/maxScale: "1"  # Prevents runaway scaling
```

#### Implement Circuit Breaker
```typescript
// In your app/api/convert/route.ts
const MAX_REQUESTS_PER_HOUR = 10;
const requestCount = new Map();

// Rate limiting logic to prevent excessive GPU usage
```

## Cost Estimates

### Testing Environment (Optimized)
- **GPU**: NVIDIA L4 at ~$0.60/hour
- **CPU**: 2 vCPUs at ~$0.048/hour  
- **Memory**: 8GB at ~$0.0072/hour
- **Total**: ~$0.65/hour when active

### Typical Usage Patterns

#### Light Testing (2 hours/day):
- **Daily**: $1.30
- **Monthly**: ~$40
- **Annual**: ~$475

#### Heavy Development (4 hours/day):
- **Daily**: $2.60  
- **Monthly**: ~$80
- **Annual**: ~$950

#### Production (24/7 with 10% utilization):
- **Daily**: $3.12
- **Monthly**: ~$95
- **Annual**: ~$1,140

## Cost Optimization Scripts

### Deploy Testing Version
```bash
#!/bin/bash
# Deploy cost-optimized testing configuration
gcloud run services replace deployment/a1111/cloud-run-testing.yaml \
  --region=us-central1 \
  --project=$PROJECT_ID
```

### Monitor Costs
```bash
#!/bin/bash
# Check current month's costs
gcloud billing budgets list \
  --billing-account=$BILLING_ACCOUNT_ID \
  --format="table(displayName,amount,thresholdRules)"
```

### Force Scale to Zero
```bash
#!/bin/bash
# Manually scale to zero (emergency cost control)
gcloud run services update a1111-webui-testing \
  --region=us-central1 \
  --max-instances=0 \
  --project=$PROJECT_ID

# Re-enable when needed
gcloud run services update a1111-webui-testing \
  --region=us-central1 \
  --max-instances=1 \
  --project=$PROJECT_ID
```

## Monitoring and Alerts

### 1. Set Up Billing Alerts
```bash
# Create budget with alerts
gcloud alpha billing budgets create \
  --billing-account=$BILLING_ACCOUNT_ID \
  --display-name="A1111 Monthly Budget" \
  --budget-amount=100USD \
  --threshold-rule=percent:50 \
  --threshold-rule=percent:80 \
  --threshold-rule=percent:100
```

### 2. Monitor Usage
```bash
# Check service metrics
gcloud run services describe a1111-webui-testing \
  --region=us-central1 \
  --format="value(status.conditions.status)"

# View request count
gcloud logging read "resource.type=cloud_run_revision" \
  --format="value(timestamp,jsonPayload.message)" \
  --limit=10
```

### 3. Cost Analysis Queries
```bash
# BigQuery cost analysis
bq query --use_legacy_sql=false '
SELECT 
  service.description,
  SUM(cost) as total_cost,
  currency
FROM `PROJECT_ID.billing.gcp_billing_export_v1_BILLING_ACCOUNT_ID`
WHERE service.description LIKE "%Cloud Run%"
  AND usage_start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY service.description, currency
ORDER BY total_cost DESC
'
```

## Emergency Cost Control

If costs are too high, immediately:

1. **Scale to Zero**:
   ```bash
   gcloud run services update a1111-webui-testing --max-instances=0 --region=us-central1
   ```

2. **Delete Service** (if needed):
   ```bash
   gcloud run services delete a1111-webui-testing --region=us-central1
   ```

3. **Switch to Local Development**:
   ```bash
   # Use local A1111 instance
   docker run --gpus all -p 7860:7860 local/a1111:latest
   ```

## Best Practices Summary

1. **Always use testing configuration during development**
2. **Set up billing alerts before deploying**
3. **Group testing sessions to use minimum billing efficiently**
4. **Monitor usage weekly**
5. **Use local development for initial feature work**
6. **Scale to zero when not actively testing**
7. **Set maximum instance limits**
8. **Consider using preemptible instances for non-critical testing**

## Next Steps

1. Deploy testing configuration first
2. Set up billing alerts
3. Test with small batches
4. Monitor costs daily for first week
5. Adjust configuration based on usage patterns