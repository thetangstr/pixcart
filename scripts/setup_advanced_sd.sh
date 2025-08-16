#!/bin/bash

echo "🎨 Setting up Advanced SD Components for Oil Painting"
echo "====================================================="

# ControlNet models directory
CONTROLNET_DIR="/Users/Kailor/Desktop/Projects/pixcart_v2/stable-diffusion-webui/models/ControlNet"
cd "$CONTROLNET_DIR"

# Check existing models
echo "📦 Checking existing ControlNet models..."
ls -la *.pth 2>/dev/null || echo "No models found yet"

echo ""
echo "📥 Downloading required ControlNet models..."
echo "Note: These are large files (~1.4GB each)"

# Download OpenPose model
if [ ! -f "control_v11p_sd15_openpose.pth" ]; then
    echo "Downloading OpenPose model..."
    wget -q --show-progress -O control_v11p_sd15_openpose.pth \
        "https://huggingface.co/lllyasviel/ControlNet-v1-1/resolve/main/control_v11p_sd15_openpose.pth"
else
    echo "✓ OpenPose model already exists"
fi

# Download Depth model
if [ ! -f "control_v11f1p_sd15_depth.pth" ]; then
    echo "Downloading Depth model..."
    wget -q --show-progress -O control_v11f1p_sd15_depth.pth \
        "https://huggingface.co/lllyasviel/ControlNet-v1-1/resolve/main/control_v11f1p_sd15_depth.pth"
else
    echo "✓ Depth model already exists"
fi

echo ""
echo "✅ ControlNet models setup complete!"
echo ""
echo "📝 Models installed:"
ls -lh *.pth | awk '{print "  - " $9 " (" $5 ")"}'