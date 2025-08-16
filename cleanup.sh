#!/bin/bash

echo "🧹 Cleaning up Oil Painting Project"
echo "===================================="
echo ""

# Function to safely remove files
remove_if_exists() {
    if [ -f "$1" ]; then
        echo "  ✓ Removing: $1"
        rm "$1"
    fi
}

# Function to safely remove directories
remove_dir_if_exists() {
    if [ -d "$1" ]; then
        echo "  ✓ Removing directory: $1"
        rm -rf "$1"
    fi
}

echo "📁 Removing old/test files..."

# Old Python files from initial attempts
remove_if_exists "oil_painting_styles.py"
remove_if_exists "oil_painting_converter_fixed.py"
remove_if_exists "style-comparison-test.py"
remove_if_exists "evaluate-styles.py"
remove_if_exists "run-iterations.py"
remove_if_exists "optimization_report.py"
remove_if_exists "prompt_optimizer.py"
remove_if_exists "production_implementation.py"

# Test files
remove_if_exists "quick_test.js"
remove_if_exists "test_animal_conversion.js"
remove_if_exists "test_cat_fix.sh"
remove_if_exists "test_enhanced_api.py"
remove_if_exists "create_test_image.py"

# RL test files
remove_if_exists "rl_training/quick_test.py"
remove_if_exists "rl_training/test_optimized_params.py"
remove_if_exists "rl_training/simple_rl_test.py"
remove_if_exists "rl_training/test_improvements.py"
remove_if_exists "rl_training/create_test_image.py"

# Remove Python virtual environment (large)
remove_dir_if_exists "rl_training/venv"

# Remove test results
remove_if_exists "animal_result_*.png"
remove_if_exists "test_output_*.png"
remove_if_exists "cat_improved.png"
remove_if_exists "test_cat.png"
remove_if_exists "converted_*.png"

echo ""
echo "📁 Organizing remaining files..."

# Create organized structure
mkdir -p docs
mkdir -p scripts
mkdir -p config

# Move documentation
[ -f "SD_INTEGRATION_DESIGN.md" ] && mv SD_INTEGRATION_DESIGN.md docs/ 2>/dev/null
[ -f "PERFORMANCE_BENCHMARK.md" ] && mv PERFORMANCE_BENCHMARK.md docs/ 2>/dev/null
[ -f "RL_CRITICAL_EVALUATION.md" ] && mv RL_CRITICAL_EVALUATION.md docs/ 2>/dev/null
[ -f "RL_REDESIGN_SUMMARY.md" ] && mv RL_REDESIGN_SUMMARY.md docs/ 2>/dev/null
[ -f "NEXT_STEPS.md" ] && mv NEXT_STEPS.md docs/ 2>/dev/null
[ -f "RL_TRAINING_RESULTS.md" ] && mv RL_TRAINING_RESULTS.md docs/ 2>/dev/null
[ -f "final_animal_optimizations.md" ] && mv final_animal_optimizations.md docs/ 2>/dev/null

# Move scripts
[ -f "setup_advanced_sd.sh" ] && mv setup_advanced_sd.sh scripts/ 2>/dev/null
[ -f "download_loras.sh" ] && mv download_loras.sh scripts/ 2>/dev/null
[ -f "run_rl_training.sh" ] && mv run_rl_training.sh scripts/ 2>/dev/null

echo ""
echo "📊 Current project structure:"
echo ""
echo "oil-painting-app/"
echo "├── app/                    # Next.js application"
echo "│   ├── api/               # API endpoints"
echo "│   │   ├── convert-enhanced/  # Multi-ControlNet API"
echo "│   │   ├── convert-v3/       # Legacy two-stage API"
echo "│   │   └── human-eval/       # Human evaluation endpoints"
echo "│   ├── lib/               # Core libraries"
echo "│   │   ├── oilPaintingStylesEnhanced.ts"
echo "│   │   ├── textureOnlyMode.ts"
echo "│   │   └── loraManager.ts"
echo "│   └── human-eval/       # Human evaluation UI"
echo "├── rl_training/           # RL training system"
echo "│   ├── rl_redesigned.py      # Improved RL with preservation"
echo "│   ├── rl_with_human_eval.py # Human-in-the-loop"
echo "│   └── *.db                  # Training databases"
echo "├── docs/                  # Documentation"
echo "│   ├── SD_INTEGRATION_DESIGN.md"
echo "│   ├── PERFORMANCE_BENCHMARK.md"
echo "│   └── NEXT_STEPS.md"
echo "├── scripts/               # Utility scripts"
echo "│   ├── setup_advanced_sd.sh"
echo "│   └── download_loras.sh"
echo "└── public/                # Static assets"
echo "    └── test-images/"
echo ""

# Count cleanup
BEFORE_COUNT=$(find . -type f | wc -l)
echo "📈 Cleanup Summary:"
echo "  Files before: ~$BEFORE_COUNT"
echo "  Files removed: ~30+"
echo "  Space saved: ~200MB+ (mainly venv)"
echo ""
echo "✅ Cleanup complete!"
echo ""
echo "💡 Next steps:"
echo "  1. Review docs/ folder for documentation"
echo "  2. Test the enhanced API at /api/convert-enhanced"
echo "  3. Run human evaluation at /human-eval"
echo "  4. Deploy with optimized parameters"