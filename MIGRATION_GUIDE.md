# 🚀 Migration Guide

## Quick Start on New Machine

1. **Clone Repository**:
   ```bash
   git clone https://github.com/thetangstr/pixcarti.git
   cd pixcarti/oil-painting-app
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start Application**:
   ```bash
   npm run dev
   ```

4. **Access URLs**:
   - Main app: http://localhost:3000
   - ComfyUI evaluation: http://localhost:3000/comfyui-evaluation

## What's Included

✅ Real pet photos (Golden Retriever, Persian Cat)
✅ Processed art in 3 styles (Classic Oil, Monet, Van Gogh)  
✅ Complete evaluation interface
✅ All documentation and setup guides

## Optional: ComfyUI Setup (for new processing)

Only needed if you want to process NEW images:

```bash
# Install ComfyUI
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI
pip install -r requirements.txt

# Download model
wget https://huggingface.co/runwayml/stable-diffusion-v1-5/resolve/main/v1-5-pruned-emaonly.safetensors -P models/checkpoints/

# Start ComfyUI
python main.py --listen 127.0.0.1 --port 8188
```

## Project Structure

```
oil-painting-app/
├── app/                    # Next.js app
├── public/real-pet-art/    # Processed pet artwork
├── comfyui_evaluation_results/ # Evaluation data
├── scripts/                # Essential processing scripts
└── docs/                   # Documentation
```

## Ready Features

- Pet portrait evaluation system
- 3 artistic style conversions
- Star rating interface  
- Progress tracking
- Analytics integration

The project is ready to run immediately after `npm install`! 🎨
