// LoRA Manager for Oil Painting Effects
// Manages LoRA models for enhanced oil painting conversions

export interface LoRAModel {
  id: string
  name: string
  filename: string
  url: string
  trigger?: string
  defaultWeight: number
  minWeight: number
  maxWeight: number
  description: string
  styleCompatibility: string[] // Which styles work best with this LoRA
  tags: string[]
  downloaded?: boolean
}

// Curated list of oil painting LoRAs from Civitai and other sources
// These have been selected for quality and compatibility with SD 1.5
export const recommendedLoRAs: LoRAModel[] = [
  {
    id: 'oil_painting_style',
    name: 'Oil Painting Style',
    filename: 'oil_painting_style_v1.safetensors',
    url: 'https://civitai.com/api/download/models/123456', // Replace with actual URL
    trigger: 'oil painting style',
    defaultWeight: 0.7,
    minWeight: 0.3,
    maxWeight: 1.0,
    description: 'General oil painting enhancement with authentic brushwork',
    styleCompatibility: ['classic_portrait', 'soft_impressionist'],
    tags: ['oil', 'painting', 'brushwork', 'texture']
  },
  {
    id: 'impasto_thick',
    name: 'Impasto Texture',
    filename: 'impasto_texture_v2.safetensors',
    url: 'https://civitai.com/api/download/models/234567', // Replace with actual URL
    trigger: 'thick impasto',
    defaultWeight: 0.6,
    minWeight: 0.2,
    maxWeight: 0.9,
    description: 'Enhances thick paint texture and dimensional effects',
    styleCompatibility: ['thick_textured'],
    tags: ['impasto', 'texture', 'thick', 'dimensional']
  },
  {
    id: 'classical_art',
    name: 'Classical Art Style',
    filename: 'classical_art_v1.safetensors',
    url: 'https://civitai.com/api/download/models/345678', // Replace with actual URL
    trigger: 'classical art',
    defaultWeight: 0.5,
    minWeight: 0.2,
    maxWeight: 0.8,
    description: 'Renaissance and baroque painting techniques',
    styleCompatibility: ['classic_portrait'],
    tags: ['classical', 'renaissance', 'baroque', 'traditional']
  },
  {
    id: 'brushstroke_master',
    name: 'Brushstroke Master',
    filename: 'brushstroke_master_v3.safetensors',
    url: 'https://civitai.com/api/download/models/456789', // Replace with actual URL
    trigger: 'masterful brushstrokes',
    defaultWeight: 0.6,
    minWeight: 0.3,
    maxWeight: 0.9,
    description: 'Detailed brushstroke patterns and techniques',
    styleCompatibility: ['classic_portrait', 'thick_textured', 'soft_impressionist'],
    tags: ['brushstroke', 'technique', 'detail', 'master']
  },
  {
    id: 'impressionist_light',
    name: 'Impressionist Light',
    filename: 'impressionist_light_v1.safetensors',
    url: 'https://civitai.com/api/download/models/567890', // Replace with actual URL
    trigger: 'impressionist lighting',
    defaultWeight: 0.5,
    minWeight: 0.2,
    maxWeight: 0.7,
    description: 'Soft, dappled light effects for impressionist style',
    styleCompatibility: ['soft_impressionist'],
    tags: ['impressionist', 'light', 'soft', 'monet']
  }
]

// LoRA combinations for different styles
export const styleLoRACombinations: Record<string, { loraId: string; weight: number }[]> = {
  classic_portrait: [
    { loraId: 'oil_painting_style', weight: 0.6 },
    { loraId: 'classical_art', weight: 0.5 },
    { loraId: 'brushstroke_master', weight: 0.4 }
  ],
  thick_textured: [
    { loraId: 'impasto_thick', weight: 0.7 },
    { loraId: 'brushstroke_master', weight: 0.6 },
    { loraId: 'oil_painting_style', weight: 0.4 }
  ],
  soft_impressionist: [
    { loraId: 'impressionist_light', weight: 0.6 },
    { loraId: 'oil_painting_style', weight: 0.5 },
    { loraId: 'brushstroke_master', weight: 0.3 }
  ]
}

// Helper function to generate LoRA prompt syntax
export function generateLoRAPrompt(loras: { loraId: string; weight: number }[]): string {
  return loras
    .map(({ loraId, weight }) => {
      const lora = recommendedLoRAs.find(l => l.id === loraId)
      if (!lora) return ''
      return `<lora:${lora.filename.replace('.safetensors', '')}:${weight}>`
    })
    .filter(Boolean)
    .join(' ')
}

// Helper function to get LoRA triggers
export function getLoRATriggers(loras: { loraId: string; weight: number }[]): string {
  return loras
    .map(({ loraId }) => {
      const lora = recommendedLoRAs.find(l => l.id === loraId)
      return lora?.trigger || ''
    })
    .filter(Boolean)
    .join(', ')
}

// Check if LoRA is installed
export async function checkLoRAInstalled(filename: string): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:7860/sdapi/v1/loras')
    if (!response.ok) return false
    
    const loras = await response.json()
    return loras.some((lora: any) => 
      lora.name === filename || 
      lora.name === filename.replace('.safetensors', '')
    )
  } catch (error) {
    console.error('Error checking LoRA installation:', error)
    return false
  }
}

// Get all installed LoRAs
export async function getInstalledLoRAs(): Promise<string[]> {
  try {
    const response = await fetch('http://localhost:7860/sdapi/v1/loras')
    if (!response.ok) return []
    
    const loras = await response.json()
    return loras.map((lora: any) => lora.name)
  } catch (error) {
    console.error('Error fetching installed LoRAs:', error)
    return []
  }
}

// Download LoRA script generator (for manual download)
export function generateDownloadScript(loras: LoRAModel[]): string {
  const script = loras.map(lora => 
    `# Download ${lora.name}\ncurl -L -o "/Users/Kailor/Desktop/Projects/pixcart_v2/stable-diffusion-webui/models/Lora/${lora.filename}" "${lora.url}"`
  ).join('\n\n')
  
  return `#!/bin/bash
# LoRA Download Script for Oil Painting Styles
# Run this script to download recommended LoRA models

cd /Users/Kailor/Desktop/Projects/pixcart_v2/stable-diffusion-webui/models/Lora

${script}

echo "LoRA downloads complete!"
`
}

// Adaptive LoRA weight adjustment based on image characteristics
export function adaptLoRAWeights(
  baseWeights: { loraId: string; weight: number }[],
  imageAnalysis: {
    hasHumanFace?: boolean
    hasPet?: boolean
    isLandscape?: boolean
    dominantColors?: string[]
    brightness?: number
  }
): { loraId: string; weight: number }[] {
  return baseWeights.map(({ loraId, weight }) => {
    let adjustedWeight = weight
    
    // Reduce weight for portraits to preserve identity
    if ((imageAnalysis.hasHumanFace || imageAnalysis.hasPet) && loraId === 'impasto_thick') {
      adjustedWeight *= 0.7
    }
    
    // Increase impressionist weight for landscapes
    if (imageAnalysis.isLandscape && loraId === 'impressionist_light') {
      adjustedWeight *= 1.2
    }
    
    // Adjust based on brightness
    if (imageAnalysis.brightness) {
      if (imageAnalysis.brightness < 0.3 && loraId === 'classical_art') {
        adjustedWeight *= 1.1 // Enhance classical style for dark images
      }
    }
    
    // Clamp to valid range
    const lora = recommendedLoRAs.find(l => l.id === loraId)
    if (lora) {
      adjustedWeight = Math.max(lora.minWeight, Math.min(lora.maxWeight, adjustedWeight))
    }
    
    return { loraId, weight: Number(adjustedWeight.toFixed(2)) }
  })
}