export interface OilPaintingStyle {
  id: string
  name: string
  description: string
  icon: string
  preview?: string
  premiumLabel?: string
  colorPalette?: string[]
  positive_prompt: string
  negative_prompt: string
  cfg_scale: number
  denoising_strength: number
  steps: number
  sampler: string
}

export const oilPaintingStyles: OilPaintingStyle[] = [
  {
    id: 'classic_portrait',
    name: 'Classic Portrait',
    description: 'Like a Renaissance painting - smooth, refined, timeless',
    icon: '🖼️',
    colorPalette: ['#D4A574', '#8B7355', '#F5DEB3', '#CD853F'],
    positive_prompt: 'EXACT SAME subject, NO CHANGES to identity, preserve all features, ((Renaissance oil painting on canvas:1.4)), ((classical brushwork:1.3)), old master technique, ((subtle impasto:1.2)), warm lighting, ((glazing layers:1.2)), Rembrandt style, ((canvas texture:1.2)), museum quality, ((painterly but recognizable:1.3)), traditional pigments, varnished surface, baroque portrait style, subject remains identical',
    negative_prompt: 'different animal, wrong species, transformation, mutation, hybrid creature, chimera, merged animals, distorted features, extra limbs, missing parts, changed identity, photograph, digital art, 3d render, smooth, flat, watercolor, anime, cartoon, photorealistic, modern, abstract, deformed anatomy',
    cfg_scale: 6.5,  // RL optimized: best performing value
    denoising_strength: 0.40,  // RL optimized: improved preservation
    steps: 50,  // RL optimized: optimal quality/speed balance
    sampler: 'DPM++ 2M SDE Karras'
  },
  {
    id: 'thick_textured',
    name: 'Thick & Textured', 
    description: 'Van Gogh style - bold strokes you can almost touch',
    icon: '🌻',
    colorPalette: ['#FF6B35', '#004E89', '#FFC107', '#8E24AA'],
    positive_prompt: 'EXACT SAME subject identity preserved, ((Van Gogh style thick oil paint:1.3)), ((expressive brushstrokes:1.3)), ((visible paint texture:1.2)), swirling strokes, ((paint ridges:1.2)), vibrant colors, ((palette knife technique:1.2)), dimensional paint, energetic style but subject unchanged, ((textured surface:1.2)), thick application, post-impressionist style, subject features maintained',
    negative_prompt: 'different animal, species change, transformation, wrong creature, mutated, hybrid, distorted identity, altered features, photograph, smooth, digital, 3d, flat, thin paint, watercolor, photorealistic, clean, perfect, airbrushed, CGI, vector, changed subject',
    cfg_scale: 6.5,  // RL optimized: reduced for better results
    denoising_strength: 0.45,  // RL optimized: balanced value
    steps: 40,  // RL optimized: increased for quality
    sampler: 'Euler a'
  },
  {
    id: 'soft_impressionist',
    name: 'Soft & Dreamy',
    description: 'Monet style - gentle, romantic, bathed in light',
    icon: '🪷',
    colorPalette: ['#FFE4E1', '#E6E6FA', '#F0E68C', '#98FB98'],
    positive_prompt: 'PRESERVE subject identity completely, ((Monet impressionist oil painting:1.2)), ((soft brushstrokes:1.2)), ((dappled light effect:1.1)), gentle paint application, ((subtle impasto:1.1)), atmospheric mood, ((loose but controlled brushwork:1.2)), soft edges, ((oil paint texture:1.2)), dreamy quality, subject remains recognizable, impressionist technique, romantic atmosphere',
    negative_prompt: 'different animal, species transformation, wrong identity, mutated creature, changed features, distorted subject, photorealistic, smooth, digital, 3d render, photograph, sharp edges, hard focus, flat, CGI, perfect, symmetrical, vector, modern',
    cfg_scale: 5.0,  // RL optimized: best performing (0.950 score)
    denoising_strength: 0.50,  // RL optimized: optimal value
    steps: 40,  // RL optimized: best quality/speed ratio
    sampler: 'DPM++ 2M SDE Karras'
  }
]

export function getStyleById(id: string): OilPaintingStyle | undefined {
  return oilPaintingStyles.find(style => style.id === id)
}

export function getDefaultStyle(): OilPaintingStyle {
  return oilPaintingStyles[0]
}