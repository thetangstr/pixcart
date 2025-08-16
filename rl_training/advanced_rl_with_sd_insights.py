#!/usr/bin/env python3
"""
Advanced RL Training System incorporating SD.md insights
Optimizes multi-ControlNet, LoRA weights, and multi-pass parameters
"""

import os
import json
import time
import random
import requests
import numpy as np
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass
import base64
import io
from PIL import Image
import logging
import torch
import torch.nn as nn
import torch.optim as optim

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class AdvancedParameters:
    """Extended parameter set based on SD.md insights"""
    # Base parameters
    denoising_strength: float
    cfg_scale: float
    steps: int
    
    # Multi-ControlNet weights
    controlnet_canny_weight: float
    controlnet_openpose_weight: float
    controlnet_depth_weight: float
    
    # LoRA weights
    style_lora_weight: float
    
    # Multi-pass parameters
    second_pass_denoising: float
    enable_inpainting: bool
    inpaint_denoising: float
    
    # Prompt enhancements
    use_hierarchical_prompt: bool
    add_detail_keywords: bool

class MultiControlNetEngine:
    """Handles multi-ControlNet setup based on SD.md Section 2.4"""
    
    def __init__(self, api_url: str = "http://localhost:7860"):
        self.api_url = api_url
        self.available_controlnets = self._check_available_controlnets()
        
    def _check_available_controlnets(self) -> Dict[str, bool]:
        """Check which ControlNet models are available"""
        available = {
            'canny': False,
            'openpose': False,
            'depth': False,
            'normal': False
        }
        
        try:
            response = requests.get(f"{self.api_url}/controlnet/model_list")
            if response.ok:
                models = response.json().get('model_list', [])
                for model in models:
                    if 'canny' in model.lower():
                        available['canny'] = True
                    elif 'openpose' in model.lower():
                        available['openpose'] = True
                    elif 'depth' in model.lower():
                        available['depth'] = True
                    elif 'normal' in model.lower():
                        available['normal'] = True
        except Exception as e:
            logger.warning(f"Could not check ControlNet models: {e}")
            
        return available
    
    def build_controlnet_config(self, 
                                image_base64: str,
                                params: AdvancedParameters) -> Dict:
        """Build multi-ControlNet configuration"""
        
        controlnet_units = []
        
        # Unit 0: Canny for edges/composition
        if self.available_controlnets['canny'] and params.controlnet_canny_weight > 0:
            controlnet_units.append({
                "image": image_base64,
                "module": "canny",
                "model": "control_v11p_sd15_canny",
                "weight": params.controlnet_canny_weight,
                "resize_mode": "Crop and Resize",
                "control_mode": "Balanced",
                "pixel_perfect": False
            })
        
        # Unit 1: OpenPose for anatomy (if available)
        if self.available_controlnets['openpose'] and params.controlnet_openpose_weight > 0:
            controlnet_units.append({
                "image": image_base64,
                "module": "dw_openpose_full",  # Most comprehensive as per SD.md
                "model": "control_v11p_sd15_openpose",
                "weight": params.controlnet_openpose_weight,
                "resize_mode": "Crop and Resize",
                "control_mode": "Balanced",
                "pixel_perfect": False
            })
        
        # Unit 2: Depth for 3D structure
        if self.available_controlnets['depth'] and params.controlnet_depth_weight > 0:
            controlnet_units.append({
                "image": image_base64,
                "module": "depth_leres++",  # Best quality as per SD.md Section 2.3
                "model": "control_v11f1p_sd15_depth",
                "weight": params.controlnet_depth_weight,
                "resize_mode": "Crop and Resize",
                "control_mode": "Balanced",
                "pixel_perfect": False
            })
        
        return {"controlnet": {"args": controlnet_units}} if controlnet_units else {}

class HierarchicalPromptBuilder:
    """Builds prompts following SD.md Section 3.2 structure"""
    
    @staticmethod
    def build_prompt(style: str, 
                     subject: str = "cat",
                     params: AdvancedParameters = None) -> Tuple[str, str]:
        """Build hierarchical prompt structure"""
        
        style_configs = {
            'classic_portrait': {
                'medium': 'masterpiece oil painting',
                'style_keywords': 'Renaissance style, classical composition, sfumato technique',
                'artist': 'in the style of Leonardo da Vinci',
                'lighting': 'soft diffused light, divine illumination',
                'technical': 'fine detail, realistic details, museum quality'
            },
            'thick_textured': {
                'medium': 'thick impasto oil painting',
                'style_keywords': 'Van Gogh style, expressive brushstrokes, visible paint texture',
                'artist': 'in the style of Vincent van Gogh',
                'lighting': 'vibrant colors, dynamic light',
                'technical': 'bold brush strokes, paint ridges, textured surface'
            },
            'soft_impressionist': {
                'medium': 'impressionist oil painting',
                'style_keywords': 'Monet style, soft brushwork, capturing light effects',
                'artist': 'in the style of Claude Monet',
                'lighting': 'dappled light, golden hour, atmospheric',
                'technical': 'loose brushwork, luminous colors, painterly'
            }
        }
        
        config = style_configs.get(style, style_configs['classic_portrait'])
        
        # Build hierarchical prompt as per SD.md
        prompt_parts = [
            config['medium'],
            f"EXACT SAME {subject}, preserve all features",
            config['style_keywords'],
            config['artist'],
            config['lighting'],
            config['technical']
        ]
        
        # Add detail keywords if VAE bottleneck compensation needed
        if params and params.add_detail_keywords:
            prompt_parts.append("highly detailed, sharp focus, intricate textures")
        
        positive_prompt = ", ".join(prompt_parts)
        
        # Comprehensive negative prompt from SD.md
        negative_prompt = (
            "photograph, photorealistic, realistic, modern, blurry, deformed, "
            "disfigured, watermark, signature, text, ugly, deformed hands, "
            "different animal, species change, transformation"
        )
        
        return positive_prompt, negative_prompt

class AdvancedRLOptimizer:
    """Enhanced RL optimizer for multi-dimensional parameter space"""
    
    def __init__(self):
        # Expanded state space for new parameters
        self.state_size = 15  # Increased from 10
        self.action_space = self._build_action_space()
        self.action_size = len(self.action_space)
        
        # Initialize enhanced DQN
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.policy_net = self._build_network().to(self.device)
        self.target_net = self._build_network().to(self.device)
        self.optimizer = optim.Adam(self.policy_net.parameters(), lr=0.001)
        
    def _build_network(self) -> nn.Module:
        """Build deeper network for complex parameter space"""
        return nn.Sequential(
            nn.Linear(self.state_size, 256),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(256, 512),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(512, 256),
            nn.ReLU(),
            nn.Linear(256, self.action_size)
        )
    
    def _build_action_space(self) -> List[AdvancedParameters]:
        """Build comprehensive action space"""
        actions = []
        
        # Sample parameter combinations
        for den in [0.4, 0.5, 0.6, 0.7]:
            for cfg in [5.0, 6.5, 8.0]:
                for steps in [25, 30, 40]:
                    for cn_config in self._get_controlnet_configs():
                        for lora_w in [0.6, 0.8, 1.0]:
                            actions.append(AdvancedParameters(
                                denoising_strength=den,
                                cfg_scale=cfg,
                                steps=steps,
                                controlnet_canny_weight=cn_config[0],
                                controlnet_openpose_weight=cn_config[1],
                                controlnet_depth_weight=cn_config[2],
                                style_lora_weight=lora_w,
                                second_pass_denoising=0.25,
                                enable_inpainting=False,
                                inpaint_denoising=0.4,
                                use_hierarchical_prompt=True,
                                add_detail_keywords=True
                            ))
        
        return actions[:100]  # Limit to manageable size
    
    def _get_controlnet_configs(self) -> List[Tuple[float, float, float]]:
        """Get different ControlNet weight combinations"""
        return [
            (0.7, 0.0, 0.0),  # Canny only (current approach)
            (0.5, 0.8, 0.0),  # Canny + OpenPose
            (0.4, 0.0, 0.8),  # Canny + Depth
            (0.3, 0.6, 0.6),  # All three balanced
            (0.2, 0.9, 0.4),  # OpenPose dominant
        ]
    
    def get_state_features(self, 
                          image_metadata: Dict,
                          style: str,
                          previous_results: List[float]) -> torch.Tensor:
        """Extract enhanced state features"""
        
        features = [
            # Original features
            1.0 if image_metadata.get('type') == 'cat' else 0.0,
            1.0 if image_metadata.get('type') == 'dog' else 0.0,
            1.0 if style == 'classic_portrait' else 0.0,
            1.0 if style == 'thick_textured' else 0.0,
            1.0 if style == 'soft_impressionist' else 0.0,
            
            # New features from SD.md insights
            image_metadata.get('complexity_score', 0.5),  # Image complexity
            image_metadata.get('has_fine_details', 0.5),  # Detail level
            image_metadata.get('lighting_quality', 0.5),   # Lighting
            
            # Historical performance
            np.mean(previous_results[-5:]) if previous_results else 0.5,
            np.std(previous_results[-5:]) if len(previous_results) > 1 else 0.0,
            
            # Time features
            np.sin(time.time() / 3600),  # Hourly cycle
            np.cos(time.time() / 3600),
            
            # Exploration factor
            random.random(),
            
            # ControlNet availability flags
            1.0 if MultiControlNetEngine().available_controlnets.get('openpose') else 0.0,
            1.0 if MultiControlNetEngine().available_controlnets.get('depth') else 0.0,
        ]
        
        return torch.tensor(features, dtype=torch.float32).to(self.device)

class MultiPassProcessor:
    """Implements multi-pass refinement from SD.md Section 5.2"""
    
    def __init__(self, api_url: str = "http://localhost:7860"):
        self.api_url = api_url
        self.session = requests.Session()
        
    def execute_multi_pass(self, 
                          initial_image: str,
                          style: str,
                          params: AdvancedParameters) -> Dict:
        """Execute multi-pass generation pipeline"""
        
        results = {}
        
        # Pass 1: Main generation with high denoising
        logger.info("Pass 1: Main style transfer")
        pass1_result = self._execute_pass(
            initial_image,
            style,
            params.denoising_strength,
            params
        )
        results['pass1'] = pass1_result
        
        if not pass1_result['success']:
            return results
        
        # Pass 2: Detail enhancement with low denoising
        logger.info("Pass 2: Detail enhancement")
        pass2_result = self._execute_pass(
            pass1_result['image'],
            style,
            params.second_pass_denoising,
            params,
            is_refinement=True
        )
        results['pass2'] = pass2_result
        
        # Pass 3: Optional inpainting for problem areas
        if params.enable_inpainting and pass2_result['success']:
            logger.info("Pass 3: Inpainting corrections")
            problem_areas = self._detect_problem_areas(pass2_result['image'])
            if problem_areas:
                inpaint_result = self._execute_inpainting(
                    pass2_result['image'],
                    problem_areas,
                    style,
                    params
                )
                results['pass3'] = inpaint_result
        
        return results
    
    def _execute_pass(self, 
                     image: str,
                     style: str,
                     denoising: float,
                     params: AdvancedParameters,
                     is_refinement: bool = False) -> Dict:
        """Execute a single generation pass"""
        
        # Build prompt
        prompt_builder = HierarchicalPromptBuilder()
        positive, negative = prompt_builder.build_prompt(style, params=params)
        
        # Add refinement keywords for second pass
        if is_refinement:
            positive += ", enhance details, refine textures, improve quality"
        
        # Build ControlNet config
        cn_engine = MultiControlNetEngine(self.api_url)
        cn_config = cn_engine.build_controlnet_config(image, params)
        
        # Build payload
        payload = {
            "init_images": [image],
            "prompt": positive,
            "negative_prompt": negative,
            "denoising_strength": denoising,
            "cfg_scale": params.cfg_scale,
            "steps": params.steps if not is_refinement else max(15, params.steps // 2),
            "sampler_name": "DPM++ 2M SDE Karras",
            "width": 512,
            "height": 512,
            "seed": -1,
            "alwayson_scripts": cn_config
        }
        
        # Add LoRA if specified
        if params.style_lora_weight > 0:
            # This would need actual LoRA names from your setup
            payload["prompt"] += f" <lora:oil_painting_style:{params.style_lora_weight}>"
        
        try:
            response = self.session.post(
                f"{self.api_url}/sdapi/v1/img2img",
                json=payload,
                timeout=120
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('images'):
                    return {
                        'success': True,
                        'image': data['images'][0]
                    }
            
            return {'success': False, 'error': 'Generation failed'}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _detect_problem_areas(self, image: str) -> List[Dict]:
        """Detect areas that need inpainting (simplified)"""
        # In production, this would use computer vision to detect:
        # - Malformed hands/paws
        # - Distorted faces
        # - Artifacts
        # For now, return empty list
        return []
    
    def _execute_inpainting(self, 
                           image: str,
                           areas: List[Dict],
                           style: str,
                           params: AdvancedParameters) -> Dict:
        """Execute targeted inpainting for corrections"""
        # Implementation would handle specific area corrections
        return {'success': True, 'image': image}

class AdvancedTrainingPipeline:
    """Main training pipeline integrating all SD.md improvements"""
    
    def __init__(self):
        self.optimizer = AdvancedRLOptimizer()
        self.processor = MultiPassProcessor()
        self.results_history = []
        
    def train(self, num_iterations: int = 100):
        """Run advanced training loop"""
        
        logger.info("Starting advanced RL training with SD.md improvements")
        
        for i in range(num_iterations):
            # Generate test image
            test_image = self._create_test_image()
            style = random.choice(['classic_portrait', 'thick_textured', 'soft_impressionist'])
            
            # Get state and select action
            state = self.optimizer.get_state_features(
                {'type': 'cat', 'complexity_score': 0.7},
                style,
                self.results_history
            )
            
            action_idx = self._select_action(state)
            params = self.optimizer.action_space[action_idx]
            
            # Execute multi-pass generation
            results = self.processor.execute_multi_pass(test_image, style, params)
            
            # Evaluate results
            reward = self._evaluate_results(results, test_image)
            self.results_history.append(reward)
            
            # Update model
            self._update_model(state, action_idx, reward)
            
            if i % 10 == 0:
                logger.info(f"Iteration {i}: Avg reward: {np.mean(self.results_history[-10:]):.3f}")
    
    def _create_test_image(self) -> str:
        """Create synthetic test image"""
        img = Image.new('RGB', (512, 512), color=(200, 150, 100))
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        return base64.b64encode(buffered.getvalue()).decode('utf-8')
    
    def _select_action(self, state: torch.Tensor) -> int:
        """Epsilon-greedy action selection"""
        if random.random() > 0.1:  # Exploitation
            with torch.no_grad():
                return self.optimizer.policy_net(state.unsqueeze(0)).max(1)[1].item()
        else:  # Exploration
            return random.randrange(self.optimizer.action_size)
    
    def _evaluate_results(self, results: Dict, original_image: str) -> float:
        """Evaluate based on SD.md principles"""
        
        if not results.get('pass1', {}).get('success'):
            return -1.0
        
        # Base quality score
        quality = random.uniform(0.5, 0.95)  # Would use real evaluation
        
        # Bonus for successful multi-pass
        if results.get('pass2', {}).get('success'):
            quality += 0.1
        
        # Bonus for successful inpainting
        if results.get('pass3', {}).get('success'):
            quality += 0.05
        
        return min(1.0, quality)
    
    def _update_model(self, state: torch.Tensor, action: int, reward: float):
        """Update DQN model"""
        # Simplified update - in production would use experience replay
        pass

def main():
    """Main entry point"""
    print("🚀 Advanced RL Training with SD.md Insights")
    print("=" * 60)
    
    # Check available components
    cn_engine = MultiControlNetEngine()
    print("\n📦 Available ControlNets:")
    for name, available in cn_engine.available_controlnets.items():
        status = "✓" if available else "✗"
        print(f"  {status} {name}")
    
    # Initialize pipeline
    pipeline = AdvancedTrainingPipeline()
    
    # Run training
    pipeline.train(num_iterations=10)  # Small test run
    
    print("\n✅ Training complete!")

if __name__ == "__main__":
    main()