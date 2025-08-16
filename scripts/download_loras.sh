#!/bin/bash

echo "🎨 Downloading Oil Painting LoRAs from Civitai"
echo "=============================================="

# LoRA models directory
LORA_DIR="/Users/Kailor/Desktop/Projects/pixcart_v2/stable-diffusion-webui/models/Lora"
cd "$LORA_DIR"

echo "📦 Checking existing LoRA models..."
ls -la *.safetensors 2>/dev/null || echo "No LoRA models found yet"

echo ""
echo "📥 Downloading recommended oil painting LoRAs..."
echo "Note: These are smaller files (~100-200MB each)"

# Oil Painting Style by EndlessReality (highly rated)
if [ ! -f "oil_painting_lora_v1.safetensors" ]; then
    echo "Downloading Oil Painting LoRA v1..."
    curl -L --progress-bar -o oil_painting_lora_v1.safetensors \
        "https://civitai.com/api/download/models/77165"
else
    echo "✓ Oil Painting LoRA v1 already exists"
fi

# Thick Paint Style LoRA
if [ ! -f "thick_paint_style.safetensors" ]; then
    echo "Downloading Thick Paint Style LoRA..."
    curl -L --progress-bar -o thick_paint_style.safetensors \
        "https://civitai.com/api/download/models/102907"
else
    echo "✓ Thick Paint Style LoRA already exists"
fi

# Classical Art Style
if [ ! -f "classical_art_lora.safetensors" ]; then
    echo "Downloading Classical Art LoRA..."
    curl -L --progress-bar -o classical_art_lora.safetensors \
        "https://civitai.com/api/download/models/90854"
else
    echo "✓ Classical Art LoRA already exists"
fi

# Impressionist Style
if [ ! -f "impressionist_lora.safetensors" ]; then
    echo "Downloading Impressionist LoRA..."
    curl -L --progress-bar -o impressionist_lora.safetensors \
        "https://civitai.com/api/download/models/94570"
else
    echo "✓ Impressionist LoRA already exists"
fi

# Brushstroke Detail LoRA
if [ ! -f "brushstroke_detail.safetensors" ]; then
    echo "Downloading Brushstroke Detail LoRA..."
    curl -L --progress-bar -o brushstroke_detail.safetensors \
        "https://civitai.com/api/download/models/103199"
else
    echo "✓ Brushstroke Detail LoRA already exists"
fi

echo ""
echo "✅ LoRA downloads complete!"
echo ""
echo "📝 Models installed:"
ls -lh *.safetensors | awk '{print "  - " $9 " (" $5 ")"}'