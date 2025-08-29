# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI-powered oil painting converter web application that transforms photos into hand-painted oil paintings. The business model is: AI preview → order → human artist paints by hand. The app now uses **Google Gemini 2.5 Flash Image Preview** for AI image generation (migrated from Stable Diffusion) and includes authentication, analytics, and evaluation systems.

## Development Commands

```bash
# Development
npm run dev                  # Start dev server on http://localhost:5174
npm run build               # Build for production
npm run start               # Start production server

# Testing
npm run test                # Run Playwright E2E tests
npm run test:headed         # Run tests with browser visible
npm run test:ui            # Open Playwright UI
npm run lint               # Run ESLint and auto-fix
npm run type-check         # TypeScript type checking

# Deployment
vercel --yes --prod        # Deploy to Vercel production
npm run firebase:deploy    # Deploy to Firebase hosting
```

## Architecture

### Core Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Authentication**: Session-based with bcrypt (not NextAuth)
- **Database**: SQLite with custom session management
- **AI Backend**: Stable Diffusion WebUI API (Automatic1111)
- **Deployment**: Vercel or Firebase Hosting
- **Analytics**: Google Analytics GA4 + custom tracking

### API Integration Architecture

The app connects to Stable Diffusion WebUI (A1111) running locally or remotely:

1. **Convert API Flow** (`/api/convert-v3/route.ts`):
   - Receives image upload → converts to base64
   - Applies style parameters from `lib/oilPaintingStyles.ts`
   - Two-stage processing for better quality (if enabled)
   - Uses ControlNet for subject preservation when available
   - Returns converted image as base64

2. **Multi-Pass Processing** (`/api/convert-enhanced/route.ts`):
   - Implements advanced multi-ControlNet pipeline
   - Combines Canny, OpenPose, and Depth for maximum preservation
   - Special handling for animal/pet photos to prevent species transformation

3. **Style System**:
   - 8 predefined styles with RL-optimized parameters
   - Each style has specific denoising_strength, cfg_scale, steps values
   - Parameters optimized through 500+ human evaluations

### Authentication System

Custom session-based auth (not using NextAuth):
- Sessions stored in SQLite database
- Cookie-based session management
- Admin users have special evaluation access
- Located in `/api/auth/` routes

### Evaluation & RL System

Human-in-the-loop evaluation for parameter optimization:
- `/evaluation` - Human evaluation interface
- `/api/evaluation/` - Evaluation data endpoints
- Tracks scores for preservation, artistic quality, overall satisfaction
- Used to optimize SD parameters through reinforcement learning

## Critical Implementation Details

### Dual Backend Support (A1111 + ComfyUI)
The app supports both Automatic1111 and ComfyUI backends:
- **A1111**: Expected at `http://localhost:7860` (default)
- **ComfyUI**: Expected at `http://localhost:8188` (default)
- Users can switch between backends or run comparison mode
- Backend availability is checked via `/api/check-backend` endpoint
- Enhanced upload page at `/upload-enhanced` provides full comparison features

### Subject Preservation
The app uses multiple techniques to preserve subject identity:
- ControlNet (when available) with weights 0.5-0.85
- Low denoising strength (0.15-0.45)
- Two-stage processing for gradual transformation
- Special prompt engineering for pets/animals

### Business Model Integration
The app is designed for: Upload → AI Preview → Order → Hand-painted artwork
- Checkout page is placeholder (Stripe integration incomplete)
- Order flow captures customer info but doesn't process payments
- Gallery showcases examples to drive conversions

### Known Issues & Workarounds
- TypeScript build errors are ignored via `next.config.js` settings
- Firebase connection timeouts during build (can be ignored)
- Large file cleanup needed (remove `stable-diffusion-webui/` folder if present)

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

Optional (for full features):
```
A1111_BASE_URL=http://localhost:7860
COMFYUI_BASE_URL=http://localhost:8188
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
```

## Performance Considerations

- Images are processed synchronously - consider queue system for production
- SD API calls can timeout - implement retry logic
- Large base64 strings in memory - consider streaming for large images
- Build process attempts static generation - use dynamic routes for auth-required pages

## Deployment Notes

When deploying to Vercel:
- Use `.vercelignore` to exclude test files and large directories
- Environment variables must be set in Vercel dashboard
- Build timeouts may occur with Firebase - this is expected
- TypeScript errors are ignored for faster deployment

## Project Status - Ready for Migration

✅ **ComfyUI Integration Complete**
- Pet portrait artistic conversion system implemented
- 3 styles: Classic Oil, Monet Impressionist, Van Gogh
- Real pet photos processed and ready for evaluation
- Complete evaluation interface with star ratings

✅ **Production Ready**
- All dependencies documented
- Migration guide created
- Cleanup completed
- Code committed to GitHub

✅ **No Setup Required on New Machine**
- Processed images included in repository
- Evaluation system works immediately
- Optional ComfyUI setup only needed for new processing

Ready to migrate! 🚀
