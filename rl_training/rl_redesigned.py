#!/usr/bin/env python3
"""
REDESIGNED RL Training System
Optimizes for PRESERVATION + STYLE, not just style
"""

import numpy as np
import torch
import torch.nn as nn
from PIL import Image
import imagehash
from typing import Dict, Tuple, Optional
import logging
from dataclasses import dataclass
import json
import sqlite3
from datetime import datetime
import requests
import base64
import io
from skimage.metrics import structural_similarity as ssim
import cv2

logging.basicConfig(level=logging.INFO)

@dataclass
class PreservationMetrics:
    """Metrics that actually matter"""
    structural_similarity: float  # SSIM score
    face_preservation: float      # Face landmark similarity
    color_preservation: float      # Color histogram similarity
    species_consistency: float     # Did it stay the same animal?
    geometric_accuracy: float      # Edge map similarity
    
    @property
    def preservation_score(self) -> float:
        """Combined preservation score (0-1)"""
        return np.mean([
            self.structural_similarity,
            self.face_preservation,
            self.color_preservation,
            self.species_consistency,
            self.geometric_accuracy
        ])

@dataclass
class StyleMetrics:
    """Oil painting style quality"""
    brushstroke_visibility: float  # Texture analysis
    paint_thickness: float         # Impasto effect
    artistic_coherence: float      # Overall artistic quality
    
    @property
    def style_score(self) -> float:
        """Combined style score (0-1)"""
        return np.mean([
            self.brushstroke_visibility,
            self.paint_thickness,
            self.artistic_coherence
        ])

class PreservationRL:
    """RL system that prioritizes preservation"""
    
    def __init__(self):
        self.setup_constraints()
        self.setup_evaluators()
        self.setup_database()
        
    def setup_constraints(self):
        """Hard constraints that MUST be satisfied"""
        self.constraints = {
            'denoising_strength': (0.05, 0.25),  # HARD LIMIT: Never above 0.25
            'cfg_scale': (1.0, 3.5),              # HARD LIMIT: Never above 3.5
            'canny_weight': (0.9, 1.0),           # HARD LIMIT: Never below 0.9
            'openpose_weight': (0.0, 0.0),        # HARD LIMIT: Always 0 for animals
            'depth_weight': (0.0, 0.3),           # HARD LIMIT: Minimal depth
        }
        
    def setup_evaluators(self):
        """Initialize evaluation models"""
        # Use perceptual hash for face similarity
        self.hash_algorithm = imagehash.phash
        
        # Load species classifier (mock - would use real model)
        self.species_classifier = self.mock_species_classifier
        
    def setup_database(self):
        """Create database for REAL metrics"""
        self.conn = sqlite3.connect('rl_preservation_results.db')
        cursor = self.conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS training_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                -- Parameters
                denoising_strength REAL,
                cfg_scale REAL,
                canny_weight REAL,
                steps INTEGER,
                
                -- PRESERVATION Metrics (What Really Matters)
                structural_similarity REAL,
                face_preservation REAL,
                color_preservation REAL,
                species_consistency REAL,
                geometric_accuracy REAL,
                preservation_score REAL,
                
                -- Style Metrics (Secondary)
                brushstroke_visibility REAL,
                paint_thickness REAL,
                artistic_coherence REAL,
                style_score REAL,
                
                -- Combined Score
                total_score REAL,
                
                -- Failure Tracking
                failed_preservation BOOLEAN,
                failure_reason TEXT
            )
        ''')
        self.conn.commit()
    
    def calculate_preservation_metrics(
        self, 
        original: np.ndarray, 
        converted: np.ndarray
    ) -> PreservationMetrics:
        """Calculate REAL quality metrics focused on preservation"""
        
        # 1. Structural Similarity (SSIM)
        structural_sim = ssim(original, converted, multichannel=True)
        
        # 2. Face/Feature Preservation (using perceptual hash)
        original_hash = self.hash_algorithm(Image.fromarray(original))
        converted_hash = self.hash_algorithm(Image.fromarray(converted))
        hash_similarity = 1.0 - (original_hash - converted_hash) / 64.0
        face_preservation = max(0, min(1, hash_similarity))
        
        # 3. Color Preservation (histogram comparison)
        color_preservation = self.compare_color_histograms(original, converted)
        
        # 4. Species Consistency (must stay same animal)
        original_species = self.species_classifier(original)
        converted_species = self.species_classifier(converted)
        species_consistency = 1.0 if original_species == converted_species else 0.0
        
        # 5. Geometric Accuracy (edge preservation)
        geometric_accuracy = self.compare_edges(original, converted)
        
        return PreservationMetrics(
            structural_similarity=structural_sim,
            face_preservation=face_preservation,
            color_preservation=color_preservation,
            species_consistency=species_consistency,
            geometric_accuracy=geometric_accuracy
        )
    
    def calculate_style_metrics(self, converted: np.ndarray) -> StyleMetrics:
        """Calculate oil painting style quality"""
        
        # 1. Brushstroke Visibility (texture analysis)
        brushstroke_visibility = self.analyze_texture(converted)
        
        # 2. Paint Thickness (edge detection for impasto)
        paint_thickness = self.analyze_impasto(converted)
        
        # 3. Artistic Coherence
        artistic_coherence = self.analyze_artistic_quality(converted)
        
        return StyleMetrics(
            brushstroke_visibility=brushstroke_visibility,
            paint_thickness=paint_thickness,
            artistic_coherence=artistic_coherence
        )
    
    def reward_function(
        self,
        preservation: PreservationMetrics,
        style: StyleMetrics
    ) -> float:
        """
        New reward function that HEAVILY prioritizes preservation
        """
        # CRITICAL: Preservation is 80% of score
        preservation_weight = 0.8
        style_weight = 0.2
        
        # HARD FAILURE if species changed
        if preservation.species_consistency < 1.0:
            return -10.0  # Massive penalty
        
        # HARD FAILURE if face similarity too low
        if preservation.face_preservation < 0.85:
            return -5.0  # Large penalty
        
        # Normal scoring
        reward = (
            preservation_weight * preservation.preservation_score +
            style_weight * style.style_score
        )
        
        # Bonus for perfect preservation
        if preservation.preservation_score > 0.95:
            reward += 0.5
        
        return reward
    
    def generate_safe_parameters(self) -> Dict:
        """
        Generate parameters within HARD constraints
        """
        params = {}
        
        for param, (min_val, max_val) in self.constraints.items():
            if min_val == max_val:
                params[param] = min_val  # Fixed value
            else:
                # Start conservative, explore carefully
                if 'denoising' in param:
                    # Bias toward lower values
                    params[param] = np.random.uniform(min_val, min_val + (max_val - min_val) * 0.5)
                elif 'canny' in param:
                    # Bias toward higher values
                    params[param] = np.random.uniform(max_val - (max_val - min_val) * 0.3, max_val)
                else:
                    params[param] = np.random.uniform(min_val, max_val)
        
        # Fixed safe values
        params['steps'] = 20  # Fewer steps = less change
        params['passes'] = 1   # Single pass only
        
        return params
    
    def convert_with_params(
        self,
        image_path: str,
        params: Dict
    ) -> Tuple[Optional[np.ndarray], bool]:
        """Convert image with given parameters"""
        
        # Build API request with safety constraints
        payload = {
            'denoising_strength': params['denoising_strength'],
            'cfg_scale': params['cfg_scale'],
            'steps': params['steps'],
            'controlnet_conditioning_scale': [
                params['canny_weight'],
                0.0,  # OpenPose always 0
                params.get('depth_weight', 0.2)
            ],
            'prompt': 'oil painting texture, preserve exact features',
            'negative_prompt': 'transformation, different face, wrong species, monkey, human'
        }
        
        # Call API (simplified)
        try:
            # Your actual API call here
            result = self.call_sd_api(image_path, payload)
            return result, True
        except Exception as e:
            logging.error(f"Conversion failed: {e}")
            return None, False
    
    def train_step(self, image_path: str) -> Dict:
        """Single training step with preservation focus"""
        
        # Load original
        original = np.array(Image.open(image_path))
        
        # Generate SAFE parameters
        params = self.generate_safe_parameters()
        
        # Convert
        converted, success = self.convert_with_params(image_path, params)
        
        if not success or converted is None:
            return {'success': False, 'reward': -10.0}
        
        # Calculate REAL metrics
        preservation = self.calculate_preservation_metrics(original, converted)
        style = self.calculate_style_metrics(converted)
        
        # Calculate reward
        reward = self.reward_function(preservation, style)
        
        # Log to database
        self.log_result(params, preservation, style, reward)
        
        # CRITICAL: Fail fast if preservation is bad
        if preservation.species_consistency < 1.0:
            logging.error(f"SPECIES CHANGED! Stopping this parameter set.")
            self.blacklist_parameters(params)
        
        return {
            'success': True,
            'reward': reward,
            'preservation_score': preservation.preservation_score,
            'style_score': style.style_score,
            'params': params
        }
    
    def log_result(self, params: Dict, preservation: PreservationMetrics, 
                   style: StyleMetrics, reward: float):
        """Log results with focus on preservation"""
        cursor = self.conn.cursor()
        
        cursor.execute('''
            INSERT INTO training_results (
                denoising_strength, cfg_scale, canny_weight, steps,
                structural_similarity, face_preservation, color_preservation,
                species_consistency, geometric_accuracy, preservation_score,
                brushstroke_visibility, paint_thickness, artistic_coherence, style_score,
                total_score, failed_preservation, failure_reason
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            params['denoising_strength'],
            params['cfg_scale'],
            params['canny_weight'],
            params['steps'],
            preservation.structural_similarity,
            preservation.face_preservation,
            preservation.color_preservation,
            preservation.species_consistency,
            preservation.geometric_accuracy,
            preservation.preservation_score,
            style.brushstroke_visibility,
            style.paint_thickness,
            style.artistic_coherence,
            style.style_score,
            reward,
            preservation.preservation_score < 0.85,
            'Low preservation' if preservation.preservation_score < 0.85 else None
        ))
        
        self.conn.commit()
    
    def get_best_parameters(self) -> Dict:
        """Get parameters with best PRESERVATION score"""
        cursor = self.conn.cursor()
        
        # CRITICAL: Filter for perfect species preservation
        cursor.execute('''
            SELECT denoising_strength, cfg_scale, canny_weight, steps,
                   preservation_score, style_score, total_score
            FROM training_results
            WHERE species_consistency = 1.0  -- MUST preserve species
              AND face_preservation > 0.85   -- MUST preserve face
            ORDER BY preservation_score DESC, style_score DESC
            LIMIT 1
        ''')
        
        result = cursor.fetchone()
        if result:
            return {
                'denoising_strength': result[0],
                'cfg_scale': result[1],
                'canny_weight': result[2],
                'steps': result[3],
                'preservation_score': result[4],
                'style_score': result[5],
                'total_score': result[6]
            }
        return None
    
    # Helper methods (simplified implementations)
    
    def compare_color_histograms(self, img1: np.ndarray, img2: np.ndarray) -> float:
        """Compare color distributions"""
        hist1 = cv2.calcHist([img1], [0, 1, 2], None, [8, 8, 8], [0, 256, 0, 256, 0, 256])
        hist2 = cv2.calcHist([img2], [0, 1, 2], None, [8, 8, 8], [0, 256, 0, 256, 0, 256])
        return cv2.compareHist(hist1, hist2, cv2.HISTCMP_CORREL)
    
    def compare_edges(self, img1: np.ndarray, img2: np.ndarray) -> float:
        """Compare edge maps for geometric accuracy"""
        edges1 = cv2.Canny(cv2.cvtColor(img1, cv2.COLOR_RGB2GRAY), 100, 200)
        edges2 = cv2.Canny(cv2.cvtColor(img2, cv2.COLOR_RGB2GRAY), 100, 200)
        return ssim(edges1, edges2)
    
    def mock_species_classifier(self, image: np.ndarray) -> str:
        """Mock classifier - would use real model"""
        # In reality, use a pre-trained classifier
        return "cat"  # Placeholder
    
    def analyze_texture(self, image: np.ndarray) -> float:
        """Analyze brushstroke texture"""
        # Simplified - would use texture analysis
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        return min(1.0, laplacian_var / 1000)
    
    def analyze_impasto(self, image: np.ndarray) -> float:
        """Analyze paint thickness effect"""
        # Simplified - would analyze edge gradients
        return 0.7  # Placeholder
    
    def analyze_artistic_quality(self, image: np.ndarray) -> float:
        """Overall artistic assessment"""
        # Simplified - would use aesthetic model
        return 0.8  # Placeholder
    
    def blacklist_parameters(self, params: Dict):
        """Mark parameters as harmful"""
        logging.error(f"BLACKLISTING: {params}")
        # Store in blacklist table
    
    def call_sd_api(self, image_path: str, payload: Dict) -> np.ndarray:
        """Call actual SD API"""
        # Implementation here
        pass


def main():
    """Run redesigned RL training"""
    trainer = PreservationRL()
    
    print("🎯 REDESIGNED RL Training")
    print("=" * 50)
    print("Optimization Target: PRESERVATION + Style")
    print("Hard Constraints:")
    print("  - Denoising: 0.05-0.25 (never higher)")
    print("  - CFG: 1.0-3.5 (never higher)")
    print("  - Canny: 0.9-1.0 (always high)")
    print("  - OpenPose: 0.0 (always disabled)")
    print("")
    
    # Training loop
    test_images = ['cat.jpg', 'dog.jpg', 'human.jpg']
    
    for epoch in range(10):
        print(f"\nEpoch {epoch + 1}/10")
        
        for image_path in test_images:
            result = trainer.train_step(image_path)
            
            if result['success']:
                print(f"  ✓ Preservation: {result['preservation_score']:.3f}")
                print(f"    Style: {result['style_score']:.3f}")
                print(f"    Reward: {result['reward']:.3f}")
            else:
                print(f"  ✗ Failed")
    
    # Get best parameters
    best = trainer.get_best_parameters()
    if best:
        print("\n" + "=" * 50)
        print("BEST PARAMETERS (Preservation-First):")
        print(f"  Denoising: {best['denoising_strength']:.3f}")
        print(f"  CFG: {best['cfg_scale']:.2f}")
        print(f"  Canny: {best['canny_weight']:.2f}")
        print(f"  Preservation Score: {best['preservation_score']:.3f}")
        print(f"  Style Score: {best['style_score']:.3f}")
    

if __name__ == "__main__":
    main()