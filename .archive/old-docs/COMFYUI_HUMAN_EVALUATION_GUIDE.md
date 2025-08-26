# ComfyUI Human Evaluation System 🎨

Complete system for evaluating ComfyUI oil painting results with 3 styles across 50 photos and human evaluation interface.

## 🚀 Quick Start

### 1. Setup ComfyUI (Choose One Option)

**Option A: Docker (Recommended)**
```bash
# Run ComfyUI with Docker
docker run -it --rm -p 8188:8188 yanwk/comfyui-boot:latest
```

**Option B: Local Installation**
```bash
# Install ComfyUI
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI && pip install -r requirements.txt

# Download base model
wget https://huggingface.co/runwayml/stable-diffusion-v1-5/resolve/main/v1-5-pruned-emaonly.safetensors
mv v1-5-pruned-emaonly.safetensors models/checkpoints/

# Start ComfyUI
python main.py --listen 127.0.0.1 --port 8188
```

### 2. Run Batch Processing

```bash
# Process 50 photos with 3 styles (150 total conversions)
python scripts/comfyui_batch_convert.py
```

### 3. Access Human Evaluation Interface

Visit: **http://localhost:3001/comfyui-evaluation**

## 📊 Evaluation System Features

### 🎯 Three Oil Painting Styles

1. **Classic Portrait** - Smooth, refined Renaissance-style brushwork
2. **Soft Impressionist** - Dreamy, ethereal impressionist technique  
3. **Thick Textured** - Heavy impasto with visible brushstrokes

### 📝 Evaluation Criteria

For each style conversion, evaluate:
- **Preservation** (1-5 stars) - How well original subject/composition is preserved
- **Artistic Quality** (1-5 stars) - Quality of oil painting effect and brushwork
- **Overall Satisfaction** (1-5 stars) - Overall appeal and success of conversion

### 🔄 Two Evaluation Modes

1. **Single Backend Mode** - Evaluate ComfyUI results independently
2. **Comparison Mode** - Direct A1111 vs ComfyUI side-by-side comparison

## 📁 File Structure

```
oil-painting-app/
├── scripts/
│   ├── comfyui_batch_convert.py      # Main batch processing script
│   └── setup_comfyui_evaluation.py   # Setup environment
├── app/
│   ├── comfyui-evaluation/           # Human evaluation interface
│   └── api/
│       ├── load-comfyui-evaluation/  # Load evaluation dataset
│       └── submit-comfyui-evaluation/ # Submit evaluations
├── comfyui_evaluation_results/       # Output directory
│   ├── comfyui_evaluation_dataset.json
│   ├── human_evaluations/            # Submitted evaluations
│   └── evaluation_summary.json      # Aggregated statistics
└── test_images_comfyui/             # Input test images
```

## 🎨 ComfyUI Style Configurations

### Classic Portrait
```python
{
    "positive_prompt": "oil painting, classical renaissance style, smooth brushwork, refined details, warm lighting, professional portrait style, artistic masterpiece, high quality, detailed",
    "steps": 30,
    "cfg": 6.5,
    "denoise": 0.65,
    "sampler": "DPM++ 2M Karras"
}
```

### Soft Impressionist
```python
{
    "positive_prompt": "oil painting, impressionist style, soft brushstrokes, dreamy atmosphere, gentle colors, artistic interpretation, painterly effect, luminous, ethereal",
    "steps": 28,
    "cfg": 7.0,
    "denoise": 0.70,
    "sampler": "Euler a"
}
```

### Thick Textured
```python
{
    "positive_prompt": "oil painting, heavy impasto technique, thick visible brushstrokes, textured paint, bold artistic style, expressive, palette knife work, chunky paint application",
    "steps": 35,
    "cfg": 8.0,
    "denoise": 0.75,
    "sampler": "DPM++ SDE Karras"
}
```

## 📈 Usage Workflow

### Step 1: Batch Processing
1. Ensure ComfyUI is running on port 8188
2. Run `python scripts/comfyui_batch_convert.py`
3. Script will:
   - Process 50 photos × 3 styles = 150 conversions
   - Save results to `comfyui_evaluation_results/`
   - Create evaluation dataset JSON
   - Monitor progress with WebSocket connection

### Step 2: Human Evaluation
1. Navigate to `/comfyui-evaluation` in the web app
2. Choose evaluation mode (single backend or comparison)
3. For each task, rate:
   - Subject preservation (1-5 stars)
   - Artistic quality (1-5 stars)
   - Overall satisfaction (1-5 stars)
4. Add optional comments
5. Submit and proceed to next task

### Step 3: Analysis
- View aggregated results in `evaluation_summary.json`
- Individual evaluations saved in `human_evaluations/`
- Compare A1111 vs ComfyUI performance metrics
- Analyze style-specific performance

## 📊 Expected Performance Metrics

### ComfyUI Advantages:
- **Speed**: ~2-4 seconds faster per conversion
- **Memory Efficiency**: Better GPU memory management
- **Workflow Flexibility**: Node-based customization

### A1111 Advantages:
- **Stability**: More consistent results
- **Extensions**: Wider ecosystem
- **ControlNet**: Better preservation features

## 🔧 Troubleshooting

### ComfyUI Not Starting
```bash
# Check if port is available
lsof -i :8188

# Use Docker if local installation fails
docker run -it --rm -p 8188:8188 yanwk/comfyui-boot:latest
```

### Batch Processing Issues
```bash
# Check ComfyUI connection
curl http://localhost:8188/system_stats

# Monitor processing logs
tail -f comfyui_evaluation_results/*.log
```

### Evaluation Interface Issues
- Ensure Next.js dev server is running: `npm run dev`
- Check API endpoints are accessible
- Verify evaluation dataset exists

## 📋 Evaluation Guidelines

### Rating Scale:
- **5 Stars**: Excellent - Professional quality, perfect preservation
- **4 Stars**: Good - High quality with minor issues
- **3 Stars**: Average - Acceptable quality, some issues
- **2 Stars**: Poor - Significant quality or preservation problems
- **1 Star**: Failed - Major artifacts or complete failure

### What to Look For:
- **Preservation**: Face recognition, pose, composition, key details
- **Artistic Quality**: Brushwork texture, color harmony, oil painting realism
- **Overall**: Would you be satisfied with this as a final result?

## 📊 Data Collection Goals

- **150 total conversions** (50 images × 3 styles)
- **Human evaluation** of all results
- **Performance comparison** between A1111 and ComfyUI
- **Style-specific insights** for each oil painting technique
- **Processing time analysis** for efficiency comparison

## 🎯 Success Metrics

- **Completion Rate**: % of successful conversions
- **Average Scores**: Mean ratings across all criteria
- **Style Performance**: Which styles work best with ComfyUI
- **Speed Comparison**: ComfyUI vs A1111 processing times
- **User Preference**: Backend preference in comparison mode

## 🚀 Next Steps After Evaluation

1. **Analyze Results**: Compare ComfyUI vs A1111 performance
2. **Optimize Parameters**: Fine-tune based on evaluation feedback
3. **Production Integration**: Deploy winning configurations
4. **Extended Testing**: Scale to larger image sets
5. **User Interface**: Integrate best-performing backend as default

---

**Ready to Start?** Run `python scripts/setup_comfyui_evaluation.py` to begin! 🎨