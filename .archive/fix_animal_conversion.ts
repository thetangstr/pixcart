// Fixes for animal/pet conversions based on the cat result

export const animalOptimizedSettings = {
  // Detect if image contains animals and adjust accordingly
  detectAnimal: async (imageBase64: string): Promise<boolean> => {
    // This would use an image classification API or local model
    // For now, return based on user selection or auto-detection
    return true; // Placeholder
  },

  // Adjusted parameters for animal subjects
  animalControlNetWeights: {
    canny: 0.90,      // INCREASE: Stronger edge preservation for features
    openpose: 0.15,   // DECREASE: OpenPose is for humans, reduce interference
    depth: 0.40       // MAINTAIN: Good for 3D structure
  },

  // Enhanced prompt for animals
  animalPromptEnhancements: {
    subjectPreservation: 'EXACT same animal, preserve ALL features, maintain EXACT fur color, NO species change, NO humanization',
    
    negativePrompt: 'human face, human features, anthropomorphic, cartoon, different animal, wrong species, color change',
    
    additionalKeywords: 'accurate animal anatomy, natural animal proportions, authentic fur texture'
  },

  // Recommended settings for cat image
  catOptimizedConfig: {
    style: 'soft_impressionist',
    
    passes: [
      {
        name: 'Foundation',
        denoising_strength: 0.45,  // Slightly lower to preserve more
        cfg_scale: 5.0,
        steps: 30,
        controlnet_overrides: {
          canny: 0.95,    // Very strong for facial features
          openpose: 0.10, // Minimal - just for general pose
          depth: 0.40
        }
      },
      {
        name: 'Enhancement',
        denoising_strength: 0.12,  // Very gentle refinement
        cfg_scale: 5.5,
        steps: 15,
        controlnet_overrides: {
          canny: 0.85,
          openpose: 0.05, // Almost none
          depth: 0.35
        }
      }
    ]
  }
}