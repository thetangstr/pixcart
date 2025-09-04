# PixCart Deployment Monitoring System

This comprehensive monitoring system provides automated deployment status checking and API health monitoring for the PixCart application.

## 🚀 Quick Start

```bash
# Run comprehensive monitoring (recommended)
npm run monitor

# Or use the shell wrapper
./monitor.sh

# Check deployment status only
npm run monitor:deployment

# Check API health only  
npm run monitor:health
```

## 📋 System Overview

The monitoring system consists of three main components:

### 1. Deployment Monitor (`scripts/deployment-monitor.js`)
- Checks Vercel deployment status via CLI
- Retrieves deployment logs for failed builds
- Identifies deployment patterns and failure rates
- Verifies site accessibility even when deployments show "Error"

### 2. API Health Checker (`scripts/api-health-check.js`)
- Tests all API endpoints for response status
- Measures response times and performance
- Validates authentication flows
- Checks database connectivity through API endpoints

### 3. Comprehensive Monitor (`scripts/comprehensive-monitor.js`)
- Combines deployment and API monitoring
- Provides unified status reporting
- Generates actionable recommendations
- Supports alerting and notifications

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- Vercel CLI installed and authenticated
- Access to the PixCart project on Vercel

### Setup Steps

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Authenticate with Vercel**:
   ```bash
   vercel login
   ```

3. **Verify Setup**:
   ```bash
   vercel whoami
   ```

4. **Test the monitoring system**:
   ```bash
   ./monitor.sh
   ```

## 📊 Usage Examples

### Basic Monitoring

```bash
# Run full monitoring with default settings
npm run monitor

# Check only deployment status
npm run monitor:deployment

# Check only API health
npm run monitor:health
```

### Advanced Usage

```bash
# Monitor specific project
node scripts/deployment-monitor.js oil-painting-app

# Test specific URL
node scripts/api-health-check.js https://your-app.vercel.app

# Comprehensive monitoring with custom settings
node scripts/comprehensive-monitor.js oil-painting-app https://your-app.vercel.app
```

### Shell Script Options

```bash
# Show help
./monitor.sh --help

# View recent results
./monitor.sh --results

# Run specific monitoring type
./monitor.sh deployment
./monitor.sh health
./monitor.sh full
```

## 📈 Understanding the Results

### Status Levels

- **✅ Healthy**: All systems operational
- **⚠️ Warning**: Minor issues detected, site functional
- **❌ Critical**: Major issues, site may be down
- **❓ Unknown**: Unable to determine status

### Exit Codes

- `0`: Success - All checks passed
- `1`: Warning - Some issues detected but site functional
- `2`: Critical - Major issues requiring immediate attention

### Performance Metrics

- **Fast**: Response time < 500ms
- **Acceptable**: Response time < 2s
- **Slow**: Response time > 2s

## 🔍 Troubleshooting Common Issues

### Deployment Failures

**Issue**: Recent deployments showing "Error" status
```
❌ Latest deployment failed with build error
```

**Common Causes & Solutions**:

1. **Component Import Errors**:
   ```
   Error: 'FileUpload' is not exported from '@/components/ui/file-upload'
   ```
   - Check component exports in `src/components/ui/file-upload.tsx`
   - Verify import statements in pages using the component

2. **Build Configuration Issues**:
   - Review `vercel.json` configuration
   - Check `package.json` build scripts
   - Verify environment variables are set

3. **Dependency Problems**:
   ```bash
   # Clear cache and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

### API Health Issues

**Issue**: Multiple API endpoints returning 401 Unauthorized
```
❌ Authentication failures detected on multiple endpoints
```

**Solutions**:
1. Check authentication middleware configuration
2. Verify API route protection settings
3. Test with valid authentication tokens

**Issue**: Slow API response times
```
⚠️ Average response time: 5000ms (slow)
```

**Solutions**:
1. Check database query performance
2. Implement caching strategies
3. Optimize API endpoint logic

### Site Access Issues

**Issue**: Site shows as accessible but deployments fail
```
🤔 Latest deployment shows "Error" but site is accessible!
```

**Explanation**: This is common with Vercel - the previous successful deployment continues serving while the latest one failed. The site remains functional, but you should fix the build issues.

## 📋 Monitoring Checklist

Use this checklist when investigating deployment issues:

### ✅ Initial Assessment
- [ ] Check overall status (`./monitor.sh`)
- [ ] Review recent deployment history
- [ ] Verify site accessibility
- [ ] Check API endpoint health

### ✅ Deployment Issues
- [ ] Get logs from failed deployment
- [ ] Compare with successful deployment
- [ ] Check for build errors
- [ ] Verify dependencies and imports
- [ ] Test build locally (`npm run build`)

### ✅ Performance Issues
- [ ] Measure API response times
- [ ] Check database query performance
- [ ] Review server-side rendering
- [ ] Analyze bundle size

### ✅ Infrastructure Issues
- [ ] Verify domain configuration
- [ ] Check environment variables
- [ ] Test from different locations
- [ ] Validate SSL certificates

## 🔧 Configuration Options

### Environment Variables

```bash
# Notification settings
export MONITOR_SLACK_WEBHOOK="https://hooks.slack.com/..."
export MONITOR_EMAIL_RECIPIENT="admin@example.com"
export MONITOR_SEVERITY_THRESHOLD="medium"  # low|medium|high|critical

# Custom project settings
export PROJECT_NAME="your-project-name"
export BASE_URL="https://your-app.vercel.app"
```

### Monitoring Intervals

For automated monitoring, you can set up cron jobs:

```bash
# Check every 15 minutes
*/15 * * * * /path/to/pixcart/monitor.sh full >> /var/log/pixcart-monitor.log 2>&1

# Quick health check every 5 minutes
*/5 * * * * /path/to/pixcart/monitor.sh health >> /var/log/pixcart-health.log 2>&1
```

## 📄 Result Files

All monitoring results are saved to `./test-results/` directory:

- `comprehensive-monitor-[project]-[timestamp].json` - Full JSON report
- `summary-[timestamp].md` - Human-readable summary
- `deployment-monitor-[project]-[timestamp].json` - Deployment-specific results
- `api-health-check-[timestamp].json` - API health results

### Sample JSON Structure

```json
{
  "timestamp": "2025-09-04T06:00:00.000Z",
  "project": "oil-painting-app",
  "baseUrl": "https://oil-painting-app-thetangstrs-projects.vercel.app",
  "overallStatus": "healthy",
  "severity": "low",
  "deployment": {
    "summary": {
      "total": 10,
      "successful": 8,
      "failed": 2,
      "failureRate": "20.0"
    }
  },
  "apiHealth": {
    "summary": {
      "total": 15,
      "passed": 13,
      "failed": 2,
      "skipped": 0
    },
    "performance": {
      "averageTime": 450
    }
  },
  "alerts": [],
  "recommendations": []
}
```

## 🚨 Integration with CI/CD

### GitHub Actions Example

```yaml
name: Deployment Health Check
on:
  deployment_status:

jobs:
  health-check:
    runs-on: ubuntu-latest
    if: github.event.deployment_status.state == 'success'
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install -g vercel
      - run: vercel login --token ${{ secrets.VERCEL_TOKEN }}
      - run: npm install
      - run: npm run monitor
        env:
          MONITOR_SLACK_WEBHOOK: ${{ secrets.SLACK_WEBHOOK }}
```

### Manual Integration

```bash
# In your deployment pipeline
./monitor.sh
MONITOR_EXIT_CODE=$?

if [ $MONITOR_EXIT_CODE -eq 2 ]; then
  echo "Critical issues detected, rolling back..."
  vercel rollback
  exit 1
elif [ $MONITOR_EXIT_CODE -eq 1 ]; then
  echo "Warnings detected, but proceeding..."
fi
```

## 🤝 Contributing

To add new monitoring capabilities:

1. Add new endpoints to `API_ENDPOINTS` in `api-health-check.js`
2. Add new analysis logic in the respective monitor classes
3. Update the configuration objects as needed
4. Test with `./monitor.sh` before committing

## 📞 Support

If you encounter issues with the monitoring system:

1. Check the troubleshooting section above
2. Run `./monitor.sh --help` for usage information
3. Check recent results with `./monitor.sh --results`
4. Review the generated log files in `./test-results/`

The monitoring system is designed to be self-diagnostic and provide actionable recommendations for resolving issues.