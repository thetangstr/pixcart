# Stable Diffusion Oil Painting Integration - Design Document

## Executive Summary

This document outlines the advanced Stable Diffusion integration for photorealistic-to-oil-painting conversion, incorporating multi-ControlNet pipelines, hierarchical prompting, LoRA models, and reinforcement learning optimization.

## Architecture Overview

```
┌─────────────────────┐
│   Web Interface     │
│  (Next.js + React)  │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  Enhanced API Layer │
│ /api/convert-enhanced│
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  Multi-Pass Engine  │
│  (2-3 stage process)│
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ Multi-ControlNet    │
│ Canny+OpenPose+Depth│
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  SD WebUI API       │
│  (localhost:7860)   │
└─────────────────────┘
```

## Key Components

### 1. Multi-ControlNet Pipeline

**Purpose**: Preserve subject identity while transforming artistic style

**Installed Models**:
- `control_v11p_sd15_canny` - Edge detection for structure preservation
- `control_v11p_sd15_openpose` - Human pose/anatomy preservation  
- `control_v11f1p_sd15_depth` - 3D depth information retention

**Configuration**:
```typescript
controlnets: [
  {
    model: 'control_v11p_sd15_canny',
    weight: 0.55-0.85,  // RL optimized per style
    module: 'canny',
    thresholdA: 100,
    thresholdB: 200
  },
  {
    model: 'control_v11p_sd15_openpose',
    weight: 0.45,
    module: 'openpose_full'
  },
  {
    model: 'control_v11f1p_sd15_depth',
    weight: 0.35,
    module: 'depth_midas'
  }
]
```

### 2. Hierarchical Prompt Structure

**Implementation**: `oilPaintingStylesEnhanced.ts`

**Prompt Layers**:
1. **Medium**: `((oil painting on canvas:1.4))`
2. **Subject Preservation**: `EXACT SAME subject, NO CHANGES to identity`
3. **Style Keywords**: `((Renaissance brushwork:1.3)), ((classical technique:1.2))`
4. **Artist Influence**: `in the style of Rembrandt and Vermeer`
5. **Lighting**: `((warm chiaroscuro lighting:1.2))`
6. **Technical Details**: `((visible canvas texture:1.2)), varnished surface`
7. **VAE Compensation**: `highly detailed, sharp focus, intricate textures`

**Negative Prompt Categories**:
- Subject Protection: `different person, changed identity`
- Style Exclusions: `photograph, digital art, 3d render`
- Quality Issues: `blurry, low quality, artifacts`

### 3. Smart Multi-Pass Processing

**Pass Configurations**:

#### Soft Impressionist (2-pass)
1. **Foundation** (denoising: 0.50, CFG: 5.0, steps: 30)
2. **Light Effects** (denoising: 0.15, CFG: 5.5, steps: 15)

#### Classic Portrait (3-pass)
1. **Foundation** (denoising: 0.40, CFG: 6.5, steps: 30)
2. **Enhancement** (denoising: 0.20, CFG: 6.0, steps: 20)
3. **Final Touch** (denoising: 0.15, CFG: 5.5, steps: 15)

#### Thick Textured (2-pass)
1. **Base Texture** (denoising: 0.45, CFG: 6.5, steps: 35)
2. **Texture Enhancement** (denoising: 0.25, CFG: 7.0, steps: 20)

### 4. LoRA Integration

**Downloaded Models** (in `/stable-diffusion-webui/models/Lora/`):
- `oil_painting_lora_v1.safetensors` - General oil painting enhancement
- `thick_paint_style.safetensors` - Impasto texture effects
- `classical_art_lora.safetensors` - Renaissance/baroque styles
- `impressionist_lora.safetensors` - Soft, luminous effects
- `brushstroke_detail.safetensors` - Enhanced brushwork detail

**Integration Method**:
```typescript
// LoRA prompt syntax
<lora:oil_painting_lora_v1:0.7>
```

### 5. Reinforcement Learning Integration

**RL Training Components**:

#### Large-Scale Training (`large_scale_rl_training.py`)
- Deep Q-Network (DQN) architecture
- 5000 image dataset capability
- SQLite results storage
- Experience replay buffer
- Automatic checkpoint saving

#### Multi-ControlNet RL (`rl_with_multicontrolnet.py`)
- Tests parameter combinations across:
  - ControlNet weight distributions
  - Pass configurations (1-3 passes)
  - LoRA combinations
  - CFG/denoising variations
- Quality scoring based on:
  - Multi-pass success rate
  - ControlNet utilization
  - Processing efficiency
  - Style-specific optimizations

## Key Findings from RL Training

### Optimal Parameters (from 511 conversions)
- **Best Style**: Soft Impressionist
- **Best CFG Scale**: 5.0 (surprisingly low)
- **Best Denoising**: 0.50
- **Best ControlNet Weight**: 0.85 for Canny
- **Success Rate**: 96.9%
- **Average Quality Score**: 0.774

### Counterintuitive Discoveries
1. **Lower CFG scales (5.0) outperform higher values (8.0)**
   - Traditional wisdom suggests 7-10 for quality
   - Our testing shows 5.0 gives best subject preservation

2. **Strong ControlNet weights (0.85) are crucial**
   - Higher than typical recommendations (0.5-0.7)
   - Essential for preventing subject transformation

3. **Multi-pass adds quality with minimal time cost**
   - 2-pass optimal for most styles
   - 3-pass only beneficial for classic portraits

## API Endpoints

### `/api/convert-enhanced` (POST)
**Parameters**:
- `image`: File upload
- `style`: Style ID (`soft_impressionist`, `classic_portrait`, `thick_textured`)
- `multiPass`: Boolean (default: true)
- `multiControlNet`: Boolean (default: true)

**Response**:
```json
{
  "success": true,
  "image": "data:image/png;base64,...",
  "styleUsed": "soft_impressionist",
  "processingType": "multi-pass",
  "passResults": [...],
  "controlNetsUsed": ["canny", "openpose", "depth"],
  "totalControlNets": 3
}
```

## File Structure

```
oil-painting-app/
├── app/
│   ├── api/
│   │   ├── convert-enhanced/      # Multi-ControlNet API
│   │   └── convert-v3/            # Two-stage API (legacy)
│   └── lib/
│       ├── oilPaintingStyles.ts   # RL-optimized styles
│       ├── oilPaintingStylesEnhanced.ts  # Hierarchical prompts
│       └── loraManager.ts         # LoRA management
├── rl_training/
│   ├── large_scale_rl_training.py # DQN training
│   ├── rl_with_multicontrolnet.py # Multi-ControlNet RL
│   └── rl_multicontrolnet.db      # Training results
└── setup_advanced_sd.sh           # ControlNet installer
```

## Setup Instructions

### 1. Install ControlNet Models
```bash
./setup_advanced_sd.sh
```

### 2. Download LoRA Models
```bash
./download_loras.sh
```

### 3. Start Services
```bash
# Terminal 1: SD WebUI
cd stable-diffusion-webui
./webui.sh --api --api-log --listen --cors-allow-origins="http://localhost:3000"

# Terminal 2: Next.js App
cd oil-painting-app
npm run dev
```

### 4. Run RL Training
```bash
cd rl_training
python3 rl_with_multicontrolnet.py
```

## Performance Metrics

- **Average Processing Time**: 45-120 seconds (multi-pass)
- **Success Rate**: 96.9% (after RL optimization)
- **Quality Score**: 0.774/1.0 average, 0.950/1.0 best
- **Memory Usage**: ~4-6GB VRAM per conversion

## Future Enhancements

1. **Adaptive ControlNet Selection**
   - Detect image content (portrait/landscape/pet)
   - Dynamically adjust ControlNet weights

2. **Custom LoRA Training**
   - Train style-specific LoRAs on curated datasets
   - Fine-tune for specific artists (Van Gogh, Monet, etc.)

3. **Inpainting Pipeline**
   - Selective region enhancement
   - Fix specific problem areas post-conversion

4. **Real-time Preview**
   - Low-resolution fast preview
   - Progressive quality enhancement

## Troubleshooting

### Common Issues

1. **"No ControlNet models available"**
   - Ensure models are in `/stable-diffusion-webui/models/ControlNet/`
   - Restart SD WebUI after adding models

2. **API Timeout Errors**
   - Reduce batch size in RL training
   - Increase timeout in API calls (current: 180s)

3. **Subject Transformation**
   - Increase Canny ControlNet weight (up to 0.85)
   - Add stronger subject preservation keywords

## Conclusion

This integration successfully combines multiple advanced SD techniques to achieve high-quality oil painting conversions while preserving subject identity. The RL training has provided counterintuitive insights that significantly improve results beyond traditional parameter recommendations.