// Generate style-specific icons that represent the artistic techniques

const styleIconPrompts = [
  {
    id: 'classic',
    name: 'Classic Portrait Icon',
    prompt: `icon design showing classic oil painting brushstrokes, palette knife texture visible,
             warm brown and gold paint strokes, thick impasto technique demonstration,
             close-up of oil paint texture with visible brush marks, Renaissance style brushwork,
             traditional oil painting surface, varnished finish effect, baroque painting texture`,
    negative: 'portrait, face, person, animal, landscape, text, watermark, photograph, digital art',
    seed: 42
  },
  {
    id: 'vangogh',
    name: 'Van Gogh Style Icon',
    prompt: `icon showing Van Gogh's distinctive swirling brushstrokes, thick yellow and blue paint,
             dynamic circular brush movements, expressive impasto texture, post-impressionist technique,
             energetic paint application, visible paint ridges and valleys, starry night style swirls,
             bold textured strokes, vibrant contrasting colors in thick paint`,
    negative: 'portrait, face, person, animal, sunflowers, landscape, smooth, flat, photograph',
    seed: 123
  },
  {
    id: 'monet',
    name: 'Monet Impressionist Icon',
    prompt: `icon showing soft impressionist brushstrokes, gentle dabs of pastel colors,
             water lily inspired color palette, soft pink blue and green paint dabs,
             loose brushwork pattern, light and airy texture, broken color technique,
             gentle impressionist paint application, dreamy soft focus effect`,
    negative: 'portrait, face, person, animal, sharp details, hard edges, photograph, realistic',
    seed: 789
  },
  {
    id: 'modern',
    name: 'Modern Abstract Icon',  
    prompt: `icon showing modern abstract oil painting technique, bold geometric brushstrokes,
             vibrant contemporary colors, dynamic angular paint application,
             contrast between smooth and textured areas, contemporary art style,
             bold color blocks with visible brush texture, experimental paint techniques`,
    negative: 'portrait, face, person, animal, traditional, classical, photograph, realistic',
    seed: 456
  }
]

export default async function generateStyleIcons() {
  console.log('🎨 Generating Style Icons with Specific Artistic Techniques...\n')
  
  for (const style of styleIconPrompts) {
    console.log(`📍 ${style.name}:`)
    console.log(`   Prompt: ${style.prompt.substring(0, 100)}...`)
    console.log(`   Style ID: ${style.id}`)
    console.log('')
  }
  
  // Create a simple HTML preview to show the prompts
  const htmlPreview = `
<!DOCTYPE html>
<html>
<head>
  <title>Style Icon Prompts</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      background: linear-gradient(to br, #fef3c7, #fed7aa);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 2rem;
      margin-top: 2rem;
    }
    .card {
      background: white;
      border-radius: 1rem;
      padding: 1.5rem;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    }
    .icon-preview {
      width: 100%;
      height: 200px;
      background: linear-gradient(45deg, #f59e0b, #ea580c);
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 3rem;
      margin-bottom: 1rem;
    }
    h2 {
      color: #92400e;
      margin: 0 0 0.5rem 0;
    }
    .prompt {
      color: #78716c;
      font-size: 0.875rem;
      line-height: 1.5;
    }
    .style-id {
      color: #ea580c;
      font-weight: bold;
      margin-top: 1rem;
    }
  </style>
</head>
<body>
  <h1>🎨 PetCanvas Style Icon Prompts</h1>
  <p>These prompts will generate icons that represent each painting style's unique characteristics.</p>
  
  <div class="grid">
    ${styleIconPrompts.map(style => `
      <div class="card">
        <div class="icon-preview">
          ${style.id === 'classic' ? '🖼️' : 
            style.id === 'vangogh' ? '🌻' :
            style.id === 'monet' ? '🪷' : '🎨'}
        </div>
        <h2>${style.name}</h2>
        <p class="prompt">${style.prompt}</p>
        <p class="style-id">Style ID: ${style.id}</p>
      </div>
    `).join('')}
  </div>
  
  <div style="margin-top: 3rem; padding: 2rem; background: white; border-radius: 1rem;">
    <h2>🚀 How to Generate These Icons</h2>
    <ol style="line-height: 2;">
      <li>Use SDXL or any high-quality model</li>
      <li>Set image size to 512x512 for icons</li>
      <li>Use high CFG (9-12) for clear, defined textures</li>
      <li>Add "oil painting texture, thick paint, impasto" to emphasize painterly effects</li>
      <li>Generate 2-3 variations and pick the best</li>
      <li>Post-process: Increase contrast and saturation slightly</li>
    </ol>
  </div>
</body>
</html>
  `
  
  // Save the preview HTML
  const fs = await import('fs/promises')
  const path = await import('path')
  
  const previewPath = path.default.join(process.cwd(), 'public', 'style-icon-prompts.html')
  await fs.writeFile(previewPath, htmlPreview)
  
  console.log('\n✅ Style icon prompts saved!')
  console.log('📄 View prompts at: http://localhost:5174/style-icon-prompts.html')
  console.log('\n🎯 Next Steps:')
  console.log('1. Generate these icons using ComfyUI or Stable Diffusion')
  console.log('2. Save as: classic.jpg, vangogh.jpg, monet.jpg, modern.jpg')
  console.log('3. Place in: public/style-icons/')
  
  return styleIconPrompts
}

// Run if called directly
if (require.main === module) {
  generateStyleIcons()
}

// Export for use in other scripts
export { styleIconPrompts }