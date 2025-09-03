# PixCart - AI-Powered Pet Portrait Platform

Transform your pet photos into stunning oil painting masterpieces using Google Gemini AI.

## Features

- 🎨 AI-powered pet photo transformation using Gemini 2.5 Flash Image Preview
- 🖼️ Three artistic styles: Classic Renaissance, Van Gogh, and Monet
- 🔐 Secure authentication with Supabase (Google OAuth)
- 💬 Beta tester feedback system
- 👤 Admin panel for managing users and feedback
- 📱 Fully responsive design

## Tech Stack

- **Frontend**: Next.js 15.5, React 19, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Authentication**: Supabase Auth
- **Database**: Prisma ORM with SQLite (development) / PostgreSQL (production)
- **AI**: Google Gemini 2.5 Flash Image Preview API
- **Deployment**: Vercel

## Environment Variables

Create a `.env.local` file with:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Database
DATABASE_URL=your_database_url
```

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Set up database:
```bash
npx prisma migrate dev
npx prisma db seed
```

3. Run development server:
```bash
npm run dev
```

## Deployment

The app is configured for automatic deployment to Vercel via GitHub Actions with Supabase integration.

### Required GitHub Secrets:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`

## Admin Access

To grant admin access:
1. Run the admin script: `npx tsx scripts/make-admin.ts`
2. Or use the admin panel at `/admin` (requires existing admin)

## License

Private - All rights reserved