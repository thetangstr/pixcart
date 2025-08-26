// EXTREME PRESERVATION MODE - Zero face transformation
// Only change texture to oil painting, NO feature changes

export const extremePreservationSettings = {
  
  // MAXIMUM preservation settings
  controlnet_weights: {
    canny: 1.0,      // MAXIMUM edge preservation
    openpose: 0.0,   // COMPLETELY DISABLE for animals
    depth: 0.25      // Minimal depth, just for texture
  },
  
  // Very low denoising to prevent ANY transformation
  passes: [
    {
      name: 'Texture Only',
      denoising_strength: 0.25,  // VERY LOW - texture change only
      cfg_scale: 3.0,             // ULTRA LOW - maximum preservation
      steps: 20,
      promptModifier: 'exact same subject, only oil paint texture, NO changes to features'
    },
    {
      name: 'Polish',
      denoising_strength: 0.10,  // MINIMAL - just polish
      cfg_scale: 3.5,
      steps: 10,
      promptModifier: 'preserve everything, only enhance paint texture'
    }
  ],
  
  // Extreme preservation prompts
  prompt_overrides: {
    positive: 'EXACT SAME cat face, ZERO changes to features, oil paint TEXTURE ONLY, preserve ALL details exactly, identical subject',
    
    negative: 'different animal, monkey, ape, primate, human, changed face, different features, transformation, morphing, different species, altered appearance, wrong animal, hybrid'
  },
  
  // Alternative approach: Disable ALL ControlNets except Canny
  minimal_mode: {
    controlnets: ['canny'],  // ONLY Canny at maximum
    weights: [1.0],
    denoising: 0.20,         // Absolute minimum
    cfg: 2.5                 // Near zero guidance
  }
}

// FOR IMMEDIATE TESTING
export const textureOnlyMode = {
  // This should ONLY change texture, nothing else
  denoising_strength: 0.15,
  cfg_scale: 2.0,
  steps: 15,
  
  controlnet_config: {
    canny_weight: 1.0,
    openpose_weight: 0.0,  // NEVER use for animals
    depth_weight: 0.0       // Disable completely
  },
  
  prompt: 'oil painting texture only, exact same subject, no transformation',
  negative: 'different face, monkey, primate, human, wrong species, transformation'
}