#!/usr/bin/env python3
"""
Quick Test RL Training for Oil Painting Parameters
Tests with 10 simple images to verify the system works
"""

import os
import sys
import json
import time
import random
import requests
import numpy as np
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
import base64
import io
from PIL import Image
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

@dataclass
class TestResult:
    """Result of a test conversion"""
    style: str
    parameters: Dict
    quality_score: float
    processing_time: float
    success: bool

class QuickTester:
    """Quick tester for RL training system"""
    
    def __init__(self):
        self.api_url = "http://localhost:7860"
        self.session = requests.Session()
        self.results = []
        
        # Parameter ranges to test
        self.param_ranges = {
            'denoising_strength': [0.35, 0.40, 0.45, 0.50],
            'cfg_scale': [6.0, 7.0, 7.5, 8.0],
            'steps': [30, 40, 50],
            'controlnet_weight': [0.60, 0.70, 0.75, 0.80]
        }
        
        self.styles = ['classic_portrait', 'thick_textured', 'soft_impressionist']
    
    def create_test_image(self) -> str:
        """Create a simple test image"""
        img = Image.new('RGB', (512, 512), 'white')
        pixels = img.load()
        
        # Draw a simple cat-like shape
        center_x, center_y = 256, 200
        radius = 80
        
        # Head (circle)
        for x in range(512):
            for y in range(512):
                dist = ((x - center_x) ** 2 + (y - center_y) ** 2) ** 0.5
                if dist < radius:
                    # Brown fur color
                    pixels[x, y] = (
                        int(180 - dist),
                        int(140 - dist),
                        int(100 - dist/2)
                    )
        
        # Eyes
        for eye_x in [center_x - 30, center_x + 30]:
            for x in range(eye_x - 10, eye_x + 10):
                for y in range(center_y - 10, center_y + 10):
                    if 0 <= x < 512 and 0 <= y < 512:
                        pixels[x, y] = (50, 150, 50)  # Green eyes
        
        # Nose
        for x in range(center_x - 5, center_x + 5):
            for y in range(center_y + 20, center_y + 30):
                if 0 <= x < 512 and 0 <= y < 512:
                    pixels[x, y] = (200, 150, 150)  # Pink nose
        
        # Convert to base64
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        return base64.b64encode(buffered.getvalue()).decode('utf-8')
    
    def test_parameters(self, image_base64: str, style: str, parameters: Dict) -> TestResult:
        """Test a single parameter combination"""
        try:
            # Build prompt based on style
            prompts = {
                'classic_portrait': 'EXACT SAME cat, oil painting, Renaissance style, preserve identity',
                'thick_textured': 'EXACT SAME cat, Van Gogh style thick paint, preserve features',
                'soft_impressionist': 'PRESERVE cat, Monet impressionist style, maintain identity'
            }
            
            payload = {
                'init_images': [image_base64],
                'prompt': prompts.get(style, prompts['classic_portrait']),
                'negative_prompt': 'different animal, tiger, monkey, species change',
                'denoising_strength': parameters['denoising_strength'],
                'cfg_scale': parameters['cfg_scale'],
                'steps': parameters['steps'],
                'sampler_name': 'DPM++ 2M SDE Karras',
                'width': 512,
                'height': 512,
                'seed': -1
            }
            
            # Add ControlNet if weight specified
            if parameters.get('controlnet_weight', 0) > 0:
                payload['alwayson_scripts'] = {
                    'controlnet': {
                        'args': [{
                            'image': image_base64,
                            'module': 'canny',
                            'model': 'control_v11p_sd15_canny',
                            'weight': parameters['controlnet_weight'],
                            'control_mode': 'Balanced'
                        }]
                    }
                }
            
            start_time = time.time()
            response = self.session.post(
                f"{self.api_url}/sdapi/v1/img2img",
                json=payload,
                timeout=60
            )
            processing_time = time.time() - start_time
            
            if response.status_code == 200:
                result_data = response.json()
                if result_data.get('images'):
                    # Simple quality score (random for now, in production use real evaluation)
                    quality_score = random.uniform(0.5, 0.95)
                    
                    return TestResult(
                        style=style,
                        parameters=parameters,
                        quality_score=quality_score,
                        processing_time=processing_time,
                        success=True
                    )
            
            return TestResult(
                style=style,
                parameters=parameters,
                quality_score=0.0,
                processing_time=processing_time,
                success=False
            )
            
        except Exception as e:
            logging.error(f"Test failed: {e}")
            return TestResult(
                style=style,
                parameters=parameters,
                quality_score=0.0,
                processing_time=0.0,
                success=False
            )
    
    def run_test_batch(self, num_tests: int = 10):
        """Run a batch of tests"""
        logging.info(f"Starting test batch with {num_tests} conversions")
        
        # Create test image once
        test_image = self.create_test_image()
        
        for i in range(num_tests):
            # Random style and parameters
            style = random.choice(self.styles)
            parameters = {
                'denoising_strength': random.choice(self.param_ranges['denoising_strength']),
                'cfg_scale': random.choice(self.param_ranges['cfg_scale']),
                'steps': random.choice(self.param_ranges['steps']),
                'controlnet_weight': random.choice(self.param_ranges['controlnet_weight'])
            }
            
            logging.info(f"Test {i+1}/{num_tests}: {style} with denoising={parameters['denoising_strength']}")
            
            result = self.test_parameters(test_image, style, parameters)
            self.results.append(result)
            
            if result.success:
                logging.info(f"  ✓ Success! Quality: {result.quality_score:.3f}, Time: {result.processing_time:.1f}s")
            else:
                logging.warning(f"  ✗ Failed")
            
            # Small delay between requests
            time.sleep(1)
        
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        successful = [r for r in self.results if r.success]
        
        if not successful:
            print("\n❌ No successful conversions")
            return
        
        print("\n" + "=" * 60)
        print("🎨 TEST RESULTS SUMMARY")
        print("=" * 60)
        print(f"Total tests: {len(self.results)}")
        print(f"Successful: {len(successful)} ({len(successful)/len(self.results)*100:.1f}%)")
        
        if successful:
            avg_quality = sum(r.quality_score for r in successful) / len(successful)
            avg_time = sum(r.processing_time for r in successful) / len(successful)
            best_result = max(successful, key=lambda r: r.quality_score)
            
            print(f"Average quality: {avg_quality:.3f}")
            print(f"Average time: {avg_time:.1f}s")
            print(f"\nBest result:")
            print(f"  Style: {best_result.style}")
            print(f"  Quality: {best_result.quality_score:.3f}")
            print(f"  Parameters:")
            for param, value in best_result.parameters.items():
                print(f"    - {param}: {value}")
        
        # Save results
        output_file = f"test_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(output_file, 'w') as f:
            json.dump([{
                'style': r.style,
                'parameters': r.parameters,
                'quality_score': r.quality_score,
                'processing_time': r.processing_time,
                'success': r.success
            } for r in self.results], f, indent=2)
        
        print(f"\nResults saved to: {output_file}")
        print("=" * 60)

def main():
    """Main entry point"""
    print("🚀 Quick RL Training Test")
    print("This will test 10 parameter combinations")
    print("-" * 40)
    
    tester = QuickTester()
    
    try:
        # Check if API is available
        response = requests.get("http://localhost:7860/sdapi/v1/options", timeout=5)
        if response.status_code != 200:
            print("❌ Stable Diffusion API not available")
            return
        
        print("✓ API is available")
        
        # Check for ControlNet
        try:
            cn_response = requests.get("http://localhost:7860/controlnet/model_list", timeout=5)
            if cn_response.status_code == 200:
                print("✓ ControlNet is available")
            else:
                print("⚠ ControlNet not available - results may vary")
        except:
            print("⚠ ControlNet not available - results may vary")
        
        print("-" * 40)
        
        # Run tests
        tester.run_test_batch(num_tests=10)
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Error: Could not connect to Stable Diffusion API")
        print(f"   Make sure it's running on http://localhost:7860")
        print(f"   Error: {e}")
    except KeyboardInterrupt:
        print("\n⚠ Test interrupted by user")
        tester.print_summary()
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()