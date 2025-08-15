"""
Oil Painting Prompt Optimization System
A reinforcement learning-style system for optimizing Stable Diffusion prompts
to convert pet photos into oil paintings while preserving subject integrity.
"""

import json
import random
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, field, asdict
from datetime import datetime
import statistics

@dataclass
class PromptCandidate:
    """Represents a prompt candidate with its performance metrics"""
    style: str
    positive_prompt: str
    negative_prompt: str
    cfg_scale: float
    denoising_strength: float
    controlnet_settings: Dict
    scores: Dict[str, float] = field(default_factory=dict)
    test_count: int = 0
    avg_score: float = 0.0
    variance: float = 0.0
    
class OilPaintingPromptOptimizer:
    """
    Reinforcement learning-style optimizer for oil painting prompts.
    Uses iterative testing and scoring to converge on optimal prompts.
    """
    
    def __init__(self):
        self.styles = ["Classic Portrait", "Thick & Textured", "Soft & Dreamy"]
        self.iteration_count = 0
        self.candidates = []
        self.best_prompts = {}
        self.learning_rate = 0.3
        self.exploration_rate = 0.2
        self.convergence_threshold = 8.5
        
    def generate_initial_candidates(self) -> List[PromptCandidate]:
        """Generate initial prompt hypotheses for each style"""
        
        candidates = []
        
        # Classic Portrait Style - Rembrandt/Old Masters inspired
        classic_variants = [
            {
                "positive": "professional oil painting on canvas, classical portrait style, old masters technique, realistic oil painting, traditional brushwork, glazing technique, chiaroscuro lighting, museum quality artwork, fine art painting, detailed fur texture in oil paint, careful brushstrokes, varnished canvas, {subject}",
                "negative": "digital art, 3d render, cartoon, anime, photograph, watercolor, sketch, low quality, blurry, deformed, mutation, bad anatomy, extra limbs, missing limbs",
                "cfg": 7.5,
                "denoise": 0.45,
                "controlnet": {"canny": 0.6, "depth": 0.4}
            },
            {
                "positive": "masterful oil painting, renaissance style portrait, delicate brushwork, layered paint application, sfumato technique, natural lighting, oil on linen canvas, artistic interpretation, painterly realism, {subject}, refined oil painting technique",
                "negative": "photo, digital, cgi, 3d, cartoon, abstract, watercolor, pencil, low resolution, artifacts, oversaturated",
                "cfg": 8.0,
                "denoise": 0.4,
                "controlnet": {"canny": 0.7, "depth": 0.3}
            },
            {
                "positive": "traditional oil painting portrait, academic painting style, alla prima technique, realistic oil colors, natural brushstrokes, canvas texture visible, classic composition, warm undertones, {subject}, professionally painted",
                "negative": "photography, digital manipulation, computer generated, anime style, sketch, watercolor, acrylic, distorted features",
                "cfg": 7.0,
                "denoise": 0.5,
                "controlnet": {"canny": 0.65, "depth": 0.35}
            }
        ]
        
        # Thick & Textured Style - Impasto/Van Gogh inspired
        textured_variants = [
            {
                "positive": "thick impasto oil painting, heavy brushstrokes, textured paint application, palette knife painting, bold oil painting, visible paint texture, dimensional brushwork, expressive oil painting, rich paint layers, {subject}, tactile paint surface, dynamic brushwork",
                "negative": "smooth, flat, digital art, photograph, watercolor, thin paint, airbrush, 3d render, cartoon, photorealistic, glossy",
                "cfg": 8.5,
                "denoise": 0.55,
                "controlnet": {"canny": 0.5, "depth": 0.5}
            },
            {
                "positive": "heavy impasto technique, thick oil paint layers, bold palette knife strokes, textured canvas, dimensional paint, post-impressionist style, vibrant oil colors, sculptural brushwork, {subject}, pronounced paint texture",
                "negative": "photo, smooth surface, digital, flat colors, watercolor, sketch, realistic photo, clean lines, vector art",
                "cfg": 9.0,
                "denoise": 0.6,
                "controlnet": {"canny": 0.45, "depth": 0.55}
            },
            {
                "positive": "expressive impasto painting, loaded brush technique, thick paint buildup, gestural brushstrokes, oil paint peaks and valleys, textured fur in thick paint, dynamic paint application, {subject}, three-dimensional paint surface",
                "negative": "photograph, smooth, digital rendering, flat, thin paint, watercolor, pencil, photorealistic, airbrushed",
                "cfg": 8.0,
                "denoise": 0.5,
                "controlnet": {"canny": 0.55, "depth": 0.45}
            }
        ]
        
        # Soft & Dreamy Style - Impressionist/Romantic inspired
        dreamy_variants = [
            {
                "positive": "soft impressionist oil painting, gentle brushstrokes, dreamy atmosphere, blended oil colors, romantic painting style, ethereal quality, luminous oil painting, soft edges, harmonious color palette, {subject}, delicate paint application, atmospheric perspective",
                "negative": "harsh lines, digital art, photograph, sharp details, hard edges, cartoon, 3d render, oversaturated, high contrast, geometric",
                "cfg": 6.5,
                "denoise": 0.35,
                "controlnet": {"canny": 0.4, "depth": 0.3}
            },
            {
                "positive": "romantic oil painting, soft focus effect, impressionistic brushwork, gentle color transitions, dreamlike quality, flowing brushstrokes, pastel oil tones, poetic atmosphere, {subject}, tender paint application",
                "negative": "sharp, photograph, digital, hard edges, high contrast, cartoon style, 3d graphics, defined lines, stark",
                "cfg": 7.0,
                "denoise": 0.4,
                "controlnet": {"canny": 0.35, "depth": 0.35}
            },
            {
                "positive": "soft oil painting, impressionist technique, loose brushwork, atmospheric oil painting, gentle light, color harmony, painterly blur, romantic interpretation, {subject}, flowing paint strokes, dreamy ambiance",
                "negative": "photographic, sharp focus, digital art, hard brushstrokes, high definition, cartoon, anime, geometric, angular",
                "cfg": 6.0,
                "denoise": 0.45,
                "controlnet": {"canny": 0.45, "depth": 0.25}
            }
        ]
        
        # Create candidates for each style
        for variant in classic_variants:
            candidates.append(PromptCandidate(
                style="Classic Portrait",
                positive_prompt=variant["positive"],
                negative_prompt=variant["negative"],
                cfg_scale=variant["cfg"],
                denoising_strength=variant["denoise"],
                controlnet_settings=variant["controlnet"]
            ))
            
        for variant in textured_variants:
            candidates.append(PromptCandidate(
                style="Thick & Textured",
                positive_prompt=variant["positive"],
                negative_prompt=variant["negative"],
                cfg_scale=variant["cfg"],
                denoising_strength=variant["denoise"],
                controlnet_settings=variant["controlnet"]
            ))
            
        for variant in dreamy_variants:
            candidates.append(PromptCandidate(
                style="Soft & Dreamy",
                positive_prompt=variant["positive"],
                negative_prompt=variant["negative"],
                cfg_scale=variant["cfg"],
                denoising_strength=variant["denoise"],
                controlnet_settings=variant["controlnet"]
            ))
            
        self.candidates = candidates
        return candidates
    
    def evaluate_result(self, candidate: PromptCandidate, subject_type: str) -> Dict[str, float]:
        """
        Evaluate a generated image result.
        In production, this would use actual vision model evaluation.
        """
        
        # Evaluation criteria with weights
        criteria = {
            "subject_preservation": {
                "weight": 0.4,
                "description": "Does the pet remain recognizable with correct breed/features?"
            },
            "oil_painting_authenticity": {
                "weight": 0.3,
                "description": "Does it convincingly look like a real oil painting?"
            },
            "style_distinctiveness": {
                "weight": 0.2,
                "description": "Is the intended style clearly visible?"
            },
            "consistency": {
                "weight": 0.1,
                "description": "Does it work reliably across different photos?"
            }
        }
        
        # Simulated scoring logic (replace with actual vision model evaluation)
        scores = {}
        
        # Subject preservation scoring factors
        if "canny" in candidate.controlnet_settings:
            canny_weight = candidate.controlnet_settings["canny"]
            scores["subject_preservation"] = min(10, 5 + (canny_weight * 8))
        else:
            scores["subject_preservation"] = 5.0
            
        # Oil painting authenticity based on prompt keywords
        oil_keywords = ["oil painting", "brushstrokes", "canvas", "impasto", "paint texture"]
        keyword_count = sum(1 for kw in oil_keywords if kw in candidate.positive_prompt.lower())
        scores["oil_painting_authenticity"] = min(10, 4 + (keyword_count * 1.5))
        
        # Style distinctiveness based on style-specific elements
        if candidate.style == "Classic Portrait":
            if "chiaroscuro" in candidate.positive_prompt or "old masters" in candidate.positive_prompt:
                scores["style_distinctiveness"] = 8.5
            else:
                scores["style_distinctiveness"] = 7.0
                
        elif candidate.style == "Thick & Textured":
            if candidate.denoising_strength > 0.5 and "impasto" in candidate.positive_prompt:
                scores["style_distinctiveness"] = 9.0
            else:
                scores["style_distinctiveness"] = 7.5
                
        elif candidate.style == "Soft & Dreamy":
            if candidate.cfg_scale < 7 and "soft" in candidate.positive_prompt:
                scores["style_distinctiveness"] = 8.0
            else:
                scores["style_distinctiveness"] = 6.5
        
        # Consistency based on parameter stability
        param_stability = 10 - abs(candidate.denoising_strength - 0.45) * 10
        scores["consistency"] = min(10, max(5, param_stability))
        
        # Calculate weighted average
        total_score = sum(scores[key] * criteria[key]["weight"] for key in scores)
        scores["total"] = total_score
        
        return scores
    
    def mutate_candidate(self, candidate: PromptCandidate, mutation_rate: float = 0.2) -> PromptCandidate:
        """Apply mutations to a candidate based on performance"""
        
        mutated = PromptCandidate(
            style=candidate.style,
            positive_prompt=candidate.positive_prompt,
            negative_prompt=candidate.negative_prompt,
            cfg_scale=candidate.cfg_scale,
            denoising_strength=candidate.denoising_strength,
            controlnet_settings=candidate.controlnet_settings.copy()
        )
        
        # Mutate based on weakest score
        if candidate.scores:
            weak_areas = sorted(candidate.scores.items(), key=lambda x: x[1])
            weakest = weak_areas[0][0] if weak_areas else None
            
            if weakest == "subject_preservation":
                # Increase ControlNet weights
                if "canny" in mutated.controlnet_settings:
                    mutated.controlnet_settings["canny"] = min(0.9, 
                        mutated.controlnet_settings["canny"] + mutation_rate)
                # Decrease denoising
                mutated.denoising_strength = max(0.3, 
                    mutated.denoising_strength - mutation_rate * 0.5)
                    
            elif weakest == "oil_painting_authenticity":
                # Add more oil painting keywords
                oil_terms = ["visible brushstrokes", "paint texture", "canvas grain", 
                           "artistic interpretation", "hand-painted"]
                term = random.choice(oil_terms)
                if term not in mutated.positive_prompt:
                    mutated.positive_prompt += f", {term}"
                    
            elif weakest == "style_distinctiveness":
                # Adjust style-specific parameters
                if candidate.style == "Thick & Textured":
                    mutated.denoising_strength = min(0.7, 
                        mutated.denoising_strength + mutation_rate * 0.3)
                elif candidate.style == "Soft & Dreamy":
                    mutated.cfg_scale = max(5.0, mutated.cfg_scale - mutation_rate * 2)
                    
            elif weakest == "consistency":
                # Move parameters toward stable middle ground
                mutated.denoising_strength = 0.45 + (mutated.denoising_strength - 0.45) * 0.8
                mutated.cfg_scale = 7.5 + (mutated.cfg_scale - 7.5) * 0.8
        
        return mutated
    
    def crossover_candidates(self, parent1: PromptCandidate, 
                           parent2: PromptCandidate) -> PromptCandidate:
        """Combine successful elements from two candidates"""
        
        if parent1.style != parent2.style:
            return parent1  # Don't crossover different styles
            
        # Take best performing elements from each parent
        child = PromptCandidate(
            style=parent1.style,
            positive_prompt=parent1.positive_prompt if parent1.avg_score > parent2.avg_score 
                          else parent2.positive_prompt,
            negative_prompt=parent1.negative_prompt,
            cfg_scale=(parent1.cfg_scale + parent2.cfg_scale) / 2,
            denoising_strength=(parent1.denoising_strength + parent2.denoising_strength) / 2,
            controlnet_settings={
                "canny": (parent1.controlnet_settings.get("canny", 0.5) + 
                         parent2.controlnet_settings.get("canny", 0.5)) / 2,
                "depth": (parent1.controlnet_settings.get("depth", 0.3) + 
                         parent2.controlnet_settings.get("depth", 0.3)) / 2
            }
        )
        
        return child
    
    def run_iteration(self, test_subjects: List[str]) -> Dict:
        """Run one iteration of optimization"""
        
        self.iteration_count += 1
        iteration_results = {
            "iteration": self.iteration_count,
            "timestamp": datetime.now().isoformat(),
            "candidates_tested": len(self.candidates),
            "subjects_tested": len(test_subjects),
            "results": []
        }
        
        # Test each candidate on multiple subjects
        for candidate in self.candidates:
            candidate_scores = []
            
            for subject in test_subjects:
                # Replace {subject} placeholder with actual subject
                test_prompt = candidate.positive_prompt.replace("{subject}", subject)
                
                # Evaluate the result
                scores = self.evaluate_result(candidate, subject)
                candidate_scores.append(scores["total"])
                
                # Update candidate statistics
                if not candidate.scores:
                    candidate.scores = scores
                else:
                    # Running average
                    for key in scores:
                        if key in candidate.scores:
                            candidate.scores[key] = (candidate.scores[key] * candidate.test_count + 
                                                    scores[key]) / (candidate.test_count + 1)
                        else:
                            candidate.scores[key] = scores[key]
                
            candidate.test_count += len(test_subjects)
            candidate.avg_score = statistics.mean(candidate_scores) if candidate_scores else 0
            candidate.variance = statistics.variance(candidate_scores) if len(candidate_scores) > 1 else 0
            
            iteration_results["results"].append({
                "style": candidate.style,
                "avg_score": candidate.avg_score,
                "variance": candidate.variance,
                "scores": candidate.scores
            })
        
        # Selection and evolution
        self.evolve_population()
        
        return iteration_results
    
    def evolve_population(self):
        """Evolve the population based on performance"""
        
        # Group by style
        style_groups = {}
        for candidate in self.candidates:
            if candidate.style not in style_groups:
                style_groups[candidate.style] = []
            style_groups[candidate.style].append(candidate)
        
        new_population = []
        
        for style, group in style_groups.items():
            # Sort by performance
            group.sort(key=lambda x: x.avg_score, reverse=True)
            
            # Keep top performers
            elite_count = max(1, len(group) // 3)
            new_population.extend(group[:elite_count])
            
            # Store best for this style
            if group[0].avg_score > self.best_prompts.get(style, {}).get("score", 0):
                self.best_prompts[style] = {
                    "candidate": group[0],
                    "score": group[0].avg_score
                }
            
            # Generate new candidates through mutation and crossover
            if len(group) >= 2:
                # Crossover
                if random.random() < 0.5:
                    child = self.crossover_candidates(group[0], group[1])
                    new_population.append(child)
                
                # Mutation
                if random.random() < self.exploration_rate:
                    mutant = self.mutate_candidate(group[0], self.learning_rate)
                    new_population.append(mutant)
        
        self.candidates = new_population
    
    def has_converged(self) -> bool:
        """Check if optimization has converged"""
        
        if not self.best_prompts:
            return False
            
        # Check if all styles have high-performing stable prompts
        for style in self.styles:
            if style not in self.best_prompts:
                return False
            best = self.best_prompts[style]
            if best["score"] < self.convergence_threshold:
                return False
            if best["candidate"].variance > 0.5:  # High variance means unstable
                return False
                
        return True
    
    def get_final_prompts(self) -> Dict:
        """Get the optimized prompts for each style"""
        
        final_prompts = {}
        
        for style, data in self.best_prompts.items():
            candidate = data["candidate"]
            final_prompts[style] = {
                "positive_prompt": candidate.positive_prompt,
                "negative_prompt": candidate.negative_prompt,
                "parameters": {
                    "cfg_scale": candidate.cfg_scale,
                    "denoising_strength": candidate.denoising_strength,
                    "controlnet_canny_weight": candidate.controlnet_settings.get("canny", 0.5),
                    "controlnet_depth_weight": candidate.controlnet_settings.get("depth", 0.3),
                    "sampler": "DPM++ 2M Karras",
                    "steps": 30
                },
                "performance": {
                    "avg_score": candidate.avg_score,
                    "variance": candidate.variance,
                    "test_count": candidate.test_count,
                    "scores": candidate.scores
                }
            }
            
        return final_prompts
    
    def save_results(self, filepath: str):
        """Save optimization results to JSON"""
        
        results = {
            "optimization_complete": self.has_converged(),
            "iterations": self.iteration_count,
            "convergence_threshold": self.convergence_threshold,
            "final_prompts": self.get_final_prompts(),
            "timestamp": datetime.now().isoformat()
        }
        
        with open(filepath, 'w') as f:
            json.dump(results, f, indent=2)
            
        return results


# Example usage and testing
if __name__ == "__main__":
    
    # Initialize optimizer
    optimizer = OilPaintingPromptOptimizer()
    
    # Generate initial candidates
    print("Generating initial prompt candidates...")
    initial_candidates = optimizer.generate_initial_candidates()
    print(f"Created {len(initial_candidates)} initial candidates across {len(optimizer.styles)} styles\n")
    
    # Define test subjects for diverse testing
    test_subjects = [
        # Cats
        "tabby cat with green eyes",
        "black cat sitting",
        "persian cat portrait",
        "siamese cat profile",
        "orange cat sleeping",
        "white cat with blue eyes",
        "maine coon cat",
        "calico cat playing",
        
        # Dogs  
        "golden retriever portrait",
        "german shepherd standing",
        "french bulldog face",
        "labrador retriever sitting",
        "poodle portrait",
        "husky with blue eyes",
        "beagle puppy",
        "border collie running",
        "dachshund profile",
        "corgi smiling"
    ]
    
    # Run optimization iterations
    max_iterations = 10
    print("Starting optimization process...\n")
    
    for i in range(max_iterations):
        print(f"Running iteration {i+1}/{max_iterations}")
        
        # Randomly sample subjects for this iteration
        iteration_subjects = random.sample(test_subjects, min(5, len(test_subjects)))
        
        # Run iteration
        results = optimizer.run_iteration(iteration_subjects)
        
        # Print progress
        for style in optimizer.styles:
            if style in optimizer.best_prompts:
                best = optimizer.best_prompts[style]
                print(f"  {style}: Score = {best['score']:.2f}")
        
        # Check for convergence
        if optimizer.has_converged():
            print(f"\nConverged after {i+1} iterations!")
            break
    
    # Get and display final results
    print("\n" + "="*60)
    print("OPTIMIZATION COMPLETE")
    print("="*60)
    
    final_prompts = optimizer.get_final_prompts()
    
    for style, data in final_prompts.items():
        print(f"\n{style.upper()} STYLE")
        print("-" * 40)
        print(f"Average Score: {data['performance']['avg_score']:.2f}/10")
        print(f"Stability (low variance): {1/(1+data['performance']['variance']):.2f}")
        print(f"\nOptimized Positive Prompt:")
        print(f"  {data['positive_prompt']}")
        print(f"\nNegative Prompt:")
        print(f"  {data['negative_prompt']}")
        print(f"\nOptimal Parameters:")
        for param, value in data['parameters'].items():
            print(f"  - {param}: {value}")
        print(f"\nDetailed Scores:")
        for metric, score in data['performance']['scores'].items():
            if metric != "total":
                print(f"  - {metric}: {score:.2f}/10")
    
    # Save results to file
    optimizer.save_results("optimized_prompts.json")
    print("\n✓ Results saved to optimized_prompts.json")