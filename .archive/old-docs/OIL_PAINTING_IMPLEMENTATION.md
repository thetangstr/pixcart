# Oil Painting Workflow Implementation

## Overview

The ComfyUI oil painting workflow has been redesigned based on the expert guide in `/Volumes/home/Projects_Hosted/pixcart_v2/doc/SD.md`. The implementation now includes sophisticated prompt engineering, intelligent model selection, and optimized denoising strategies for different artistic styles.

## Key Improvements Implemented

### 1. **Method 1: Simple Img2Img with LoRA**
- Automatic detection and loading of oil painting LoRAs
- Denoising strength optimized for style (0.55-0.8 range)
- Enhanced prompts with oil painting trigger words
- Support for chaining multiple LoRAs

### 2. **Method 2: Advanced with ControlNet**
- Intelligent ControlNet selection based on style and subject
- Multiple preprocessor support (Canny, Depth, LineArt)
- Higher denoising allowed with ControlNet (0.8-1.0)
- Adaptive strength based on content type

### 3. **Enhanced Prompt Engineering**
- Automatic addition of artist names (Van Gogh, Monet, Rembrandt)
- Technique keywords (impasto, palette knife, textured brushstrokes)
- Style keywords (impressionism, expressionism, baroque)
- Intelligent prompt enhancement based on style intensity

### 4. **Style-Specific Configurations**

| Style | Denoising Range | ControlNet | Key Artists |
|-------|----------------|------------|-------------|
| Classical Portrait | 0.55-0.65 | Canny (0.75) | Rembrandt, Vermeer |
| Impressionist | 0.65-0.75 | Depth (0.60) | Monet, Renoir |
| Expressionist | 0.75-0.85 | Depth (0.50) | Van Gogh, Munch |
| Baroque | 0.55-0.65 | Canny (0.70) | Caravaggio, Rubens |
| Romantic Landscape | 0.65-0.75 | Depth (0.50) | Turner, Friedrich |
| Portrait Master | 0.50-0.60 | Canny (0.80) | Sargent, Zorn |
| Abstract | 0.80-0.95 | None | Pollock, de Kooning |

## Files Created/Modified

### Core Implementation
- `/app/lib/comfyui-client.ts` - Main workflow creation with enhanced methods
- `/app/lib/comfyui-styles-sdxl.ts` - Optimized SDXL style configurations
- `/app/lib/comfyui-styles.ts` - Updated SD 1.5 style configurations
- `/app/lib/comfyui-oil-painting-utils.ts` - New utilities for intelligent style selection

### API & Testing
- `/app/api/styles/route.ts` - API endpoint for available styles
- `/test-oil-painting-workflow.ts` - Comprehensive test suite

## Key Features

### Intelligent LoRA Detection
The system automatically searches for oil painting LoRAs using keywords:
- oil_painting, oilpainting, oil-painting
- impasto, impressionism, impressionist
- painterly, brushstroke
- Artist names (vangogh, monet, rembrandt)

### Adaptive Configuration
- Automatically adjusts parameters when switching between SD 1.5 and SDXL
- Falls back gracefully when models are missing
- Enhances prompts to compensate for missing LoRAs

### Style Intelligence
- Calculates optimal denoising based on style and ControlNet usage
- Selects appropriate preprocessor for each artistic style
- Adjusts strength parameters for portrait preservation

## Workflow Node Structure

### Basic Workflow (8 nodes)
1. CheckpointLoaderSimple
2. LoadImage
3. CLIPTextEncode (Positive)
4. CLIPTextEncode (Negative)
5. VAEEncode
6. KSampler
7. VAEDecode
8. SaveImage

### With LoRA (10 nodes)
- Adds: LoraLoader (can chain multiple)

### With ControlNet (12+ nodes)
- Adds: ControlNetLoader, Preprocessor, ControlNetApply, PreviewImage

### With Upscaling (14+ nodes)
- Adds: UpscaleModelLoader, ImageUpscaleWithModel

## Usage Example

```typescript
import { comfyUIClient } from './app/lib/comfyui-client'
import { createOptimizedStyleConfig } from './app/lib/comfyui-oil-painting-utils'

// Create optimized config for Van Gogh style
const config = createOptimizedStyleConfig(
  'expressionist',  // Style
  'sd_xl_base_1.0_0.9vae.safetensors',  // Checkpoint
  availableLoRAs,  // Available LoRAs
  availableControlNets,  // Available ControlNets
  'portrait'  // Subject type
)

// Convert image
const result = await comfyUIClient.convertImage(imageBase64, config)
```

## Testing

Run the test suite to validate the implementation:
```bash
npx tsx test-oil-painting-workflow.ts
```

## Performance Optimizations

1. **Denoising Strategy**: Lower values for portraits (0.55-0.65), higher for expressive styles (0.75-0.85)
2. **ControlNet Usage**: Canny for sharp details (portraits), Depth for soft painterly effects (landscapes)
3. **Steps Optimization**: 30-35 steps for most styles, 40-45 for detailed portraits
4. **CFG Scale**: 6.0-7.5 for portraits, 7.5-8.5 for expressive styles

## Future Enhancements

- [ ] Add support for custom VAE models for better color accuracy
- [ ] Implement batch processing for multiple images
- [ ] Add style mixing capabilities
- [ ] Create preset combinations for specific use cases
- [ ] Add real-time preview with progressive rendering