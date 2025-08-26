# Model Setup Guide for ComfyUI

## Current Models Available

### Installed Models
- **v1-5-pruned-emaonly.safetensors** - Stable Diffusion 1.5 (currently available)
- **oil_painting_style.safetensors** - LoRA for oil painting style

### Required Models for Testing

To use the full testing capabilities, you need to download these models:

## 1. FLUX.1 Dev Model
**Download**: https://huggingface.co/black-forest-labs/FLUX.1-dev/blob/main/flux1-dev.safetensors
**Size**: ~24GB
**Location**: Place in `/ComfyUI/models/checkpoints/`

## 2. SDXL Base Model
**Download**: https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/blob/main/sd_xl_base_1.0.safetensors
**Size**: ~6.9GB
**Location**: Place in `/ComfyUI/models/checkpoints/`

## Alternative Lighter Options

If the above models are too large, you can use these alternatives:

### SDXL Turbo (Faster, Smaller)
**Download**: https://huggingface.co/stabilityai/sdxl-turbo/blob/main/sd_xl_turbo_1.0.safetensors
**Size**: ~6.9GB
**Location**: Place in `/ComfyUI/models/checkpoints/`

### Juggernaut XL (Artistic)
**Download**: https://civitai.com/models/133005/juggernaut-xl
**Size**: ~6.9GB
**Location**: Place in `/ComfyUI/models/checkpoints/`

## Installation Steps

1. Download the model files from the links above
2. Place them in `/Volumes/home/Projects_Hosted/pixcart_v2/ComfyUI/models/checkpoints/`
3. Restart ComfyUI if it's running
4. The models will now appear in the testing interface

## Current Working Setup

For now, the testing page will work with:
- **Replicate (SDXL)** - Cloud-based, no setup needed
- **ComfyUI (SD 1.5)** - Using v1-5-pruned-emaonly.safetensors

## Notes

- FLUX models require significant GPU memory (24GB+ recommended)
- SDXL models require at least 12GB GPU memory
- SD 1.5 works with 8GB GPU memory
- Models are loaded on-demand, so you don't need all of them at once