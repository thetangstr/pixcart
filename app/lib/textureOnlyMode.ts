// TEXTURE-ONLY MODE: Preserve exact geometry, change only surface texture
// This should turn photos into oil paintings WITHOUT changing ANY features

export const textureOnlySettings = {
  // Core principle: MINIMAL changes, MAXIMUM preservation
  
  soft_impressionist_texture: {
    passes: {
      initial: {
        name: 'Texture Transfer',
        description: 'Apply oil paint texture without changing structure',
        denoising_strength: 0.15,  // EXTREMELY LOW
        cfg_scale: 2.0,            // NEAR ZERO guidance
        steps: 15,
        promptModifier: 'exact geometric structure, oil paint texture only'
      }
      // NO second pass - too risky
    },
    
    controlnets: [
      {
        model: 'control_v11p_sd15_canny',
        weight: 1.0,  // ABSOLUTE MAXIMUM
        controlMode: 'ControlNet is more important'  // ControlNet dominates
      }
      // NO OTHER CONTROLNETS
    ],
    
    promptStructure: {
      // Simplified, preservation-focused
      medium: 'oil paint texture',
      subjectPreservation: 'EXACT geometric structure, IDENTICAL features, NO transformation',
      styleKeywords: 'brushstroke texture only',
      // Remove artist influence - it changes features
      artistInfluence: '',
      lighting: 'preserve original lighting',
      technicalDetails: 'surface texture change only',
      vaeCompensation: 'maintain exact details'
    },
    
    negativePromptStructure: {
      subjectProtection: 'ANY change to features, different face, transformation, morphing',
      styleExclusions: 'abstract, surreal, fantasy',
      qualityIssues: 'distortion, wrong anatomy, different species, monkey, primate, human'
    }
  }
}

// Test configuration for immediate use
export const ultraSafeMode = {
  denoising: 0.12,   // Almost nothing
  cfg: 1.5,          // Barely any guidance
  steps: 10,         // Quick and safe
  canny: 1.0,        // Full preservation
  openpose: 0.0,     // Completely off
  depth: 0.0,        // Completely off
  
  prompt: 'oil paint texture on surface, exact same geometry',
  negative: 'changed features, different face, transformation, wrong species'
}