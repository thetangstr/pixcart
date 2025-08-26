# ComfyUI Setup Guide

## Quick Setup for Testing

Since we've removed the local installations to save space, here are options for running ComfyUI:

### Option 1: Docker (Recommended)
```bash
# Run ComfyUI in Docker
docker run -it --rm \
  -p 8188:8188 \
  -v $(pwd)/models:/workspace/ComfyUI/models \
  yanwk/comfyui-boot:latest

# Run A1111 in Docker
docker run -it --rm \
  -p 7860:7860 \
  -v $(pwd)/models:/workspace/stable-diffusion-webui/models \
  --gpus all \
  r8.im/stability-ai/automatic1111@sha256:b4c15a2a6db8de6d5ef7c1ad59d18ae35dddc7b4e2b66c4b2e9b1bd9c9d6f9a3
```

### Option 2: Cloud Services
Use cloud-hosted instances:
- **A1111**: Google Colab, Runpod.io, Vast.ai
- **ComfyUI**: Runpod.io, Replicate, Hugging Face Spaces

Update `.env.local`:
```
A1111_BASE_URL=https://your-a1111-instance.com
COMFYUI_BASE_URL=https://your-comfyui-instance.com
```

### Option 3: Local Installation (Space Permitting)
```bash
# Install ComfyUI
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI
pip install -r requirements.txt

# Download basic model
wget https://huggingface.co/runwayml/stable-diffusion-v1-5/resolve/main/v1-5-pruned-emaonly.safetensors \
  -O models/checkpoints/v1-5-pruned-emaonly.safetensors

# Run ComfyUI
python main.py --listen 127.0.0.1 --port 8188
```

## Testing the Integration

1. Start your preferred ComfyUI instance
2. Visit `/upload-enhanced` in the web app
3. Select ComfyUI as backend
4. Enable comparison mode to test both A1111 and ComfyUI

## Model Requirements

For the oil painting styles to work, you need:
- **Base Model**: v1-5-pruned-emaonly.safetensors
- **ControlNet Models** (optional but recommended):
  - control_v11p_sd15_canny.pth
  - control_v11p_sd15_openpose.pth
  - control_v11f1p_sd15_depth.pth

The app will detect available models and adapt accordingly.