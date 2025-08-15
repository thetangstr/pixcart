# Reinforcement Learning Training System for Oil Painting Optimization

This comprehensive RL training system optimizes oil painting conversion parameters using 500 diverse pet photos to achieve 95%+ success rate with consistent, high-quality results.

## 🎯 Overview

The system uses reinforcement learning to automatically discover optimal parameters for:
- **Denoising strength** (0.3-0.8)
- **CFG scale** (4.0-15.0) 
- **Sampling steps** (20-60)
- **ControlNet weights** (0.3-1.0)
- **Sampler selection** (5 different samplers)
- **Style-specific prompt refinements**

## 🏗️ System Architecture

### Core Components

1. **Dataset Acquisition** (`dataset_acquisition.py`)
   - Downloads 500 diverse cat/dog photos from Unsplash/Pexels
   - Ensures balanced diversity (lighting, poses, colors, breeds)
   - Creates training/test splits

2. **RL Parameter Optimizer** (`rl_optimizer.py`)
   - Q-learning agent for each style
   - Experience replay and exploration strategies
   - Converges on optimal parameter combinations

3. **Vision-based Evaluator** (`vision_evaluator.py`)
   - Computer vision analysis of conversion quality
   - Subject preservation scoring
   - Oil painting authenticity assessment
   - Style distinctiveness measurement

4. **Human Evaluation System** (`human_evaluation.py`)
   - Collects human feedback for ground truth
   - Calibrates automated metrics
   - Provides confidence-weighted scoring

5. **Parameter Explorer** (`parameter_explorer.py`)
   - Advanced exploration strategies (Gaussian Process, Differential Evolution)
   - Bayesian optimization for efficient search
   - Parameter sensitivity analysis

6. **Training Pipeline** (`training_pipeline.py`)
   - Orchestrates complete training process
   - Batch processing with progress tracking
   - Resource monitoring and optimization

7. **Metrics & Reporting** (`metrics_reporter.py`)
   - Comprehensive performance tracking
   - Training visualizations and analytics
   - HTML report generation

8. **Deployment System** (`deploy_optimized_params.py`)
   - Safely deploys optimized parameters
   - Automatic backup and rollback
   - API testing and validation

## 🚀 Quick Start

### Prerequisites

1. **Environment Setup**
   ```bash
   cd /Users/Kailor/Desktop/Projects/pixcart_v2/oil-painting-app
   pip install -r rl_training/requirements.txt
   ```

2. **API Keys (Optional)**
   ```bash
   export UNSPLASH_ACCESS_KEY="your_unsplash_key"
   export PEXELS_API_KEY="your_pexels_key"
   export OPENAI_API_KEY="your_openai_key"  # For GPT-4V evaluation
   ```

3. **Stable Diffusion API**
   - Ensure your Stable Diffusion WebUI is running on `http://localhost:7860`
   - ControlNet extension must be installed

### Running Training

#### Full Training Pipeline
```bash
cd rl_training
python run_rl_training.py --mode full
```

#### Quick Parameter Exploration
```bash
python run_rl_training.py --mode explore --style classic_portrait --iterations 20
```

#### Deploy Optimized Parameters
```bash
python run_rl_training.py --mode deploy
```

## 📊 Training Process

### Phase 1: Dataset Acquisition (10-30 minutes)
- Downloads 250 cat photos + 250 dog photos
- Analyzes for diversity metrics
- Creates balanced training batches
- **Output**: `training_data/` with metadata

### Phase 2: RL Training (2-8 hours)
- Trains Q-learning agents for each style
- 100 episodes per style with 10 steps each
- Tests ~3000 parameter combinations
- **Output**: Optimized parameters in `rl_training/results/`

### Phase 3: Evaluation & Deployment (5-15 minutes)
- Final evaluation on test set
- Generates comprehensive report
- Optionally deploys to production
- **Output**: Performance reports and deployment

## 🎨 Style Optimization

The system optimizes three distinct styles:

### Classic Portrait
- **Target**: Renaissance-style smooth, refined paintings
- **Focus**: Balanced realism with painterly effects
- **Key Parameters**: Moderate denoising (0.6-0.7), controlled texture

### Thick & Textured
- **Target**: Van Gogh-style bold, visible brushstrokes
- **Focus**: Maximum painterly texture and energy
- **Key Parameters**: Lower denoising (0.5-0.6), high texture emphasis

### Soft & Dreamy
- **Target**: Monet-style impressionist, gentle effects
- **Focus**: Soft edges with atmospheric quality
- **Key Parameters**: Lower denoising (0.45-0.55), balanced blending

## 📈 Evaluation Metrics

### Automated Metrics
- **Subject Preservation** (0-1): Is the animal still recognizable?
- **Oil Painting Authenticity** (0-1): Does it look like real oil painting?
- **Style Distinctiveness** (0-1): Is the style clearly visible?
- **Processing Time**: Efficiency measurement
- **Consistency**: Performance across diverse images

### Human Evaluation (Optional)
- 5-point Likert scales for each metric
- Confidence weighting
- Expert vs. novice evaluator tracking
- Ground truth calibration for automated metrics

## 🔧 Configuration

### Training Configuration (`config.json`)
```json
{
  "dataset": {
    "total_images": 500,
    "train_test_split": 0.9,
    "batch_size": 20
  },
  "training": {
    "episodes_per_style": 100,
    "target_success_rate": 0.95,
    "convergence_threshold": 0.05
  },
  "evaluation": {
    "human_evaluation_frequency": 20,
    "automated_evaluation_only": true
  },
  "system": {
    "max_concurrent_conversions": 3,
    "memory_limit_gb": 8.0
  }
}
```

### Parameter Ranges
```python
{
    "denoising_strength": (0.3, 0.8),
    "cfg_scale": (4.0, 15.0), 
    "steps": (20, 60),
    "controlnet_weight": (0.3, 1.0),
    "samplers": ["DPM++ 2M Karras", "Euler a", "DPM++ SDE Karras", "DDIM", "UniPC"]
}
```

## 📊 Expected Results

### Success Criteria
- **95%+ conversion success rate**
- **0.85+ average quality score**
- **Consistent results across diverse images**
- **<60 second average processing time**

### Typical Improvements
- **Subject Preservation**: 15-25% improvement
- **Oil Painting Authenticity**: 20-30% improvement  
- **Style Distinctiveness**: 10-20% improvement
- **Processing Efficiency**: 10-15% faster

## 🔄 Monitoring & Debugging

### Real-time Monitoring
```bash
# Watch training progress
tail -f rl_training/training_orchestrator.log

# Monitor system resources
htop  # CPU/Memory usage

# Check API status
curl http://localhost:7860/docs
```

### Progress Visualization
- Training curves: `rl_training/results/training_progress.png`
- Style comparison: `rl_training/results/style_comparison.png`
- Parameter landscapes: `rl_training/exploration/parameter_landscape_*.png`

### Common Issues

**Training Stalls**
- Check API connectivity: `curl http://localhost:7860/docs`
- Verify GPU memory: reduce `max_concurrent_conversions`
- Check disk space: requires ~5GB for full training

**Poor Convergence**
- Increase `episodes_per_style` (try 150-200)
- Adjust exploration rate in `rl_optimizer.py`
- Review parameter ranges for your specific model

**Memory Issues**
- Reduce `batch_size` to 10-15
- Lower `max_concurrent_conversions` to 2
- Increase `memory_limit_gb` threshold

## 📁 Output Structure

```
rl_training/
├── results/
│   ├── optimized_parameters.json     # Final optimized parameters
│   ├── training_results_*.json       # Complete training results
│   ├── training_progress.png         # Training visualization
│   └── final_results_*.json         # Session summaries
├── models/
│   ├── rl_agent_classic_portrait.pkl # Trained RL models
│   ├── rl_agent_thick_textured.pkl
│   └── rl_agent_soft_impressionist.pkl
├── reports/
│   ├── report_*.html                 # Performance reports
│   └── *_plots/                      # Visualization plots
├── exploration/
│   ├── exploration_history.json     # Parameter exploration data
│   ├── exploration_analysis.png     # Parameter correlations
│   └── parameter_landscape_*.png    # 3D parameter visualizations
└── backups/
    └── parameters_backup_*.json     # Parameter backups
```

## 🔄 Integration with Production

### Automatic Deployment
The system can automatically deploy optimized parameters:

```bash
python deploy_optimized_params.py \
  --source rl_training/results/optimized_parameters.json \
  --test-image test-portrait.jpg
```

### Manual Integration
1. **Backup Current Parameters**
   ```bash
   cp app/lib/oilPaintingStyles.ts app/lib/oilPaintingStyles.ts.backup
   ```

2. **Apply Optimized Parameters**
   - Use the deployment script or manually update `oilPaintingStyles.ts`
   - Parameters are applied to `denoising_strength`, `cfg_scale`, `steps`, `sampler`

3. **Test & Validate**
   - Run API tests with sample images
   - Monitor conversion quality
   - Rollback if issues detected

## 🧪 Advanced Usage

### Custom Exploration Strategies
```python
from parameter_explorer import ParameterExplorer

explorer = ParameterExplorer("gaussian_process")  # or "differential_evolution"
suggestions = explorer.suggest_exploration_points("classic_portrait", count=10)
```

### Human Evaluation Integration
```python
from human_evaluation import HumanEvaluationInterface

interface = HumanEvaluationInterface()
session_id = interface.start_evaluation_session("expert_evaluator")
rating = interface.evaluate_conversion("conversion_123", "expert_evaluator")
```

### Custom Metrics
```python
from metrics_reporter import MetricsCollector

collector = MetricsCollector()
collector.record_metric("custom_quality_score", 0.87, 
                        context={"style_id": "classic_portrait"})
```

## 🎯 Performance Tuning

### For Faster Training
- Use fewer images: `total_images: 200`
- Reduce episodes: `episodes_per_style: 50`
- Enable parallel processing: `max_concurrent_conversions: 5`

### For Better Quality
- Increase dataset size: `total_images: 1000`
- More episodes: `episodes_per_style: 200`
- Enable human evaluation: `automated_evaluation_only: false`

### For Memory-Constrained Systems
- Smaller batches: `batch_size: 10`
- Lower concurrency: `max_concurrent_conversions: 2`
- Reduce memory limit: `memory_limit_gb: 4.0`

## 🔬 Research & Analysis

### Parameter Sensitivity Analysis
The system automatically analyzes which parameters have the most impact on quality:

```python
from parameter_explorer import ParameterExplorer
explorer = ParameterExplorer()
sensitivity = explorer.analyze_parameter_sensitivity("classic_portrait")
```

### Style Comparison
Compare optimization effectiveness across styles:

```python
from metrics_reporter import PerformanceAnalyzer
analyzer = PerformanceAnalyzer()
comparison = analyzer.compare_styles()
```

### Learning Curve Analysis
Track training efficiency and convergence:

```python
progress = analyzer.analyze_training_progress("classic_portrait")
print(f"Convergence status: {progress['convergence_analysis']['status']}")
print(f"Learning efficiency: {progress['learning_curve']['efficiency_score']}")
```

## 🛠️ Troubleshooting

### API Connection Issues
```bash
# Test Stable Diffusion API
curl -X GET http://localhost:7860/docs

# Test Next.js API
curl -X GET http://localhost:3000/api/health
```

### Training Not Converging
1. Check parameter ranges are appropriate for your model
2. Increase exploration episodes
3. Review evaluation metrics for bias
4. Consider different exploration strategy

### Memory/Performance Issues  
1. Monitor system resources during training
2. Adjust batch sizes and concurrency
3. Use parameter space exploration first
4. Consider distributed training setup

### Quality Issues
1. Verify ControlNet is properly installed
2. Check image quality in training dataset
3. Review evaluation metric calibration
4. Enable human evaluation for validation

## 📞 Support

For issues and questions:
1. Check the logs: `rl_training/training_orchestrator.log`
2. Review configuration: `config.json`
3. Run diagnostics: `python run_rl_training.py --mode explore --iterations 5`
4. Enable debug logging in the configuration

---

## 🏆 Expected Timeline

- **Setup**: 15 minutes
- **Dataset Acquisition**: 30 minutes  
- **RL Training**: 3-6 hours
- **Evaluation & Reporting**: 15 minutes
- **Deployment**: 5 minutes

**Total**: 4-7 hours for complete optimization

The system is designed to run autonomously and achieve 95%+ success rate with minimal intervention. Results are automatically validated and deployed with safety checks and rollback capabilities.