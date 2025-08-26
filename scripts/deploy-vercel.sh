#!/bin/bash

# Deploy PetCanvas to Vercel
# Usage: ./scripts/deploy-vercel.sh [production|preview]

set -e  # Exit on any error

ENVIRONMENT=${1:-preview}
PROJECT_NAME="PetCanvas Oil Painting App"

echo "🎨 Starting deployment of $PROJECT_NAME"
echo "🌍 Environment: $ENVIRONMENT"
echo "=================================================="

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Verify environment files
echo "🔍 Checking environment configuration..."
if [ "$ENVIRONMENT" = "production" ]; then
    if [ ! -f ".env.production" ]; then
        echo "⚠️  Warning: .env.production not found. Creating from template..."
        cat > .env.production << EOF
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_SITE_URL=https://petcanvas.vercel.app
A1111_BASE_URL=http://localhost:7860
COMFYUI_BASE_URL=http://localhost:8188
USE_CLOUD_FALLBACK=true
EOF
        echo "📝 Please update .env.production with your actual values before deploying!"
    fi
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run linting (non-blocking)
echo "🔍 Running linting..."
npm run lint || echo "⚠️  Lint warnings found (continuing deployment)"

# Run type checking (non-blocking)
echo "🔧 Running type check..."
npm run type-check || echo "⚠️  Type errors found (continuing deployment)"

# Build the application
echo "🏗️  Building application..."
npm run build

# Check if tests should run
if [ "$CI" != "true" ] && [ "$SKIP_TESTS" != "true" ]; then
    echo "🧪 Running E2E tests..."
    npm test || {
        echo "⚠️  Some tests failed. Continue deployment? (y/N)"
        read -r continue_deploy
        if [ "$continue_deploy" != "y" ] && [ "$continue_deploy" != "Y" ]; then
            echo "❌ Deployment cancelled due to test failures"
            exit 1
        fi
    }
else
    echo "⏭️  Skipping tests (CI environment or SKIP_TESTS=true)"
fi

# Deploy based on environment
echo "🚀 Deploying to Vercel..."
if [ "$ENVIRONMENT" = "production" ]; then
    # Production deployment
    echo "📋 Deploying to production..."
    DEPLOY_URL=$(vercel --prod --yes)
    echo "✅ Production deployment successful!"
    echo "🌐 Live URL: $DEPLOY_URL"
    
    # Run post-deployment checks
    echo "🔍 Running post-deployment health checks..."
    
    # Check if site is accessible
    if curl -f -s "$DEPLOY_URL" > /dev/null; then
        echo "✅ Homepage is accessible"
    else
        echo "⚠️  Homepage check failed"
    fi
    
    # Check upload page
    if curl -f -s "$DEPLOY_URL/upload" > /dev/null; then
        echo "✅ Upload page is accessible"
    else
        echo "⚠️  Upload page check failed"
    fi
    
else
    # Preview deployment
    echo "📋 Deploying preview..."
    DEPLOY_URL=$(vercel --yes)
    echo "✅ Preview deployment successful!"
    echo "🌐 Preview URL: $DEPLOY_URL"
fi

# Save deployment info
echo "📝 Saving deployment info..."
cat > deployment-info.json << EOF
{
  "url": "$DEPLOY_URL",
  "environment": "$ENVIRONMENT",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "branch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')"
}
EOF

# Display summary
echo ""
echo "=================================================="
echo "🎉 Deployment Complete!"
echo "📱 Project: $PROJECT_NAME"
echo "🌍 Environment: $ENVIRONMENT"
echo "🔗 URL: $DEPLOY_URL"
echo "⏰ Time: $(date)"
echo "=================================================="

# Optional: Open in browser (only if not in CI)
if [ "$CI" != "true" ] && command -v open &> /dev/null; then
    echo "🌐 Opening in browser..."
    open "$DEPLOY_URL"
fi

echo "✅ Deployment script completed successfully!"