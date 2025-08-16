#!/usr/bin/env python3
"""
Reinforcement Learning with Human Feedback (RLHF) for Oil Painting Parameters

This script incorporates human evaluations and feedback to refine the optimal
parameters for pet portrait oil painting conversions.
"""

import json
import time
import logging
from pathlib import Path
from dataclasses import dataclass
from typing import Dict, List, Tuple
import random

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

@dataclass
class HumanEvaluation:
    """Human evaluation data for a style"""
    preservation: int  # 1-5 score
    style: int        # 1-5 score
    overall: int      # 1-5 score
    feedback: str     # Text feedback
    
    @property
    def weighted_score(self) -> float:
        """Calculate weighted score from human evaluation"""
        # Overall is most important, then style, then preservation
        return (self.overall * 0.5 + self.style * 0.3 + self.preservation * 0.2) / 5.0

@dataclass 
class StyleParameters:
    """Parameters for a specific style"""
    denoising_strength: float
    cfg_scale: float
    steps: int
    controlnet_weight: float
    sampler: str
    clip_skip: int
    
    def adjust_from_feedback(self, feedback: str, score: float):
        """Adjust parameters based on human feedback"""
        feedback_lower = feedback.lower()
        
        # Parse feedback for common issues and adjust accordingly
        if "blurry" in feedback_lower or "not sharp" in feedback_lower:
            self.denoising_strength = max(0.2, self.denoising_strength - 0.05)
            self.cfg_scale = min(8.0, self.cfg_scale + 0.5)
            
        if "too strong" in feedback_lower or "lost identity" in feedback_lower:
            self.denoising_strength = max(0.2, self.denoising_strength - 0.1)
            self.controlnet_weight = min(1.0, self.controlnet_weight + 0.1)
            
        if "not enough" in feedback_lower or "too subtle" in feedback_lower:
            self.denoising_strength = min(0.65, self.denoising_strength + 0.05)
            self.controlnet_weight = max(0.3, self.controlnet_weight - 0.05)
            
        if "colors" in feedback_lower:
            if "dull" in feedback_lower or "muted" in feedback_lower:
                self.cfg_scale = min(7.0, self.cfg_scale + 0.3)
            elif "too bright" in feedback_lower or "oversaturated" in feedback_lower:
                self.cfg_scale = max(3.0, self.cfg_scale - 0.3)
                
        if "brushstrokes" in feedback_lower:
            if "not visible" in feedback_lower:
                self.denoising_strength = min(0.6, self.denoising_strength + 0.05)
            elif "too rough" in feedback_lower:
                self.denoising_strength = max(0.25, self.denoising_strength - 0.05)
                
        # Reward/penalize based on score
        if score >= 0.8:  # Good score, make smaller adjustments
            pass  # Keep parameters mostly as-is
        elif score <= 0.4:  # Poor score, make larger adjustments
            # Move parameters toward middle ground
            self.denoising_strength = 0.35 + (self.denoising_strength - 0.35) * 0.5
            self.cfg_scale = 5.0 + (self.cfg_scale - 5.0) * 0.5

class RLHFOptimizer:
    """RL optimizer that learns from human feedback"""
    
    def __init__(self):
        # Initialize with current best parameters
        self.style_params = {
            "classic": StyleParameters(
                denoising_strength=0.35,
                cfg_scale=5.0,
                steps=30,
                controlnet_weight=0.7,
                sampler="DPM++ 2M Karras",
                clip_skip=1
            ),
            "impressionist": StyleParameters(
                denoising_strength=0.45,
                cfg_scale=4.5,
                steps=30,
                controlnet_weight=0.55,
                sampler="Euler a",
                clip_skip=2
            ),
            "modern": StyleParameters(
                denoising_strength=0.55,
                cfg_scale=5.5,
                steps=30,
                controlnet_weight=0.45,
                sampler="DPM++ SDE Karras",
                clip_skip=2
            )
        }
        
        self.evaluation_history = []
        
    def load_human_evaluations(self) -> List[Dict]:
        """Load all human evaluation data"""
        scores_dir = Path("evaluation_dataset/scores")
        evaluations = []
        
        if not scores_dir.exists():
            logger.warning("No human evaluations found yet")
            return evaluations
            
        for score_file in scores_dir.glob("*.json"):
            try:
                with open(score_file, 'r') as f:
                    data = json.load(f)
                    task_id = int(score_file.stem.split('_')[1])
                    
                    for style in ["classic", "impressionist", "modern"]:
                        if style in data and isinstance(data[style], dict):
                            eval_data = data[style]
                            evaluations.append({
                                "task_id": task_id,
                                "style": style,
                                "evaluation": HumanEvaluation(
                                    preservation=eval_data.get("preservation", 3),
                                    style=eval_data.get("style", 3),
                                    overall=eval_data.get("overall", 3),
                                    feedback=eval_data.get("feedback", "")
                                )
                            })
            except Exception as e:
                logger.error(f"Error loading {score_file}: {e}")
                
        return evaluations
    
    def analyze_feedback_patterns(self, evaluations: List[Dict]) -> Dict:
        """Analyze patterns in human feedback"""
        patterns = {
            "classic": {"total": 0, "avg_score": 0, "common_issues": []},
            "impressionist": {"total": 0, "avg_score": 0, "common_issues": []},
            "modern": {"total": 0, "avg_score": 0, "common_issues": []}
        }
        
        style_scores = {"classic": [], "impressionist": [], "modern": []}
        style_feedbacks = {"classic": [], "impressionist": [], "modern": []}
        
        for eval_item in evaluations:
            style = eval_item["style"]
            evaluation = eval_item["evaluation"]
            
            style_scores[style].append(evaluation.weighted_score)
            if evaluation.feedback:
                style_feedbacks[style].append(evaluation.feedback)
        
        # Calculate averages and identify patterns
        for style in patterns.keys():
            if style_scores[style]:
                patterns[style]["total"] = len(style_scores[style])
                patterns[style]["avg_score"] = sum(style_scores[style]) / len(style_scores[style])
                
                # Analyze feedback keywords
                all_feedback = " ".join(style_feedbacks[style]).lower()
                issues = []
                
                if "blurry" in all_feedback:
                    issues.append("blurry")
                if "too strong" in all_feedback or "lost" in all_feedback:
                    issues.append("too_strong")
                if "subtle" in all_feedback or "not enough" in all_feedback:
                    issues.append("too_subtle")
                if "color" in all_feedback:
                    issues.append("color_issues")
                    
                patterns[style]["common_issues"] = issues
                
        return patterns
    
    def optimize_parameters(self):
        """Main optimization loop using human feedback"""
        logger.info("=" * 60)
        logger.info("REINFORCEMENT LEARNING WITH HUMAN FEEDBACK (RLHF)")
        logger.info("=" * 60)
        
        # Load human evaluations
        evaluations = self.load_human_evaluations()
        
        if not evaluations:
            logger.info("No human evaluations available yet.")
            logger.info("Please evaluate some images first at:")
            logger.info("http://localhost:3000/evaluation")
            return
        
        logger.info(f"Found {len(evaluations)} human evaluations")
        
        # Analyze patterns
        patterns = self.analyze_feedback_patterns(evaluations)
        
        logger.info("\n📊 Evaluation Summary:")
        for style, data in patterns.items():
            if data["total"] > 0:
                logger.info(f"\n{style.capitalize()} Style:")
                logger.info(f"  Evaluations: {data['total']}")
                logger.info(f"  Avg Score: {data['avg_score']:.2%}")
                logger.info(f"  Issues: {', '.join(data['common_issues']) if data['common_issues'] else 'None identified'}")
        
        # Optimize each style based on feedback
        logger.info("\n🔧 Optimizing Parameters Based on Feedback...")
        
        for eval_item in evaluations:
            style = eval_item["style"]
            evaluation = eval_item["evaluation"]
            
            # Adjust parameters based on this feedback
            self.style_params[style].adjust_from_feedback(
                evaluation.feedback,
                evaluation.weighted_score
            )
        
        # Average out extreme adjustments
        for style in self.style_params.keys():
            params = self.style_params[style]
            
            # Apply smoothing to prevent overfitting to individual feedback
            if patterns[style]["total"] > 3:  # Only smooth if we have enough data
                avg_score = patterns[style]["avg_score"]
                
                if avg_score > 0.7:  # Good performance, minor tweaks only
                    logger.info(f"\n✅ {style.capitalize()} performing well, minor adjustments only")
                elif avg_score < 0.5:  # Poor performance, bigger changes
                    logger.info(f"\n⚠️ {style.capitalize()} needs improvement, applying larger adjustments")
                    
                    # Move toward more conservative parameters
                    params.denoising_strength = 0.4 + (params.denoising_strength - 0.4) * 0.7
                    params.cfg_scale = 5.0 + (params.cfg_scale - 5.0) * 0.7
        
        # Save optimized parameters
        self.save_optimized_parameters()
        
        logger.info("\n" + "=" * 60)
        logger.info("✅ OPTIMIZATION COMPLETE!")
        logger.info("=" * 60)
        
    def save_optimized_parameters(self):
        """Save the optimized parameters"""
        output_dir = Path("rl_optimization_results")
        output_dir.mkdir(exist_ok=True)
        
        optimized = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "optimization_method": "RLHF (Reinforcement Learning with Human Feedback)",
            "styles": {}
        }
        
        for style, params in self.style_params.items():
            optimized["styles"][style] = {
                "denoising_strength": params.denoising_strength,
                "cfg_scale": params.cfg_scale,
                "steps": params.steps,
                "controlnet_weight": params.controlnet_weight,
                "sampler": params.sampler,
                "clip_skip": params.clip_skip
            }
            
            logger.info(f"\n{style.capitalize()} Optimized Parameters:")
            logger.info(f"  Denoising: {params.denoising_strength:.3f}")
            logger.info(f"  CFG Scale: {params.cfg_scale:.2f}")
            logger.info(f"  ControlNet: {params.controlnet_weight:.2f}")
            logger.info(f"  Sampler: {params.sampler}")
        
        # Save to file
        output_file = output_dir / "rlhf_optimized_parameters.json"
        with open(output_file, 'w') as f:
            json.dump(optimized, f, indent=2)
            
        logger.info(f"\n💾 Parameters saved to: {output_file}")
        
        # Create implementation script
        self.create_implementation_script()
        
    def create_implementation_script(self):
        """Create a script to apply the optimized parameters"""
        
        script_content = f'''#!/usr/bin/env python3
"""
Apply RLHF-Optimized Parameters for Oil Painting Conversion
Generated: {time.strftime("%Y-%m-%d %H:%M:%S")}
"""

# Optimized parameters from human feedback
OPTIMIZED_STYLES = {{
    "classic": {{
        "denoising_strength": {self.style_params["classic"].denoising_strength:.3f},
        "cfg_scale": {self.style_params["classic"].cfg_scale:.2f},
        "controlnet_weight": {self.style_params["classic"].controlnet_weight:.2f},
        "sampler": "{self.style_params["classic"].sampler}",
        "steps": {self.style_params["classic"].steps}
    }},
    "impressionist": {{
        "denoising_strength": {self.style_params["impressionist"].denoising_strength:.3f},
        "cfg_scale": {self.style_params["impressionist"].cfg_scale:.2f},
        "controlnet_weight": {self.style_params["impressionist"].controlnet_weight:.2f},
        "sampler": "{self.style_params["impressionist"].sampler}",
        "steps": {self.style_params["impressionist"].steps}
    }},
    "modern": {{
        "denoising_strength": {self.style_params["modern"].denoising_strength:.3f},
        "cfg_scale": {self.style_params["modern"].cfg_scale:.2f},
        "controlnet_weight": {self.style_params["modern"].controlnet_weight:.2f},
        "sampler": "{self.style_params["modern"].sampler}",
        "steps": {self.style_params["modern"].steps}
    }}
}}

print("RLHF-Optimized Parameters Ready for Use!")
print("These parameters have been refined based on human feedback.")
'''
        
        output_file = Path("rl_optimization_results/apply_rlhf_parameters.py")
        with open(output_file, 'w') as f:
            f.write(script_content)
            
        logger.info(f"📝 Implementation script created: {output_file}")

def main():
    """Run RLHF optimization"""
    optimizer = RLHFOptimizer()
    optimizer.optimize_parameters()
    
    logger.info("\n💡 Next Steps:")
    logger.info("1. Continue evaluating images at http://localhost:3000/evaluation")
    logger.info("2. Run this script again to refine parameters with new feedback")
    logger.info("3. Use apply_rlhf_parameters.py to convert images with optimized settings")

if __name__ == "__main__":
    main()