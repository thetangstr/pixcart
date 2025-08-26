# Replicate API Setup Guide

## Quick Start (5 minutes)

### 1. Get Your API Token

1. Go to [https://replicate.com](https://replicate.com)
2. Sign up for a free account (you get $5 free credits to start)
3. Go to [https://replicate.com/account/api-tokens](https://replicate.com/account/api-tokens)
4. Click "Create token"
5. Copy your token

### 2. Add to Environment Variables

Add to your `.env.local` file:

```bash
REPLICATE_API_TOKEN=r8_YOUR_TOKEN_HERE
```

### 3. Restart Your Dev Server

```bash
# Stop the server (Ctrl+C) and restart
npm run dev
```

### 4. Test the Integration

Visit: http://localhost:5174/api/convert-replicate

You should see:
```json
{
  "configured": true,
  "credits": 5.00,
  "availableQualities": ["quick", "standard", "fast", "premium"],
  ...
}
```

## Pricing

| Quality | Model | Cost | Speed | Best For |
|---------|-------|------|-------|----------|
| quick | fofr/style-transfer | $0.007 | 8 sec | Testing |
| fast | FLUX.1 [schnell] | $0.01 | 5-10 sec | Quick previews |
| standard | FLUX.1 [dev] | $0.02 | 20-30 sec | Production |
| premium | Neural painting | $0.14 | 11 min | Special cases |

With $5 free credits, you can generate:
- 714 quick images
- 500 fast images  
- 250 standard images
- 35 premium images

## API Usage

### JavaScript/TypeScript

```javascript
const formData = new FormData()
formData.append('image', imageFile)
formData.append('quality', 'standard')  // or 'quick', 'fast', 'premium'
formData.append('style', 'impressionist')  // or 'classic', 'vangogh', 'modern'
formData.append('strength', '0.65')  // 0.3-1.0, how much to change

const response = await fetch('/api/convert-replicate', {
  method: 'POST',
  body: formData
})

const result = await response.json()
// result.image contains the base64 oil painting
```

### Available Styles

- `classic` - Old masters, Rembrandt style
- `impressionist` - Monet, soft brushstrokes
- `vangogh` - Thick impasto, swirling strokes
- `modern` - Contemporary, bold colors

### Strength Parameter

- `0.3-0.4` - Light oil painting effect, preserves most details
- `0.5-0.6` - Balanced transformation
- `0.7-0.8` - Strong oil painting effect
- `0.9-1.0` - Complete artistic transformation

## Monitoring Usage

Check your usage at: https://replicate.com/account/usage

## Tips

1. **Start with "quick" quality** for testing - it's 100x cheaper than premium
2. **Use "standard" for production** - best balance of quality and cost
3. **Save "premium" for special cases** - when customers are ready to order
4. **Batch process during development** to save API calls

## Troubleshooting

### "Replicate API not configured"
- Make sure you added `REPLICATE_API_TOKEN` to `.env.local`
- Restart your dev server after adding the token

### "Insufficient credits"
- Check your balance at https://replicate.com/account/billing
- Add credits or use the free tier more efficiently

### "Conversion failed"
- Check the image format (JPEG/PNG work best)
- Ensure image is under 10MB
- Try reducing the strength parameter

## Support

- Replicate Discord: https://discord.gg/replicate
- API Docs: https://replicate.com/docs
- Billing: https://replicate.com/account/billing