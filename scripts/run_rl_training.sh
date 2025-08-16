#!/bin/bash

echo "🎨 Oil Painting RL Training with Multi-ControlNet"
echo "=================================================="
echo ""

# Check if SD WebUI is running
if ! curl -s http://localhost:7860/sdapi/v1/progress > /dev/null; then
    echo "❌ Stable Diffusion WebUI is not running!"
    echo "   Please start it with: ./webui.sh --api --api-log --listen --cors-allow-origins=\"http://localhost:3000\""
    exit 1
fi

# Check if Next.js is running
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "❌ Next.js app is not running!"
    echo "   Please start it with: npm run dev"
    exit 1
fi

echo "✅ Services are running"
echo ""

# Check ControlNet models
echo "📦 Checking ControlNet models..."
python3 -c "
import requests
r = requests.get('http://localhost:7860/controlnet/model_list')
models = r.json().get('model_list', [])
print(f'Found {len(models)} ControlNet models:')
for m in models[:5]:
    print(f'  - {m}')
"

echo ""
echo "📦 Checking LoRA models..."
python3 -c "
import requests
r = requests.get('http://localhost:7860/sdapi/v1/loras')
loras = r.json()
print(f'Found {len(loras)} LoRA models')
"

echo ""
echo "🚀 Starting RL Training..."
echo "This will test multiple parameter combinations to find optimal settings."
echo ""

cd rl_training

# Create a small focused training run
python3 << 'EOF'
import sys
sys.path.append('.')
from rl_with_multicontrolnet import MultiControlNetRLTrainer
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)

# Quick focused training
trainer = MultiControlNetRLTrainer()

# Create simple test if needed
test_dir = Path('../public/test-images')
test_images = list(test_dir.glob('*.jpg')) + list(test_dir.glob('*.png'))

if test_images:
    print(f"\n📷 Using {len(test_images)} test images")
    
    # Run focused training on best known parameters
    print("\n🎯 Testing focused parameter set based on previous RL findings...")
    
    from rl_with_multicontrolnet import EnhancedParameters
    
    # Test the RL-optimized parameters
    best_params = EnhancedParameters(
        style='soft_impressionist',
        cfg_scale=5.0,
        denoising_strength=0.50,
        steps=30,
        controlnet_weights={'canny': 0.85, 'openpose': 0.45, 'depth': 0.35},
        lora_weights={},
        use_multi_pass=True,
        pass_configs=[
            {'name': 'initial', 'denoising': 0.50, 'cfg': 5.0, 'steps': 30},
            {'name': 'refine', 'denoising': 0.15, 'cfg': 5.5, 'steps': 15}
        ]
    )
    
    # Test on first image
    result_image, quality_score, processing_time = trainer.convert_with_multicontrolnet(
        str(test_images[0]), best_params
    )
    
    print(f"\n📊 Results:")
    print(f"   Quality Score: {quality_score:.3f}")
    print(f"   Processing Time: {processing_time:.1f}s")
    print(f"   Success: {'✅' if result_image else '❌'}")
    
    # Run mini training session (10 iterations)
    print("\n🔄 Running 10 iteration mini-training...")
    best_params, best_score = trainer.train(
        test_images=[str(p) for p in test_images],
        max_iterations=10
    )
    
    print(f"\n✨ Training Complete!")
    print(f"   Best Score: {best_score:.3f}")
    
else:
    print("❌ No test images found!")
    print("   Creating a test image...")
    import subprocess
    subprocess.run(['python3', '../create_test_image.py'])
    print("   Please run this script again.")
EOF

echo ""
echo "🎉 RL Training Session Complete!"
echo ""
echo "📊 Check the following files for results:"
echo "   - rl_multicontrolnet.db (SQLite database)"
echo "   - rl_multicontrolnet.log (Training log)"
echo "   - rl_training_report_*.md (Generated reports)"
echo ""
echo "💡 Next Steps:"
echo "   1. Review the training report"
echo "   2. Update parameters in oilPaintingStylesEnhanced.ts"
echo "   3. Run larger training session with more images"
echo "   4. Test with real user photos"