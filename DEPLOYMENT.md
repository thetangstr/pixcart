# PetCanvas Deployment Guide

## Overview
PetCanvas uses local AI models for oil painting conversion. This guide covers deployment with access to your local models.

## Architecture
```
[Users] → [Vercel/Netlify] → [Tunnel] → [Local Machine]
                                 ↓
                          [ComfyUI/A1111]
```

## Option 1: Ngrok Tunnel (Quick Setup)

### 1. Install ngrok
```bash
brew install ngrok  # macOS
# or download from https://ngrok.com
```

### 2. Start your local models
```bash
# Terminal 1: ComfyUI
cd /path/to/ComfyUI
python main.py --listen 0.0.0.0 --port 8188

# Terminal 2: A1111 (optional)
cd /path/to/stable-diffusion-webui
./webui.sh --listen --port 7860 --api
```

### 3. Create ngrok tunnels
```bash
# Terminal 3: Tunnel for ComfyUI
ngrok http 8188

# Terminal 4: Tunnel for A1111 (if using)
ngrok http 7860
```

### 4. Update production environment
Copy the ngrok URLs (e.g., `https://abc123.ngrok.io`) to `.env.production`:
```env
COMFYUI_BASE_URL=https://your-comfyui-id.ngrok.io
A1111_BASE_URL=https://your-a1111-id.ngrok.io
```

## Option 2: Tailscale (More Secure)

### 1. Install Tailscale
```bash
# Install from https://tailscale.com/download
curl -fsSL https://tailscale.com/install.sh | sh
```

### 2. Set up Tailscale
```bash
# Login
tailscale up

# Get your machine name
tailscale status
```

### 3. Update production environment
```env
COMFYUI_BASE_URL=http://your-machine.tail-scale.ts.net:8188
A1111_BASE_URL=http://your-machine.tail-scale.ts.net:7860
```

## Option 3: Cloud VM with GPU

### 1. Set up GPU instance (e.g., AWS EC2 g4dn, GCP, or Paperspace)
```bash
# Install CUDA, Python, etc.
# Clone and set up ComfyUI
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI
pip install -r requirements.txt
```

### 2. Configure security groups
- Allow inbound traffic on ports 8188, 7860
- Restrict to your deployment platform IPs

### 3. Update production environment with VM IP
```env
COMFYUI_BASE_URL=http://your-vm-ip:8188
A1111_BASE_URL=http://your-vm-ip:7860
```

## Deployment to Vercel

### 1. Install Vercel CLI
```bash
npm i -g vercel
```

### 2. Configure environment variables
```bash
vercel env add COMFYUI_BASE_URL production
vercel env add A1111_BASE_URL production
vercel env add NEXT_PUBLIC_SITE_URL production
```

### 3. Deploy
```bash
vercel --prod
```

## Deployment to Netlify

### 1. Build the app
```bash
npm run build
```

### 2. Deploy via CLI
```bash
npm install -g netlify-cli
netlify deploy --prod
```

### 3. Set environment variables in Netlify dashboard

## GitHub Actions CI/CD

The project includes GitHub Actions workflows for automated deployment:

1. **Push to main branch** → Deploy to production
2. **Push to staging** → Deploy to staging environment
3. **Pull requests** → Run tests and preview deployment

### Setup GitHub Secrets
Add these secrets to your GitHub repository:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `COMFYUI_BASE_URL`
- `A1111_BASE_URL`

## Security Considerations

### 1. API Key Protection
```typescript
// api/convert/route.ts
const API_KEY = process.env.API_SECRET_KEY

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${API_KEY}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  // ... conversion logic
}
```

### 2. Rate Limiting
```typescript
// middleware.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
})
```

### 3. CORS Configuration
```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: process.env.CORS_ALLOWED_ORIGINS },
        ],
      },
    ]
  },
}
```

## Monitoring

### 1. Health Check Endpoint
```typescript
// app/api/health/route.ts
export async function GET() {
  const comfyuiHealth = await checkComfyUI()
  const a1111Health = await checkA1111()
  
  return Response.json({
    status: 'ok',
    services: {
      comfyui: comfyuiHealth,
      a1111: a1111Health,
    },
    timestamp: new Date().toISOString(),
  })
}
```

### 2. Uptime Monitoring
- Use services like UptimeRobot or Pingdom
- Monitor `/api/health` endpoint
- Set up alerts for downtime

## Fallback Strategy

When local models are unavailable, fall back to cloud services:

```typescript
// lib/modelSelector.ts
async function getAvailableModel() {
  // Try local ComfyUI first
  if (await isComfyUIAvailable()) {
    return 'comfyui'
  }
  
  // Try local A1111
  if (await isA1111Available()) {
    return 'a1111'
  }
  
  // Fall back to Replicate
  if (process.env.REPLICATE_API_TOKEN) {
    return 'replicate'
  }
  
  throw new Error('No models available')
}
```

## Troubleshooting

### Issue: Connection refused to local models
**Solution:** Ensure models are running with `--listen 0.0.0.0` flag

### Issue: CORS errors
**Solution:** Add CORS headers to your API routes or use a proxy

### Issue: Slow processing
**Solution:** 
- Ensure GPU is being used
- Optimize model loading (keep models in memory)
- Use smaller models for preview, larger for final

### Issue: High costs with cloud GPU
**Solution:**
- Use spot/preemptible instances
- Auto-shutdown when idle
- Cache converted images

## Performance Optimization

1. **CDN for static assets**: Use Vercel's edge network or CloudFlare
2. **Image optimization**: Use Next.js Image component with optimization
3. **Database**: Use Vercel KV or Upstash for session/cache storage
4. **Queue system**: Implement BullMQ for processing queue

## Support

For deployment issues:
- Check logs: `vercel logs` or Netlify dashboard
- Monitor: `/api/health` endpoint
- Debug: Enable verbose logging with `DEBUG=*`