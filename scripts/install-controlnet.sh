#!/bin/bash

echo "🎨 Installing ControlNet for Stable Diffusion WebUI..."
echo "=================================================="

# Find the stable-diffusion-webui directory
SD_DIR=$(find /Users/Kailor -name "stable-diffusion-webui" -type d 2>/dev/null | head -1)

if [ -z "$SD_DIR" ]; then
    echo "❌ Could not find stable-diffusion-webui directory"
    echo "Please specify the path to your stable-diffusion-webui installation:"
    read SD_DIR
fi

echo "📁 Found SD WebUI at: $SD_DIR"

# Install ControlNet extension
echo ""
echo "📦 Installing ControlNet extension..."
cd "$SD_DIR/extensions"

if [ -d "sd-webui-controlnet" ]; then
    echo "✅ ControlNet already installed, updating..."
    cd sd-webui-controlnet
    git pull
else
    git clone https://github.com/Mikubill/sd-webui-controlnet.git
    echo "✅ ControlNet extension installed!"
fi

# Create models directory if it doesn't exist
echo ""
echo "📁 Setting up ControlNet models directory..."
mkdir -p "$SD_DIR/extensions/sd-webui-controlnet/models"
mkdir -p "$SD_DIR/models/ControlNet"

# Download essential ControlNet models
echo ""
echo "📥 Downloading essential ControlNet models..."
echo "This may take a few minutes..."

cd "$SD_DIR/models/ControlNet"

# Canny model (essential for structure preservation)
if [ ! -f "control_v11p_sd15_canny.pth" ]; then
    echo "Downloading Canny model..."
    wget -q --show-progress https://huggingface.co/lllyasviel/ControlNet-v1-1/resolve/main/control_v11p_sd15_canny.pth
fi

# Depth model (useful for maintaining 3D structure)
if [ ! -f "control_v11f1p_sd15_depth.pth" ]; then
    echo "Downloading Depth model..."
    wget -q --show-progress https://huggingface.co/lllyasviel/ControlNet-v1-1/resolve/main/control_v11f1p_sd15_depth.pth
fi

echo ""
echo "✨ ControlNet installation complete!"
echo ""
echo "⚠️  IMPORTANT: Restart your Stable Diffusion WebUI for the changes to take effect!"
echo ""
echo "To restart, stop the current SD WebUI process and run:"
echo "cd $SD_DIR && ./webui.sh --api --listen --cors-allow-origins='http://localhost:3000'"
echo ""
echo "The ControlNet API will be available at:"
echo "http://localhost:7860/controlnet"