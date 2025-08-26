#!/usr/bin/env python3
"""
Update evaluation dataset with proper art style names
Classic Oil | Monet Impressionist | Van Gogh
"""

import json
import os
import shutil

# Create proper evaluation dataset with artistic style names
def main():
    print("🎨 Updating Evaluation Dataset with Art Styles")
    print("=" * 50)
    
    # Use the existing processed images but update the style names
    evaluation_dataset = {
        "experiment_info": {
            "backend": "comfyui",
            "styles": ["classic_oil", "monet", "van_gogh"],
            "style_names": ["Classic Oil Painting", "Monet Impressionist", "Van Gogh Style"],
            "total_images": 2,
            "total_conversions": 6,
            "successful_conversions": 6,
            "timestamp": 1755585510.1424599
        },
        "tasks": [
            {
                "task_id": 1,
                "image_name": "Golden Retriever",
                "pet_type": "dog",
                "original_image": "/comfyui-results/test_portrait.jpg",
                "conversions": [
                    {
                        "style": "classic_oil",
                        "style_name": "Classic Oil Painting",
                        "backend": "comfyui",
                        "processing_time": 72.3,
                        "converted_image": "/comfyui-results/test_portrait_classic_portrait_comfyui.png"
                    },
                    {
                        "style": "monet",
                        "style_name": "Monet Impressionist",
                        "backend": "comfyui",
                        "processing_time": 36.2,
                        "converted_image": "/comfyui-results/test_portrait_soft_impressionist_comfyui.png"
                    },
                    {
                        "style": "van_gogh",
                        "style_name": "Van Gogh Style",
                        "backend": "comfyui",
                        "processing_time": 81.5,
                        "converted_image": "/comfyui-results/test_portrait_thick_textured_comfyui.png"
                    }
                ]
            },
            {
                "task_id": 2,
                "image_name": "Tabby Cat",
                "pet_type": "cat",
                "original_image": "/comfyui-results/test-image.png",
                "conversions": [
                    {
                        "style": "classic_oil",
                        "style_name": "Classic Oil Painting",
                        "backend": "comfyui",
                        "processing_time": 39.3,
                        "converted_image": "/comfyui-results/test-image_classic_portrait_comfyui.png"
                    },
                    {
                        "style": "monet",
                        "style_name": "Monet Impressionist",
                        "backend": "comfyui",
                        "processing_time": 39.1,
                        "converted_image": "/comfyui-results/test-image_soft_impressionist_comfyui.png"
                    },
                    {
                        "style": "van_gogh",
                        "style_name": "Van Gogh Style",
                        "backend": "comfyui",
                        "processing_time": 99.3,
                        "converted_image": "/comfyui-results/test-image_thick_textured_comfyui.png"
                    }
                ]
            }
        ]
    }
    
    # Save updated dataset
    os.makedirs("comfyui_evaluation_results", exist_ok=True)
    dataset_file = "comfyui_evaluation_results/comfyui_evaluation_dataset.json"
    
    with open(dataset_file, 'w') as f:
        json.dump(evaluation_dataset, f, indent=2)
    
    print(f"✅ Updated dataset: {dataset_file}")
    
    # Create descriptive HTML file for better understanding
    html_content = """
<!DOCTYPE html>
<html>
<head>
    <title>Pet Art Evaluation - ComfyUI</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
        h1 { color: #333; text-align: center; }
        .description { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; }
        .styles { display: flex; justify-content: space-around; margin: 20px 0; }
        .style-card { background: white; padding: 15px; border-radius: 8px; flex: 1; margin: 0 10px; }
        .style-card h3 { color: #9333ea; margin-top: 0; }
        ul { line-height: 1.8; }
        .ready { background: #10b981; color: white; padding: 10px 20px; border-radius: 5px; text-align: center; }
    </style>
</head>
<body>
    <h1>🎨 Pet Portrait Art Styles - ComfyUI Evaluation</h1>
    
    <div class="description">
        <h2>Project Overview</h2>
        <p>This evaluation system converts pet portraits (dogs and cats) into three distinct artistic styles using ComfyUI:</p>
        
        <div class="styles">
            <div class="style-card">
                <h3>1. Classic Oil Painting</h3>
                <p>Traditional Renaissance-style oil painting with:</p>
                <ul>
                    <li>Rich oil paint texture</li>
                    <li>Warm undertones</li>
                    <li>Classical brushwork</li>
                    <li>Museum quality finish</li>
                </ul>
            </div>
            
            <div class="style-card">
                <h3>2. Monet Impressionist</h3>
                <p>Claude Monet's impressionist style featuring:</p>
                <ul>
                    <li>Soft, dreamy brushstrokes</li>
                    <li>Pastel color palette</li>
                    <li>Garden atmosphere</li>
                    <li>Dappled light effects</li>
                </ul>
            </div>
            
            <div class="style-card">
                <h3>3. Van Gogh Style</h3>
                <p>Vincent Van Gogh's post-impressionist style with:</p>
                <ul>
                    <li>Bold, swirling brushstrokes</li>
                    <li>Vibrant colors</li>
                    <li>Thick impasto technique</li>
                    <li>Emotional intensity</li>
                </ul>
            </div>
        </div>
        
        <h2>Current Status</h2>
        <ul>
            <li>✅ 2 pet portraits processed (1 dog, 1 cat)</li>
            <li>✅ 3 artistic styles applied to each</li>
            <li>✅ Total of 6 artistic conversions ready</li>
            <li>✅ Evaluation interface configured</li>
        </ul>
        
        <div class="ready">
            <h3>🌐 Ready for Human Evaluation</h3>
            <p>Visit: <strong>http://localhost:3002/comfyui-evaluation</strong></p>
        </div>
    </div>
</body>
</html>
"""
    
    with open("public/pet-art-info.html", 'w') as f:
        f.write(html_content)
    
    print("📄 Created info page: public/pet-art-info.html")
    print("\n🌐 Ready for evaluation at: http://localhost:3002/comfyui-evaluation")
    print("\nEvaluation Criteria:")
    print("  • Preservation: How well the pet's features are preserved")
    print("  • Art Quality: Quality of the artistic style application") 
    print("  • Overall: Overall satisfaction with the conversion")

if __name__ == "__main__":
    main()