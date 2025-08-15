"""
Oil Painting Style Testing Script
This script helps evaluate the three optimized oil painting styles
by generating variations and scoring them based on the evaluation framework.
"""

import json
from datetime import datetime
from pathlib import Path

class OilPaintingStyleTester:
    def __init__(self):
        self.styles = {
            "classic_portrait": {
                "name": "Classic Portrait (Renaissance/Academic)",
                "positive": "oil painting portrait, Renaissance technique, academic realism, glazing layers, sfumato shading, chiaroscuro lighting, old master style, canvas texture, varnished finish, classical composition, natural skin tones, subtle gradients, museum quality, professional portrait artist, traditional pigments, refined details",
                "negative": "photograph, digital art, 3d render, cgi, anime, cartoon, illustration, watercolor, acrylic, sketch, pencil, charcoal, flat colors, oversaturated, neon, modern art, abstract, impressionist, expressionist, rough texture, visible brushstrokes, impasto, plastic skin, airbrushed, smooth gradient, vector art, low quality, blurry, distorted features, bad anatomy",
                "settings": {
                    "sampler": "DPM++ 2M Karras",
                    "steps": 35,
                    "cfg_scale": 7,
                    "denoising_strength": 0.40,
                    "controlnet_canny": 0.45,
                    "controlnet_depth": 0.35
                }
            },
            "thick_textured": {
                "name": "Thick & Textured (Van Gogh/Expressionist)",
                "positive": "thick impasto oil painting, heavy paint application, Van Gogh technique, visible palette knife marks, three-dimensional paint texture, bold brushstrokes, expressive color, swirling patterns, textured canvas, rough paint surface, dynamic movement, saturated pigments, energetic application, chunky paint buildup, artistic interpretation, post-impressionist style",
                "negative": "smooth surface, flat painting, thin paint, watercolor, digital art, photograph, 3d render, anime, subtle texture, refined brushwork, photorealistic, glazed finish, academic style, precise details, clean edges, minimalist, pencil, ink, marker, airbrush, vector graphics, low texture, polished, sleek, uniform color, gradient, blended",
                "settings": {
                    "sampler": "Euler a",
                    "steps": 40,
                    "cfg_scale": 8,
                    "denoising_strength": 0.52,
                    "controlnet_canny": 0.55,
                    "controlnet_depth": 0.45
                }
            },
            "soft_dreamy": {
                "name": "Soft & Dreamy (Impressionist/Monet)",
                "positive": "soft impressionist oil painting, Monet style brushwork, broken color technique, atmospheric light, plein air painting, gentle brushstrokes, color vibration, optical mixing, morning light, hazy atmosphere, romantic mood, French impressionism, loose painting style, captured moment, natural lighting, harmonious palette, outdoor scene feeling, light-filled composition",
                "negative": "sharp focus, hard edges, photographic detail, dark shadows, high contrast, thick impasto, heavy texture, precise lines, technical drawing, digital precision, 3d render, anime, cartoon, hyperrealistic, gothic, noir, dramatic lighting, bold outlines, geometric, architectural precision, harsh colors, neon, oversaturated, flat illustration",
                "settings": {
                    "sampler": "DPM++ 2M Karras",
                    "steps": 30,
                    "cfg_scale": 6,
                    "denoising_strength": 0.45,
                    "controlnet_canny": 0.35,
                    "controlnet_depth": 0.45
                }
            }
        }
        
        self.evaluation_criteria = {
            "subject_preservation": {
                "weight": 0.30,
                "checks": [
                    "facial_features_maintained",
                    "proportions_accurate",
                    "expression_preserved",
                    "identifying_details_visible"
                ]
            },
            "oil_painting_authenticity": {
                "weight": 0.30,
                "checks": [
                    "canvas_texture_visible",
                    "paint_buildup_appropriate",
                    "natural_color_mixing",
                    "brushwork_characteristics",
                    "no_digital_artifacts"
                ]
            },
            "style_distinctiveness": {
                "weight": 0.25,
                "checks": [
                    "clearly_distinguishable",
                    "historical_accuracy",
                    "technique_alignment",
                    "consistent_style"
                ]
            },
            "consistency": {
                "weight": 0.15,
                "checks": [
                    "batch_similarity",
                    "seed_stability",
                    "parameter_tolerance"
                ]
            }
        }
    
    def generate_api_payload(self, style_key, input_image_path, seed=None):
        """Generate the API payload for Stable Diffusion WebUI"""
        style = self.styles[style_key]
        
        payload = {
            "prompt": style["positive"],
            "negative_prompt": style["negative"],
            "sampler_name": style["settings"]["sampler"],
            "steps": style["settings"]["steps"],
            "cfg_scale": style["settings"]["cfg_scale"],
            "denoising_strength": style["settings"]["denoising_strength"],
            "seed": seed if seed else -1,
            "batch_size": 1,
            "n_iter": 3,  # Generate 3 variations
            "save_images": True,
            "alwayson_scripts": {
                "controlnet": {
                    "args": [
                        {
                            "enabled": True,
                            "module": "canny",
                            "model": "control_v11p_sd15_canny",
                            "weight": style["settings"]["controlnet_canny"],
                            "guidance_start": 0,
                            "guidance_end": 1
                        },
                        {
                            "enabled": True,
                            "module": "depth_midas",
                            "model": "control_v11f1p_sd15_depth",
                            "weight": style["settings"]["controlnet_depth"],
                            "guidance_start": 0,
                            "guidance_end": 1
                        }
                    ]
                }
            }
        }
        
        return payload
    
    def create_evaluation_report(self, style_key, test_results):
        """Create a detailed evaluation report for a style"""
        style = self.styles[style_key]
        
        report = {
            "style": style["name"],
            "timestamp": datetime.now().isoformat(),
            "prompts": {
                "positive": style["positive"],
                "negative": style["negative"]
            },
            "settings": style["settings"],
            "evaluation_scores": {},
            "overall_score": 0,
            "pass_status": "PENDING",
            "recommendations": []
        }
        
        # Calculate scores based on test results
        for criterion, config in self.evaluation_criteria.items():
            score = self.calculate_criterion_score(test_results, config["checks"])
            report["evaluation_scores"][criterion] = {
                "score": score,
                "weight": config["weight"],
                "weighted_score": score * config["weight"]
            }
        
        # Calculate overall score
        report["overall_score"] = sum(
            report["evaluation_scores"][c]["weighted_score"] 
            for c in self.evaluation_criteria
        )
        
        # Determine pass status
        if report["overall_score"] >= 8:
            report["pass_status"] = "EXCELLENT"
        elif report["overall_score"] >= 7:
            report["pass_status"] = "GOOD"
        elif report["overall_score"] >= 6:
            report["pass_status"] = "ACCEPTABLE"
        else:
            report["pass_status"] = "NEEDS_REVISION"
        
        # Add recommendations based on scores
        report["recommendations"] = self.generate_recommendations(
            report["evaluation_scores"]
        )
        
        return report
    
    def calculate_criterion_score(self, test_results, checks):
        """Calculate score for a specific criterion based on checks"""
        # This is a placeholder - in practice, this would analyze actual image outputs
        # For testing purposes, we'll return a simulated score
        import random
        return round(random.uniform(6.5, 9.5), 1)
    
    def generate_recommendations(self, scores):
        """Generate improvement recommendations based on scores"""
        recommendations = []
        
        for criterion, data in scores.items():
            if data["score"] < 7:
                if criterion == "subject_preservation":
                    recommendations.append(
                        "Increase ControlNet weights or reduce denoising strength"
                    )
                elif criterion == "oil_painting_authenticity":
                    recommendations.append(
                        "Add more texture-specific terms to positive prompt"
                    )
                elif criterion == "style_distinctiveness":
                    recommendations.append(
                        "Review style-specific vocabulary and techniques"
                    )
                elif criterion == "consistency":
                    recommendations.append(
                        "Narrow parameter ranges or adjust CFG scale"
                    )
        
        return recommendations
    
    def export_test_config(self, output_path="style_test_config.json"):
        """Export the complete configuration for external testing"""
        config = {
            "styles": self.styles,
            "evaluation_criteria": self.evaluation_criteria,
            "test_protocol": {
                "required_test_images": [
                    "close_up_portrait",
                    "full_body_shot",
                    "pet_animal",
                    "landscape_with_figure",
                    "object_still_life"
                ],
                "variations_per_image": 3,
                "success_thresholds": {
                    "excellent": 8.0,
                    "good": 7.0,
                    "acceptable": 6.0
                }
            }
        }
        
        with open(output_path, 'w') as f:
            json.dump(config, f, indent=2)
        
        print(f"Test configuration exported to {output_path}")
        return config
    
    def create_comparison_matrix(self):
        """Create a comparison matrix showing key differences between styles"""
        matrix = {
            "Feature Comparison": {
                "Texture Level": {
                    "Classic Portrait": "Smooth, refined",
                    "Thick & Textured": "Heavy, 3D",
                    "Soft & Dreamy": "Gentle, feathery"
                },
                "Color Application": {
                    "Classic Portrait": "Glazed layers, subtle",
                    "Thick & Textured": "Bold, saturated",
                    "Soft & Dreamy": "Broken color, optical mixing"
                },
                "Brushwork": {
                    "Classic Portrait": "Invisible to minimal",
                    "Thick & Textured": "Prominent, expressive",
                    "Soft & Dreamy": "Visible but soft"
                },
                "Detail Level": {
                    "Classic Portrait": "High, refined",
                    "Thick & Textured": "Moderate, interpretive",
                    "Soft & Dreamy": "Low, atmospheric"
                },
                "Best For": {
                    "Classic Portrait": "Formal portraits, realistic subjects",
                    "Thick & Textured": "Emotional scenes, landscapes",
                    "Soft & Dreamy": "Romantic scenes, gardens, water"
                }
            }
        }
        
        return matrix


def main():
    """Main testing function"""
    tester = OilPaintingStyleTester()
    
    # Export configuration
    config = tester.export_test_config()
    
    # Create comparison matrix
    comparison = tester.create_comparison_matrix()
    
    print("\n" + "="*60)
    print("OIL PAINTING STYLE OPTIMIZATION TEST SUITE")
    print("="*60)
    
    # Display each style's configuration
    for style_key, style_data in tester.styles.items():
        print(f"\n{style_data['name']}")
        print("-" * 40)
        print(f"Key Settings:")
        print(f"  - Sampler: {style_data['settings']['sampler']}")
        print(f"  - Steps: {style_data['settings']['steps']}")
        print(f"  - CFG Scale: {style_data['settings']['cfg_scale']}")
        print(f"  - Denoising: {style_data['settings']['denoising_strength']}")
        
    print("\n" + "="*60)
    print("STYLE COMPARISON MATRIX")
    print("="*60)
    
    for category, features in comparison["Feature Comparison"].items():
        print(f"\n{category}:")
        for style, description in features.items():
            print(f"  {style}: {description}")
    
    print("\n" + "="*60)
    print("Configuration exported to: style_test_config.json")
    print("Use this file with your SD WebUI API for testing")
    print("="*60)


if __name__ == "__main__":
    main()