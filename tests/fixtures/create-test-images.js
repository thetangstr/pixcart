const fs = require('fs')
const path = require('path')

// Create a simple test JPEG
const createTestJpeg = (filename, sizeInKB = 100) => {
  // JPEG header
  const jpegHeader = Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
    0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
    0x00, 0x01, 0x00, 0x00
  ])
  
  // Create dummy data to reach desired size
  const dataSize = sizeInKB * 1024 - jpegHeader.length - 2
  const dummyData = Buffer.alloc(dataSize, 0xFF)
  
  // JPEG footer
  const jpegFooter = Buffer.from([0xFF, 0xD9])
  
  // Combine all parts
  const jpeg = Buffer.concat([jpegHeader, dummyData, jpegFooter])
  
  fs.writeFileSync(path.join(__dirname, filename), jpeg)
  console.log(`Created ${filename} (${sizeInKB}KB)`)
}

// Create test images
console.log('Creating test fixtures...')

// Valid dog image (100KB)
createTestJpeg('test-dog.jpg', 100)

// Large file (11MB - over limit)
createTestJpeg('large-file.jpg', 11000)

// Another valid pet image
createTestJpeg('test-cat.jpg', 200)

// Non-pet image
createTestJpeg('landscape.jpg', 150)

// Multiple pets
createTestJpeg('three-dogs.jpg', 250)

// Create invalid GIF file
const gifHeader = Buffer.from('GIF89a', 'ascii')
fs.writeFileSync(path.join(__dirname, 'invalid.gif'), gifHeader)
console.log('Created invalid.gif')

console.log('✅ All test fixtures created!')