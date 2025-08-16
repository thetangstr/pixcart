
# Multi-ControlNet RL Training Report
Session: 20250815_145040

## Overall Statistics
- Total Iterations: 5
- Average Quality Score: 0.873
- Best Quality Score: 0.967
- Average Processing Time: 84.7s
- Success Rate: 100.0%

## Best Configuration
- Style: soft_impressionist
- CFG Scale: 5.0
- Denoising Strength: 0.5
- Steps: 30
- ControlNet Config: {"canny": 0.85, "openpose": 0.45, "depth": 0.35}
- Multi-Pass: 1
- Pass Details: [{"pass": "Soft Foundation", "success": true, "controlnetsUsed": ["control_v11p_sd15_canny", "control_v11f1p_sd15_depth"], "parameters": {"denoising": 0.5, "cfg": 5, "steps": 30, "controlnets": 2}}, {"pass": "Light Effects", "success": true, "controlnetsUsed": ["control_v11p_sd15_canny", "control_v11f1p_sd15_depth"], "parameters": {"denoising": 0.15, "cfg": 5.5, "steps": 15, "controlnets": 2}}]

## ControlNet Models Available
- control_v11f1p_sd15_depth [cfd03158]
- control_v11p_sd15_canny [d14c016b]
- control_v11p_sd15_openpose [cab727d4]

## LoRA Models Available


## Key Findings
1. Multi-ControlNet significantly improves subject preservation
2. Lower CFG scales (5.0) work better than expected
3. Multi-pass processing adds quality with minimal time cost
4. Canny ControlNet is most critical for structure preservation
