#!/usr/bin/env python3
"""
Vision-based Evaluation Framework
Uses computer vision and ML models to evaluate oil painting conversion quality
"""

import cv2
import numpy as np
import torch
import torchvision.transforms as transforms
from PIL import Image, ImageStat, ImageFilter
import json
import requests
import base64
import io
import time
from typing import Dict, List, Tuple, Optional
from pathlib import Path
from sklearn.metrics.pairwise import cosine_similarity
from scipy import ndimage
from skimage import feature, measure, segmentation
from skimage.filters import sobel
from skimage.color import rgb2gray
import os

# Optional imports
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    openai = None

class ImageAnalyzer:
    """Advanced image analysis for oil painting evaluation"""
    
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        # Image preprocessing transforms
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], 
                               std=[0.229, 0.224, 0.225])
        ])
    
    def load_image(self, image_path: str) -> np.ndarray:
        """Load and preprocess image"""
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Could not load image: {image_path}")
        return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    def extract_features(self, image: np.ndarray) -> Dict:
        """Extract comprehensive image features"""
        features = {}
        
        # Convert to different color spaces
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        hsv = cv2.cvtColor(image, cv2.COLOR_RGB2HSV)
        lab = cv2.cvtColor(image, cv2.COLOR_RGB2LAB)
        
        # Basic statistics
        features.update(self._color_statistics(image, hsv, lab))
        
        # Texture analysis
        features.update(self._texture_analysis(gray))
        
        # Edge and structure analysis
        features.update(self._edge_analysis(gray))
        
        # Oil painting specific features
        features.update(self._painting_features(image, gray))
        
        return features
    
    def _color_statistics(self, rgb: np.ndarray, hsv: np.ndarray, lab: np.ndarray) -> Dict:
        """Analyze color properties"""
        features = {}
        
        # RGB statistics
        for i, channel in enumerate(['r', 'g', 'b']):
            channel_data = rgb[:, :, i].flatten()
            features[f'{channel}_mean'] = float(np.mean(channel_data))
            features[f'{channel}_std'] = float(np.std(channel_data))
            features[f'{channel}_skew'] = float(self._skewness(channel_data))
        
        # HSV statistics
        hue = hsv[:, :, 0].flatten()
        sat = hsv[:, :, 1].flatten()
        val = hsv[:, :, 2].flatten()
        
        features['hue_diversity'] = float(np.std(hue))
        features['saturation_mean'] = float(np.mean(sat))
        features['saturation_std'] = float(np.std(sat))
        features['value_mean'] = float(np.mean(val))
        features['value_std'] = float(np.std(val))
        
        # Color palette diversity
        features['color_diversity'] = self._calculate_color_diversity(rgb)
        
        return features
    
    def _texture_analysis(self, gray: np.ndarray) -> Dict:
        """Analyze texture properties"""
        features = {}
        
        # Local Binary Patterns
        lbp = feature.local_binary_pattern(gray, P=8, R=1, method='uniform')
        lbp_hist, _ = np.histogram(lbp.ravel(), bins=10)
        lbp_hist = lbp_hist.astype(float)
        lbp_hist /= (lbp_hist.sum() + 1e-7)
        
        features['lbp_uniformity'] = float(np.sum(lbp_hist ** 2))
        features['lbp_entropy'] = float(-np.sum(lbp_hist * np.log(lbp_hist + 1e-7)))
        
        # GLCM (Gray-Level Co-occurrence Matrix) features
        glcm = feature.graycomatrix(gray, [1], [0], 256, symmetric=True, normed=True)
        features['glcm_contrast'] = float(feature.graycoprops(glcm, 'contrast')[0, 0])
        features['glcm_homogeneity'] = float(feature.graycoprops(glcm, 'homogeneity')[0, 0])
        features['glcm_energy'] = float(feature.graycoprops(glcm, 'energy')[0, 0])
        
        # Texture roughness
        features['texture_roughness'] = self._calculate_roughness(gray)
        
        return features
    
    def _edge_analysis(self, gray: np.ndarray) -> Dict:
        """Analyze edges and structure"""
        features = {}
        
        # Sobel edge detection
        edges = sobel(gray)
        features['edge_density'] = float(np.mean(edges > 0.1))
        features['edge_strength'] = float(np.mean(edges))
        
        # Canny edges
        canny = cv2.Canny((gray * 255).astype(np.uint8), 50, 150)
        features['canny_edge_ratio'] = float(np.sum(canny > 0) / canny.size)
        
        # Structural similarity patterns
        features['structure_variance'] = float(np.var(gray))
        
        return features
    
    def _painting_features(self, rgb: np.ndarray, gray: np.ndarray) -> Dict:
        """Extract features specific to oil painting evaluation"""
        features = {}
        
        # Brushstroke simulation
        features['brushstroke_visibility'] = self._estimate_brushstrokes(gray)
        
        # Paint texture simulation
        features['paint_texture'] = self._estimate_paint_texture(rgb)
        
        # Artistic style indicators
        features['impressionistic_score'] = self._impressionistic_score(rgb)
        features['classical_score'] = self._classical_score(gray)
        
        # Color blending analysis
        features['color_blending'] = self._analyze_color_blending(rgb)
        
        return features
    
    def _skewness(self, data: np.ndarray) -> float:
        """Calculate skewness of data"""
        mean = np.mean(data)
        std = np.std(data)
        if std == 0:
            return 0.0
        return np.mean(((data - mean) / std) ** 3)
    
    def _calculate_color_diversity(self, rgb: np.ndarray) -> float:
        """Calculate color palette diversity"""
        # Quantize colors to reduce noise
        quantized = rgb // 32 * 32
        unique_colors = np.unique(quantized.reshape(-1, 3), axis=0)
        return float(len(unique_colors))
    
    def _calculate_roughness(self, gray: np.ndarray) -> float:
        """Calculate texture roughness"""
        # Use Laplacian to measure local variations
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        return float(np.var(laplacian))
    
    def _estimate_brushstrokes(self, gray: np.ndarray) -> float:
        """Estimate visibility of brushstrokes"""
        # Apply directional filters to detect stroke patterns
        kernel_h = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]])
        kernel_v = np.array([[-1, -2, -1], [0, 0, 0], [1, 2, 1]])
        
        grad_h = cv2.filter2D(gray, -1, kernel_h)
        grad_v = cv2.filter2D(gray, -1, kernel_v)
        
        gradient_magnitude = np.sqrt(grad_h**2 + grad_v**2)
        
        # Look for oriented patterns (brushstrokes)
        oriented_energy = np.std(gradient_magnitude)
        return float(oriented_energy)
    
    def _estimate_paint_texture(self, rgb: np.ndarray) -> float:
        """Estimate paint texture quality"""
        # Convert to PIL for easier manipulation
        pil_img = Image.fromarray(rgb)
        
        # Apply edge enhancement to simulate paint buildup
        enhanced = pil_img.filter(ImageFilter.EDGE_ENHANCE_MORE)
        enhanced_array = np.array(enhanced)
        
        # Calculate texture score based on high-frequency content
        diff = np.abs(enhanced_array.astype(float) - rgb.astype(float))
        texture_score = np.mean(diff)
        
        return float(texture_score)
    
    def _impressionistic_score(self, rgb: np.ndarray) -> float:
        """Score how impressionistic the image looks"""
        # Impressionistic paintings have soft edges and color dabs
        pil_img = Image.fromarray(rgb)
        
        # Apply slight blur to simulate soft brushwork
        blurred = pil_img.filter(ImageFilter.GaussianBlur(radius=1))
        blurred_array = np.array(blurred)
        
        # Calculate color variation in local patches
        patch_variance = 0.0
        patch_size = 8
        h, w = rgb.shape[:2]
        
        for y in range(0, h - patch_size, patch_size):
            for x in range(0, w - patch_size, patch_size):
                patch = rgb[y:y+patch_size, x:x+patch_size]
                patch_variance += np.var(patch)
        
        patch_variance /= ((h // patch_size) * (w // patch_size))
        return float(patch_variance)
    
    def _classical_score(self, gray: np.ndarray) -> float:
        """Score how classical/realistic the image looks"""
        # Classical paintings have smooth transitions and realistic forms
        # Use gradient smoothness as indicator
        
        grad_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        grad_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
        
        gradient_magnitude = np.sqrt(grad_x**2 + grad_y**2)
        
        # Classical paintings have controlled, smooth gradients
        gradient_smoothness = 1.0 / (1.0 + np.std(gradient_magnitude))
        
        return float(gradient_smoothness)
    
    def _analyze_color_blending(self, rgb: np.ndarray) -> float:
        """Analyze quality of color blending"""
        # Good oil paintings have smooth color transitions
        pil_img = Image.fromarray(rgb)
        
        # Apply median filter to reduce noise
        filtered = pil_img.filter(ImageFilter.MedianFilter(size=3))
        filtered_array = np.array(filtered)
        
        # Calculate color transition smoothness
        diff = np.abs(filtered_array.astype(float) - rgb.astype(float))
        smoothness = 1.0 / (1.0 + np.mean(diff))
        
        return float(smoothness)

class SubjectPreservationAnalyzer:
    """Analyzes how well the original subject is preserved"""
    
    def __init__(self):
        self.analyzer = ImageAnalyzer()
    
    def compare_subjects(self, original_path: str, converted_path: str) -> Dict:
        """Compare subject preservation between original and converted images"""
        try:
            original = self.analyzer.load_image(original_path)
            converted = self.analyzer.load_image(converted_path)
            
            # Extract features from both images
            orig_features = self.analyzer.extract_features(original)
            conv_features = self.analyzer.extract_features(converted)
            
            # Calculate preservation scores
            scores = {}
            
            # Color preservation
            scores['color_preservation'] = self._calculate_color_preservation(orig_features, conv_features)
            
            # Structure preservation
            scores['structure_preservation'] = self._calculate_structure_preservation(orig_features, conv_features)
            
            # Shape preservation (using edge similarity)
            scores['shape_preservation'] = self._calculate_shape_preservation(original, converted)
            
            # Overall subject preservation
            scores['subject_preservation'] = np.mean([
                scores['color_preservation'],
                scores['structure_preservation'],
                scores['shape_preservation']
            ])
            
            return scores
            
        except Exception as e:
            print(f"Error in subject preservation analysis: {e}")
            return {"subject_preservation": 0.0}
    
    def _calculate_color_preservation(self, orig: Dict, conv: Dict) -> float:
        """Calculate how well colors are preserved"""
        color_keys = ['r_mean', 'g_mean', 'b_mean', 'hue_diversity', 'saturation_mean']
        
        similarities = []
        for key in color_keys:
            if key in orig and key in conv:
                # Normalize to 0-1 range for comparison
                orig_val = orig[key] / 255.0 if 'mean' in key else orig[key]
                conv_val = conv[key] / 255.0 if 'mean' in key else conv[key]
                
                # Calculate similarity (1 - normalized difference)
                diff = abs(orig_val - conv_val)
                similarity = max(0.0, 1.0 - diff)
                similarities.append(similarity)
        
        return float(np.mean(similarities)) if similarities else 0.0
    
    def _calculate_structure_preservation(self, orig: Dict, conv: Dict) -> float:
        """Calculate how well structure is preserved"""
        structure_keys = ['edge_density', 'edge_strength', 'structure_variance']
        
        similarities = []
        for key in structure_keys:
            if key in orig and key in conv:
                orig_val = orig[key]
                conv_val = conv[key]
                
                # Calculate relative similarity
                if orig_val == 0:
                    similarity = 1.0 if conv_val == 0 else 0.0
                else:
                    ratio = min(conv_val, orig_val) / max(conv_val, orig_val)
                    similarity = ratio
                
                similarities.append(similarity)
        
        return float(np.mean(similarities)) if similarities else 0.0
    
    def _calculate_shape_preservation(self, original: np.ndarray, converted: np.ndarray) -> float:
        """Calculate shape preservation using edge correlation"""
        try:
            # Convert to grayscale
            orig_gray = cv2.cvtColor(original, cv2.COLOR_RGB2GRAY)
            conv_gray = cv2.cvtColor(converted, cv2.COLOR_RGB2GRAY)
            
            # Resize to same dimensions
            h, w = min(orig_gray.shape[0], conv_gray.shape[0]), min(orig_gray.shape[1], conv_gray.shape[1])
            orig_resized = cv2.resize(orig_gray, (w, h))
            conv_resized = cv2.resize(conv_gray, (w, h))
            
            # Extract edges
            orig_edges = cv2.Canny((orig_resized * 255).astype(np.uint8), 50, 150)
            conv_edges = cv2.Canny((conv_resized * 255).astype(np.uint8), 50, 150)
            
            # Calculate correlation between edge maps
            correlation = cv2.matchTemplate(orig_edges, conv_edges, cv2.TM_CCOEFF_NORMED)
            
            return float(np.max(correlation))
            
        except Exception as e:
            print(f"Error in shape preservation: {e}")
            return 0.0

class OilPaintingAuthenticityAnalyzer:
    """Analyzes how authentic the oil painting effect looks"""
    
    def __init__(self):
        self.analyzer = ImageAnalyzer()
        
        # Define characteristics of authentic oil paintings
        self.authentic_ranges = {
            'brushstroke_visibility': (0.15, 0.8),
            'paint_texture': (10.0, 50.0),
            'color_blending': (0.6, 0.9),
            'texture_roughness': (0.01, 0.1)
        }
    
    def evaluate_authenticity(self, image_path: str, style_id: str) -> Dict:
        """Evaluate how authentic the oil painting looks"""
        try:
            image = self.analyzer.load_image(image_path)
            features = self.analyzer.extract_features(image)
            
            scores = {}
            
            # Brushstroke quality
            scores['brushstroke_quality'] = self._evaluate_brushstrokes(features, style_id)
            
            # Paint texture quality
            scores['paint_texture_quality'] = self._evaluate_paint_texture(features, style_id)
            
            # Color handling
            scores['color_handling'] = self._evaluate_color_handling(features, style_id)
            
            # Surface texture
            scores['surface_texture'] = self._evaluate_surface_texture(features)
            
            # Style-specific evaluation
            scores['style_accuracy'] = self._evaluate_style_accuracy(features, style_id)
            
            # Overall authenticity
            scores['oil_painting_authenticity'] = np.mean([
                scores['brushstroke_quality'],
                scores['paint_texture_quality'],
                scores['color_handling'],
                scores['surface_texture'],
                scores['style_accuracy']
            ])
            
            return scores
            
        except Exception as e:
            print(f"Error in authenticity analysis: {e}")
            return {"oil_painting_authenticity": 0.0}
    
    def _evaluate_brushstrokes(self, features: Dict, style_id: str) -> float:
        """Evaluate brushstroke quality"""
        brushstroke_vis = features.get('brushstroke_visibility', 0.0)
        
        # Different styles have different brushstroke expectations
        if style_id == 'thick_textured':
            # Van Gogh style should have very visible brushstrokes
            target_range = (0.3, 0.8)
        elif style_id == 'classic_portrait':
            # Classical style should have moderate, controlled brushstrokes
            target_range = (0.15, 0.5)
        else:  # soft_impressionist
            # Impressionist style should have visible but soft brushstrokes
            target_range = (0.2, 0.6)
        
        # Score based on how well it fits the target range
        if target_range[0] <= brushstroke_vis <= target_range[1]:
            return 1.0
        elif brushstroke_vis < target_range[0]:
            return brushstroke_vis / target_range[0]
        else:
            return max(0.0, 1.0 - (brushstroke_vis - target_range[1]) / target_range[1])
    
    def _evaluate_paint_texture(self, features: Dict, style_id: str) -> float:
        """Evaluate paint texture quality"""
        paint_texture = features.get('paint_texture', 0.0)
        
        # Style-specific texture expectations
        if style_id == 'thick_textured':
            target_range = (20.0, 60.0)  # High texture for impasto
        elif style_id == 'classic_portrait':
            target_range = (5.0, 25.0)   # Moderate texture
        else:  # soft_impressionist
            target_range = (8.0, 30.0)   # Medium texture
        
        return self._score_in_range(paint_texture, target_range)
    
    def _evaluate_color_handling(self, features: Dict, style_id: str) -> float:
        """Evaluate color handling quality"""
        color_blending = features.get('color_blending', 0.0)
        color_diversity = features.get('color_diversity', 0.0)
        saturation_std = features.get('saturation_std', 0.0)
        
        # Normalize color diversity (typical range 50-500)
        normalized_diversity = min(1.0, color_diversity / 300.0)
        
        # Normalize saturation variation (typical range 0-100)
        normalized_sat_var = min(1.0, saturation_std / 50.0)
        
        # Combine scores
        color_score = np.mean([color_blending, normalized_diversity, normalized_sat_var])
        
        return float(color_score)
    
    def _evaluate_surface_texture(self, features: Dict) -> float:
        """Evaluate surface texture quality"""
        texture_roughness = features.get('texture_roughness', 0.0)
        glcm_contrast = features.get('glcm_contrast', 0.0)
        
        # Oil paintings should have moderate surface texture
        roughness_score = self._score_in_range(texture_roughness, (0.005, 0.05))
        
        # Good contrast indicates texture variation
        contrast_score = min(1.0, glcm_contrast / 100.0)
        
        return float(np.mean([roughness_score, contrast_score]))
    
    def _evaluate_style_accuracy(self, features: Dict, style_id: str) -> float:
        """Evaluate how well the image matches the target style"""
        if style_id == 'thick_textured':
            # Van Gogh style: high impressionistic score, visible texture
            impressionistic = features.get('impressionistic_score', 0.0)
            texture = features.get('paint_texture', 0.0)
            
            # Normalize and combine
            imp_score = min(1.0, impressionistic / 100.0)
            tex_score = min(1.0, texture / 40.0)
            
            return float(np.mean([imp_score, tex_score]))
            
        elif style_id == 'classic_portrait':
            # Classical style: high classical score, controlled texture
            classical = features.get('classical_score', 0.0)
            color_blending = features.get('color_blending', 0.0)
            
            return float(np.mean([classical, color_blending]))
            
        else:  # soft_impressionist
            # Impressionist style: balanced impressionistic and classical
            impressionistic = features.get('impressionistic_score', 0.0)
            classical = features.get('classical_score', 0.0)
            
            imp_score = min(1.0, impressionistic / 80.0)
            
            return float(np.mean([imp_score, classical]))
    
    def _score_in_range(self, value: float, target_range: Tuple[float, float]) -> float:
        """Score a value based on how well it fits in a target range"""
        min_val, max_val = target_range
        
        if min_val <= value <= max_val:
            return 1.0
        elif value < min_val:
            return max(0.0, value / min_val)
        else:
            return max(0.0, 1.0 - (value - max_val) / max_val)

class StyleDistinctivenessAnalyzer:
    """Analyzes how distinctive the style appears"""
    
    def __init__(self):
        self.analyzer = ImageAnalyzer()
    
    def evaluate_distinctiveness(self, image_path: str, style_id: str) -> Dict:
        """Evaluate how distinctive the style is"""
        try:
            image = self.analyzer.load_image(image_path)
            features = self.analyzer.extract_features(image)
            
            scores = {}
            
            # Style separation (how different from other styles)
            scores['style_separation'] = self._calculate_style_separation(features, style_id)
            
            # Artistic transformation (how different from photograph)
            scores['artistic_transformation'] = self._calculate_artistic_transformation(features)
            
            # Visual impact
            scores['visual_impact'] = self._calculate_visual_impact(features)
            
            # Consistency with style expectations
            scores['style_consistency'] = self._calculate_style_consistency(features, style_id)
            
            # Overall distinctiveness
            scores['style_distinctiveness'] = np.mean([
                scores['style_separation'],
                scores['artistic_transformation'],
                scores['visual_impact'],
                scores['style_consistency']
            ])
            
            return scores
            
        except Exception as e:
            print(f"Error in distinctiveness analysis: {e}")
            return {"style_distinctiveness": 0.0}
    
    def _calculate_style_separation(self, features: Dict, style_id: str) -> float:
        """Calculate how well separated this style is from others"""
        # Define style-specific characteristics
        style_profiles = {
            'thick_textured': {
                'brushstroke_visibility': 0.6,
                'paint_texture': 35.0,
                'impressionistic_score': 80.0,
                'texture_roughness': 0.04
            },
            'classic_portrait': {
                'brushstroke_visibility': 0.3,
                'paint_texture': 15.0,
                'classical_score': 0.8,
                'color_blending': 0.8
            },
            'soft_impressionist': {
                'brushstroke_visibility': 0.4,
                'paint_texture': 20.0,
                'impressionistic_score': 60.0,
                'color_blending': 0.7
            }
        }
        
        target_profile = style_profiles[style_id]
        
        # Calculate how well the image matches the target profile
        matches = []
        for key, target_value in target_profile.items():
            if key in features:
                actual_value = features[key]
                
                # Normalize different value ranges
                if key == 'paint_texture':
                    normalized_actual = actual_value / 50.0
                    normalized_target = target_value / 50.0
                elif key == 'impressionistic_score':
                    normalized_actual = actual_value / 100.0
                    normalized_target = target_value / 100.0
                else:
                    normalized_actual = actual_value
                    normalized_target = target_value
                
                # Calculate similarity
                diff = abs(normalized_actual - normalized_target)
                similarity = max(0.0, 1.0 - diff)
                matches.append(similarity)
        
        return float(np.mean(matches)) if matches else 0.0
    
    def _calculate_artistic_transformation(self, features: Dict) -> float:
        """Calculate how much the image has been artistically transformed"""
        # Indicators of artistic transformation
        paint_texture = features.get('paint_texture', 0.0)
        brushstroke_vis = features.get('brushstroke_visibility', 0.0)
        color_blending = features.get('color_blending', 0.0)
        texture_roughness = features.get('texture_roughness', 0.0)
        
        # Normalize scores
        texture_score = min(1.0, paint_texture / 30.0)
        brush_score = min(1.0, brushstroke_vis / 0.6)
        blend_score = color_blending
        rough_score = min(1.0, texture_roughness / 0.03)
        
        transformation_score = np.mean([texture_score, brush_score, blend_score, rough_score])
        
        return float(transformation_score)
    
    def _calculate_visual_impact(self, features: Dict) -> float:
        """Calculate visual impact and appeal"""
        # Visual impact indicators
        color_diversity = features.get('color_diversity', 0.0)
        saturation_std = features.get('saturation_std', 0.0)
        edge_strength = features.get('edge_strength', 0.0)
        
        # Normalize scores
        diversity_score = min(1.0, color_diversity / 200.0)
        saturation_score = min(1.0, saturation_std / 40.0)
        edge_score = min(1.0, edge_strength / 0.3)
        
        impact_score = np.mean([diversity_score, saturation_score, edge_score])
        
        return float(impact_score)
    
    def _calculate_style_consistency(self, features: Dict, style_id: str) -> float:
        """Calculate consistency within the style"""
        # This is similar to style_separation but focuses on internal consistency
        # For now, we'll use a simplified version
        
        if style_id == 'thick_textured':
            # Should have high texture and visible brushstrokes
            texture = features.get('paint_texture', 0.0)
            brushstrokes = features.get('brushstroke_visibility', 0.0)
            
            texture_score = 1.0 if texture > 20.0 else texture / 20.0
            brush_score = 1.0 if brushstrokes > 0.4 else brushstrokes / 0.4
            
            return float(np.mean([texture_score, brush_score]))
            
        elif style_id == 'classic_portrait':
            # Should have good blending and moderate texture
            blending = features.get('color_blending', 0.0)
            texture = features.get('paint_texture', 0.0)
            
            blend_score = blending
            texture_score = 1.0 if 10.0 <= texture <= 25.0 else 0.5
            
            return float(np.mean([blend_score, texture_score]))
            
        else:  # soft_impressionist
            # Should have balanced impressionistic features
            impressionistic = features.get('impressionistic_score', 0.0)
            blending = features.get('color_blending', 0.0)
            
            imp_score = min(1.0, impressionistic / 70.0)
            blend_score = blending
            
            return float(np.mean([imp_score, blend_score]))

class VisionEvaluator:
    """Main vision-based evaluation coordinator"""
    
    def __init__(self, api_base_url: str = "http://localhost:7860"):
        self.api_base_url = api_base_url
        
        # Initialize analyzers
        self.subject_analyzer = SubjectPreservationAnalyzer()
        self.authenticity_analyzer = OilPaintingAuthenticityAnalyzer()
        self.distinctiveness_analyzer = StyleDistinctivenessAnalyzer()
        
        # OpenAI client for advanced evaluation (optional)
        self.openai_client = None
        if OPENAI_AVAILABLE and os.getenv("OPENAI_API_KEY"):
            openai.api_key = os.getenv("OPENAI_API_KEY")
            self.openai_client = openai
    
    def convert_with_parameters(self, image_path: str, parameters: Dict) -> Dict:
        """Convert image using specific parameters via API"""
        try:
            # Prepare image
            with open(image_path, 'rb') as f:
                image_data = f.read()
            
            # Create form data
            files = {'image': ('image.jpg', image_data, 'image/jpeg')}
            data = {'style': parameters['style_id']}
            
            # API call with custom parameters
            response = requests.post(
                f"{self.api_base_url}/convert-v2",
                files=files,
                data=data,
                timeout=120
            )
            
            if response.status_code == 200:
                # Save output
                output_dir = Path("rl_training/temp_outputs")
                output_dir.mkdir(parents=True, exist_ok=True)
                
                timestamp = int(time.time())
                output_path = output_dir / f"converted_{timestamp}.jpg"
                
                with open(output_path, 'wb') as f:
                    f.write(response.content)
                
                return {
                    "success": True,
                    "output_path": str(output_path),
                    "parameters_used": parameters
                }
            else:
                return {
                    "success": False,
                    "error": f"API error: {response.status_code}",
                    "output_path": None
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "output_path": None
            }
    
    def evaluate_conversion(
        self, 
        original_path: str, 
        converted_path: str, 
        style_id: str
    ) -> Dict:
        """Comprehensive evaluation of conversion quality"""
        
        if not os.path.exists(converted_path):
            return {
                "subject_preservation": 0.0,
                "oil_painting_authenticity": 0.0,
                "style_distinctiveness": 0.0,
                "overall_quality": 0.0,
                "error": "Converted image not found"
            }
        
        try:
            # Subject preservation analysis
            subject_scores = self.subject_analyzer.compare_subjects(original_path, converted_path)
            
            # Oil painting authenticity analysis
            authenticity_scores = self.authenticity_analyzer.evaluate_authenticity(converted_path, style_id)
            
            # Style distinctiveness analysis
            distinctiveness_scores = self.distinctiveness_analyzer.evaluate_distinctiveness(converted_path, style_id)
            
            # Combine all scores
            all_scores = {**subject_scores, **authenticity_scores, **distinctiveness_scores}
            
            # Calculate overall quality
            main_scores = [
                all_scores.get("subject_preservation", 0.0),
                all_scores.get("oil_painting_authenticity", 0.0),
                all_scores.get("style_distinctiveness", 0.0)
            ]
            
            overall_quality = np.mean(main_scores)
            all_scores["overall_quality"] = overall_quality
            
            # Add advanced evaluation if available
            if self.openai_client:
                try:
                    advanced_scores = self._advanced_gpt_evaluation(converted_path, style_id)
                    all_scores.update(advanced_scores)
                except Exception as e:
                    print(f"Advanced evaluation failed: {e}")
            
            return all_scores
            
        except Exception as e:
            print(f"Evaluation error: {e}")
            return {
                "subject_preservation": 0.0,
                "oil_painting_authenticity": 0.0,
                "style_distinctiveness": 0.0,
                "overall_quality": 0.0,
                "error": str(e)
            }
    
    def _advanced_gpt_evaluation(self, image_path: str, style_id: str) -> Dict:
        """Use GPT-4V for advanced image evaluation"""
        try:
            # Convert image to base64
            with open(image_path, 'rb') as f:
                image_data = base64.b64encode(f.read()).decode()
            
            # Style descriptions for context
            style_descriptions = {
                'classic_portrait': 'Renaissance-style classical oil painting with smooth brushwork and realistic rendering',
                'thick_textured': 'Van Gogh-style painting with thick, visible brushstrokes and bold texture',
                'soft_impressionist': 'Monet-style impressionist painting with soft, dreamy brushwork and gentle colors'
            }
            
            prompt = f"""
            Analyze this oil painting conversion for a {style_descriptions[style_id]} style. 
            Rate each aspect from 0.0 to 1.0:
            
            1. Subject Recognition: Can you clearly identify the animal subject?
            2. Oil Painting Realism: Does this look like a real oil painting on canvas?
            3. Style Accuracy: How well does this match the {style_id} style?
            4. Artistic Quality: Overall artistic merit and visual appeal
            5. Technical Execution: Quality of brushwork, color blending, texture
            
            Respond with only a JSON object containing numeric scores.
            """
            
            response = self.openai_client.ChatCompletion.create(
                model="gpt-4-vision-preview",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:image/jpeg;base64,{image_data}"}
                            }
                        ]
                    }
                ],
                max_tokens=300
            )
            
            # Parse GPT response
            gpt_text = response.choices[0].message.content
            gpt_scores = json.loads(gpt_text)
            
            # Convert to our naming convention
            advanced_scores = {
                "gpt_subject_recognition": gpt_scores.get("Subject Recognition", 0.0),
                "gpt_oil_painting_realism": gpt_scores.get("Oil Painting Realism", 0.0),
                "gpt_style_accuracy": gpt_scores.get("Style Accuracy", 0.0),
                "gpt_artistic_quality": gpt_scores.get("Artistic Quality", 0.0),
                "gpt_technical_execution": gpt_scores.get("Technical Execution", 0.0)
            }
            
            return advanced_scores
            
        except Exception as e:
            print(f"GPT evaluation failed: {e}")
            return {}
    
    def batch_evaluate(self, image_paths: List[str], style_id: str, parameters: Dict) -> List[Dict]:
        """Evaluate a batch of images with same parameters"""
        results = []
        
        for image_path in image_paths:
            print(f"Evaluating: {Path(image_path).name}")
            
            # Convert image
            conversion_result = self.convert_with_parameters(image_path, parameters)
            
            if conversion_result["success"]:
                # Evaluate conversion
                evaluation = self.evaluate_conversion(
                    image_path, 
                    conversion_result["output_path"], 
                    style_id
                )
                
                evaluation["original_path"] = image_path
                evaluation["converted_path"] = conversion_result["output_path"]
                evaluation["parameters"] = parameters
                
                results.append(evaluation)
            else:
                # Failed conversion
                results.append({
                    "original_path": image_path,
                    "converted_path": None,
                    "parameters": parameters,
                    "subject_preservation": 0.0,
                    "oil_painting_authenticity": 0.0,
                    "style_distinctiveness": 0.0,
                    "overall_quality": 0.0,
                    "error": conversion_result["error"]
                })
        
        return results


def main():
    """Example usage"""
    evaluator = VisionEvaluator()
    
    # Example evaluation
    original_path = "test-image.png"
    if os.path.exists(original_path):
        parameters = {
            'style_id': 'classic_portrait',
            'denoising_strength': 0.65,
            'cfg_scale': 9.0,
            'steps': 40,
            'controlnet_weight': 0.65,
            'sampler': 'DPM++ 2M Karras'
        }
        
        # Convert and evaluate
        conversion_result = evaluator.convert_with_parameters(original_path, parameters)
        
        if conversion_result["success"]:
            evaluation = evaluator.evaluate_conversion(
                original_path,
                conversion_result["output_path"],
                'classic_portrait'
            )
            
            print("\nEvaluation Results:")
            for key, value in evaluation.items():
                if isinstance(value, float):
                    print(f"{key}: {value:.3f}")
                else:
                    print(f"{key}: {value}")
        else:
            print(f"Conversion failed: {conversion_result['error']}")
    else:
        print(f"Test image not found: {original_path}")


if __name__ == "__main__":
    main()