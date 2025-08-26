const fs = require('fs')
const path = require('path')

const styles = ['classic_portrait', 'thick_textured', 'soft_impressionist']

async function generateIcons() {
  console.log('🎨 Generating style icons using Stable Diffusion...')
  
  // Create public/icons directory if it doesn't exist
  const iconsDir = path.join(process.cwd(), 'public', 'icons')
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true })
  }
  
  for (const style of styles) {
    try {
      console.log(`\nGenerating icon for ${style}...`)
      
      const response = await fetch('http://localhost:3000/api/generate-icon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ style }),
      })
      
      if (!response.ok) {
        throw new Error(`Failed to generate icon for ${style}`)
      }
      
      const data = await response.json()
      
      // Convert base64 to buffer and save as PNG
      const buffer = Buffer.from(data.image, 'base64')
      const filename = `${style}_icon.png`
      const filepath = path.join(iconsDir, filename)
      
      fs.writeFileSync(filepath, buffer)
      console.log(`✅ Saved ${filename}`)
      
    } catch (error) {
      console.error(`❌ Error generating icon for ${style}:`, error.message)
    }
  }
  
  console.log('\n✨ Icon generation complete!')
  console.log('Icons saved to: public/icons/')
}

// Run the generation
generateIcons().catch(console.error)