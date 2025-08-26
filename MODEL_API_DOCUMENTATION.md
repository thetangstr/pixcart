# Model API Documentation

## 🚀 Quick Start: Use Our Models From Any App

Your Oil Painting App exposes the ComfyUI models (SD 1.5 and SDXL) via a REST API, so other applications don't need to download these models again.

### Prerequisites
1. Oil Painting App running: `npm run dev` (port 5174)
2. ComfyUI running: `python main.py --port 8188`

### API Endpoint
```
http://localhost:5174/api/models/inference
```

## 📝 API Reference

### Generate Image (POST)

**Endpoint:** `POST /api/models/inference`

**Request Body:**
```json
{
  "model": "sd15",  // or "sdxl"
  "prompt": "oil painting of a sunset",
  "negative_prompt": "photo, digital art",
  "steps": 20,
  "cfg_scale": 7,
  "seed": 42,  // optional
  "width": 512,  // optional (SD1.5 only)
  "height": 512,  // optional (SD1.5 only)
  "image": "base64_string",  // optional (for img2img)
  "strength": 0.75  // optional (for img2img, 0-1)
}
```

**Response:**
```json
{
  "success": true,
  "prompt_id": "abc123",
  "image_url": "http://localhost:8188/view?filename=api_output_00001_.png",
  "filename": "api_output_00001_.png",
  "model": "sd15",
  "processing_time": 15
}
```

### Check Available Models (GET)

**Endpoint:** `GET /api/models/inference`

**Response:**
```json
{
  "status": "online",
  "endpoint": "http://localhost:5174/api/models/inference",
  "available_models": [
    {
      "id": "sd15",
      "name": "Stable Diffusion 1.5",
      "checkpoint": "v1-5-pruned-emaonly.safetensors",
      "default_size": "512x512"
    },
    {
      "id": "sdxl",
      "name": "Stable Diffusion XL",
      "checkpoint": "sd_xl_base_1.0_0.9vae.safetensors",
      "default_size": "1024x1024"
    }
  ]
}
```

## 💻 Usage Examples

### JavaScript/Node.js
```javascript
const response = await fetch('http://localhost:5174/api/models/inference', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'sd15',
    prompt: 'oil painting of a dog',
    steps: 20,
    cfg_scale: 7
  })
})

const result = await response.json()
console.log('Image URL:', result.image_url)
```

### Python
```python
import requests

response = requests.post(
    'http://localhost:5174/api/models/inference',
    json={
        'model': 'sdxl',
        'prompt': 'oil painting masterpiece',
        'steps': 30,
        'cfg_scale': 8
    }
)

result = response.json()
print(f"Image URL: {result['image_url']}")
```

### cURL
```bash
curl -X POST http://localhost:5174/api/models/inference \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sd15",
    "prompt": "oil painting of a mountain",
    "steps": 20
  }'
```

### React Component
```jsx
const GenerateButton = () => {
  const [imageUrl, setImageUrl] = useState(null)
  
  const generate = async () => {
    const res = await fetch('http://localhost:5174/api/models/inference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'sd15',
        prompt: 'oil painting of a forest'
      })
    })
    const data = await res.json()
    setImageUrl(data.image_url)
  }
  
  return (
    <div>
      <button onClick={generate}>Generate</button>
      {imageUrl && <img src={imageUrl} />}
    </div>
  )
}
```

## 🔧 Advanced Usage

### Image-to-Image Transformation
```javascript
// Convert existing image to oil painting style
const imageToOilPainting = async (base64Image) => {
  const response = await fetch('http://localhost:5174/api/models/inference', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'sdxl',
      prompt: 'oil painting, thick brushstrokes, vibrant',
      image: base64Image,
      strength: 0.7,  // 0.3 = subtle, 0.7 = moderate, 0.9 = strong
      steps: 30
    })
  })
  return response.json()
}
```

### Batch Processing
```javascript
const prompts = [
  'oil painting of a cat',
  'oil painting of a dog',
  'oil painting of a bird'
]

const results = await Promise.all(
  prompts.map(prompt => 
    fetch('http://localhost:5174/api/models/inference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'sd15', prompt })
    }).then(r => r.json())
  )
)
```

## 🎯 Model Selection Guide

### SD 1.5 (`sd15`)
- **Best for:** Quick generation, lower VRAM usage
- **Resolution:** 512x512 optimal
- **Speed:** ~15-20 seconds
- **VRAM:** 4-6GB

### SDXL (`sdxl`)
- **Best for:** High quality, detailed images
- **Resolution:** 1024x1024 optimal
- **Speed:** ~30-50 seconds
- **VRAM:** 8-12GB

## ⚙️ Configuration

### Environment Variables
Add to your app's `.env`:
```bash
OIL_PAINTING_API=http://localhost:5174/api/models/inference
```

### Docker Integration
```dockerfile
# Your app's Dockerfile
FROM node:18

# Your app setup...

# Health check for Oil Painting API
HEALTHCHECK CMD curl -f http://host.docker.internal:5174/api/models/inference || exit 1
```

### Docker Compose
```yaml
version: '3.8'
services:
  your-app:
    build: .
    depends_on:
      - oil-painting-api
    environment:
      - OIL_PAINTING_API=http://oil-painting-api:5174/api/models/inference
    
  oil-painting-api:
    network_mode: host  # Access ComfyUI on localhost:8188
    # ... oil painting app config
```

## 🚨 Error Handling

```javascript
try {
  const response = await fetch('http://localhost:5174/api/models/inference', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'sd15', prompt: 'test' })
  })
  
  if (!response.ok) {
    const error = await response.json()
    console.error('API Error:', error.error)
    return
  }
  
  const result = await response.json()
  // Use result...
} catch (err) {
  console.error('Network error:', err)
  // Handle connection failure
}
```

## 📊 Performance Tips

1. **Reuse connections:** Keep HTTP connections alive
2. **Queue management:** Implement your own queue for bulk processing
3. **Caching:** Cache generated images by prompt hash
4. **Load balancing:** Run multiple ComfyUI instances if needed

## 🔒 Security Considerations

For production use:

1. **Add authentication:**
```javascript
// In your API route
const apiKey = request.headers.get('x-api-key')
if (apiKey !== process.env.MODEL_API_KEY) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

2. **Rate limiting:**
```javascript
// Use a rate limiter middleware
import rateLimit from 'express-rate-limit'

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10 // 10 requests per minute
})
```

3. **CORS configuration:**
```javascript
// In next.config.js
module.exports = {
  async headers() {
    return [{
      source: '/api/models/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: 'http://localhost:3000' },
        { key: 'Access-Control-Allow-Methods', value: 'GET,POST' }
      ]
    }]
  }
}
```

## 📞 Support

- **Oil Painting App Issues:** Check http://localhost:5174/admin/models
- **ComfyUI Status:** http://localhost:8188/system_stats
- **Test Endpoint:** `GET http://localhost:5174/api/models/inference`

## 🎉 Benefits

✅ **No duplicate downloads** - Use existing 10GB+ of models
✅ **Centralized management** - Update models in one place
✅ **Shared GPU resources** - Multiple apps use same GPU
✅ **Consistent results** - Same models = same quality
✅ **Easy integration** - Simple REST API

---

Happy generating! 🎨