#!/usr/bin/env python3
"""
Apply RLHF-Optimized Parameters for Oil Painting Conversion
Generated: 2025-08-16 08:30:45
"""

# Optimized parameters from human feedback
OPTIMIZED_STYLES = {
    "classic": {
        "denoising_strength": 0.350,
        "cfg_scale": 5.00,
        "controlnet_weight": 0.70,
        "sampler": "DPM++ 2M Karras",
        "steps": 30
    },
    "impressionist": {
        "denoising_strength": 0.450,
        "cfg_scale": 4.50,
        "controlnet_weight": 0.55,
        "sampler": "Euler a",
        "steps": 30
    },
    "modern": {
        "denoising_strength": 0.550,
        "cfg_scale": 5.50,
        "controlnet_weight": 0.45,
        "sampler": "DPM++ SDE Karras",
        "steps": 30
    }
}

print("RLHF-Optimized Parameters Ready for Use!")
print("These parameters have been refined based on human feedback.")
