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

# Database (Supabase PostgreSQL)
# Format: postgresql://username:password@db.[PROJECT-REF].supabase.co:5432/postgres
# Note: If your password contains special characters (#, @, etc.), they should be URL-encoded
DATABASE_URL=postgresql://username:password@db.mqkqyigujbamrvebrhsd.supabase.co:5432/postgres
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

The app is automatically deployed to Vercel through direct GitHub integration. Every push to `main` triggers a production deployment, and pull requests get preview deployments.

### Required Vercel Environment Variables:
Configure these in your Vercel project settings:
- `DATABASE_URL` - Supabase PostgreSQL connection string
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `GEMINI_API_KEY` - Google Gemini API key

## Admin Access

To grant admin access:
1. Run the admin script: `npx tsx scripts/make-admin.ts`
2. Or use the admin panel at `/admin` (requires existing admin)

## License

Private - All rights reserved