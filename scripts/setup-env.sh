#!/bin/bash

# PetCanvas Environment Setup Script
# This script helps you set up the environment variables for PetCanvas

set -e

echo "🎨 PetCanvas Environment Setup"
echo "=============================="
echo ""

# Check if .env.local already exists
if [ -f ".env.local" ]; then
    echo "⚠️  .env.local already exists!"
    echo "Do you want to backup the existing file and create a new one? (y/N)"
    read -r backup_existing
    
    if [ "$backup_existing" = "y" ] || [ "$backup_existing" = "Y" ]; then
        echo "📋 Backing up existing .env.local to .env.local.backup"
        cp .env.local .env.local.backup
    else
        echo "❌ Setup cancelled. Existing .env.local preserved."
        exit 0
    fi
fi

# Copy template
echo "📝 Creating .env.local from template..."
cp .env.example .env.local

# Generate NextAuth secret
echo "🔑 Generating NextAuth secret..."
NEXTAUTH_SECRET=$(openssl rand -base64 32 2>/dev/null || node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")

# Update NextAuth secret in .env.local
if command -v sed &> /dev/null; then
    sed -i.bak "s/your_nextauth_secret_key_here/$NEXTAUTH_SECRET/" .env.local
    rm .env.local.bak 2>/dev/null || true
else
    echo "⚠️  Please manually update NEXTAUTH_SECRET in .env.local"
fi

echo "✅ .env.local created successfully!"
echo ""

# Offer to open OAuth setup guides
echo "🔧 Next Steps:"
echo "1. Set up OAuth providers (required for social login):"
echo "   📖 See SOCIAL_AUTH_SETUP.md for detailed instructions"
echo ""
echo "2. Set up Firebase (required for user data):"
echo "   🔥 Create a Firebase project and add credentials"
echo ""
echo "3. Optional: Set up AI models locally:"
echo "   🤖 Install Stable Diffusion WebUI or ComfyUI"
echo ""

echo "🚀 Quick OAuth Setup Links:"
echo "   Google: https://console.cloud.google.com/"
echo "   Facebook: https://developers.facebook.com/"
echo "   Apple: https://developer.apple.com/"
echo ""

# Check if required tools are installed
echo "🔍 Checking development environment..."

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js: $NODE_VERSION"
else
    echo "❌ Node.js not found. Please install Node.js 18+"
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo "✅ npm: $NPM_VERSION"
else
    echo "❌ npm not found"
fi

# Check if dependencies are installed
if [ -d "node_modules" ]; then
    echo "✅ Dependencies installed"
else
    echo "📦 Installing dependencies..."
    npm install
fi

echo ""
echo "🎯 To start developing:"
echo "   1. Complete OAuth setup (see SOCIAL_AUTH_SETUP.md)"
echo "   2. Run: npm run dev"
echo "   3. Visit: http://localhost:5174"
echo ""

# Offer to open relevant files
echo "📂 Quick access:"
echo "   .env.local - Your environment variables"
echo "   SOCIAL_AUTH_SETUP.md - OAuth setup guide"
echo "   DEPLOYMENT_GUIDE.md - Production deployment"
echo ""

# Check if we should start dev server
echo "🚀 Start development server now? (y/N)"
read -r start_dev

if [ "$start_dev" = "y" ] || [ "$start_dev" = "Y" ]; then
    echo "🎨 Starting PetCanvas development server..."
    npm run dev
else
    echo "✅ Setup complete! Run 'npm run dev' when ready."
fi

echo ""
echo "🎉 Welcome to PetCanvas! Create amazing pet oil paintings! 🐕🎨"