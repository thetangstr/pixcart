# ComfyUI Model Setup Guide

## Current Status

✅ **ComfyUI Server**: Running at localhost:8188  
✅ **SDXL Checkpoint**: `sd_xl_base_1.0_0.9vae.safetensors` available  
✅ **ControlNet Models**: 2 LoRA-based ControlNets available  
❌ **SD 1.5 Checkpoint**: Missing `v1-5-pruned-emaonly.safetensors`  
❌ **Oil Painting LoRA**: Missing `epinikionimpressionismoilpainting.safetensors`  
❌ **Standard ControlNet**: Missing `control_v11p_sd15_canny.pth`  

## Quick Fix: Use SDXL (Currently Working)

The application now includes SDXL-compatible styles that work with your existing setup:

- `classic_oil_sdxl` - Classical oil painting style
- `impressionist_sdxl` - Monet-inspired impressionist style  
- `van_gogh_sdxl` - Van Gogh style with thick impasto
- `portrait_oil_sdxl` - Portrait-focused oil painting
- `baroque_drama_sdxl` - Dramatic baroque lighting
- `no_controlnet_oil` - Simple oil style without ControlNet

## Complete Setup: Download Missing Models

### 1. SD 1.5 Base Checkpoint (Required for original styles)

**Download Location**: 
```bash
cd /Volumes/home/Projects_Hosted/pixcart_v2/ComfyUI/models/checkpoints/
```

**Option A: Hugging Face (Recommended)**
```bash
wget https://huggingface.co/runwayml/stable-diffusion-v1-5/resolve/main/v1-5-pruned-emaonly.safetensors
```

**Option B: Manual Download**
1. Visit: https://huggingface.co/runwayml/stable-diffusion-v1-5/tree/main
2. Download: `v1-5-pruned-emaonly.safetensors` (4.27 GB)
3. Place in: `/Volumes/home/Projects_Hosted/pixcart_v2/ComfyUI/models/checkpoints/`

### 2. Oil Painting LoRA (Enhances oil painting quality)

**Download Location**:
```bash
cd /Volumes/home/Projects_Hosted/pixcart_v2/ComfyUI/models/loras/
```

**Option A: CivitAI (Recommended)**
```bash
# Search for "epinikion impressionismo oil painting" on CivitAI
# Download URL (example - verify latest version):
wget "https://civitai.com/api/download/models/[MODEL_ID]" -O epinikionimpressionismoilpainting.safetensors
```

**Option B: Alternative Oil Painting LoRAs**
Popular alternatives on CivitAI:
- "Oil Painting Style" by various artists
- "Classical Oil Painting LoRA"
- "Painterly Style LoRA"

### 3. Standard ControlNet Models (Better edge/structure control)

**Download Location**:
```bash
cd /Volumes/home/Projects_Hosted/pixcart_v2/ComfyUI/models/controlnet/
```

**ControlNet Canny (Edge detection)**
```bash
wget https://huggingface.co/lllyasviel/ControlNet-v1-1/resolve/main/control_v11p_sd15_canny.pth
```

**ControlNet Depth (3D structure)**
```bash
wget https://huggingface.co/lllyasviel/ControlNet-v1-1/resolve/main/control_v11f1p_sd15_depth.pth
```

**ControlNet OpenPose (Human poses)**
```bash
wget https://huggingface.co/lllyasviel/ControlNet-v1-1/resolve/main/control_v11p_sd15_openpose.pth
```

## Automated Setup Script

Create this script to download all missing models:

```bash
#!/bin/bash
# setup-comfyui-models.sh

set -e

BASE_DIR="/Volumes/home/Projects_Hosted/pixcart_v2/ComfyUI/models"

echo "🔄 Setting up ComfyUI models for oil painting..."

# Create directories if they don't exist
mkdir -p "$BASE_DIR/checkpoints"
mkdir -p "$BASE_DIR/loras" 
mkdir -p "$BASE_DIR/controlnet"

# Download SD 1.5 checkpoint
echo "📦 Downloading Stable Diffusion 1.5..."
cd "$BASE_DIR/checkpoints"
if [ ! -f "v1-5-pruned-emaonly.safetensors" ]; then
    wget https://huggingface.co/runwayml/stable-diffusion-v1-5/resolve/main/v1-5-pruned-emaonly.safetensors
    echo "✅ SD 1.5 checkpoint downloaded"
else
    echo "✅ SD 1.5 checkpoint already exists"
fi

# Download ControlNet models
echo "🎮 Downloading ControlNet models..."
cd "$BASE_DIR/controlnet"

if [ ! -f "control_v11p_sd15_canny.pth" ]; then
    wget https://huggingface.co/lllyasviel/ControlNet-v1-1/resolve/main/control_v11p_sd15_canny.pth
    echo "✅ ControlNet Canny downloaded"
else
    echo "✅ ControlNet Canny already exists"
fi

if [ ! -f "control_v11f1p_sd15_depth.pth" ]; then
    wget https://huggingface.co/lllyasviel/ControlNet-v1-1/resolve/main/control_v11f1p_sd15_depth.pth
    echo "✅ ControlNet Depth downloaded"
else
    echo "✅ ControlNet Depth already exists"
fi

echo "🎨 Manual step required:"
echo "   Download oil painting LoRA from CivitAI:"
echo "   1. Visit: https://civitai.com/"
echo "   2. Search: 'oil painting lora' or 'impressionism'"
echo "   3. Download to: $BASE_DIR/loras/"
echo "   4. Rename to: epinikionimpressionismoilpainting.safetensors"

echo ""
echo "🔄 Restart ComfyUI after downloads complete:"
echo "   cd /Volumes/home/Projects_Hosted/pixcart_v2/ComfyUI"
echo "   python main.py --listen 0.0.0.0 --port 8188 --lowvram"

echo ""
echo "✅ Setup complete! Check the web app for new oil painting styles."
```

## Testing After Setup

1. **Restart ComfyUI** after downloading models
2. **Verify models loaded** by checking the web interface
3. **Test conversion** with a sample image
4. **Check logs** for any model loading errors

## Troubleshooting

### Model Loading Issues
- Ensure file permissions are correct: `chmod 644 *.safetensors *.pth`
- Check disk space: Models require ~15GB total
- Verify file integrity: Re-download if files seem corrupted

### Memory Issues
- Use `--lowvram` flag when starting ComfyUI
- Close other applications to free RAM
- Consider using smaller models or reduced batch sizes

### Network Issues
- Use alternative download links if Hugging Face is slow
- Download manually if wget fails
- Use a download manager for large files

## Model Size Reference

| Model Type | File Size | Required |
|------------|-----------|----------|
| SD 1.5 Checkpoint | ~4.3 GB | Yes |
| Oil Painting LoRA | ~100 MB | Recommended |
| ControlNet Canny | ~1.4 GB | Optional |
| ControlNet Depth | ~1.4 GB | Optional |
| **Total** | **~7.2 GB** | |

## Next Steps

After model setup:
1. ✅ Models will be automatically detected
2. ✅ Original SD 1.5 styles will become available  
3. ✅ Higher quality oil painting results
4. ✅ Better subject geometry preservation with ControlNet