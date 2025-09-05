# Database Configuration for Supabase + Vercel

## IMPORTANT: Use Pooler Connection for Vercel

### ❌ WRONG (Direct Connection - Port 5432)
```
DATABASE_URL="postgresql://pixcart:password@db.mqkqyigujbamrvebrhsd.supabase.co:5432/postgres"
```
This will cause "Can't reach database server" errors in serverless environments!

### ✅ CORRECT (Pooler Connection - Port 6543)
```
DATABASE_URL="postgresql://postgres.mqkqyigujbamrvebrhsd:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
```

## How to Get the Correct Connection String

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Settings** → **Database**
4. Find the **Connection string** section
5. Select **"Transaction"** mode (recommended for serverless)
6. Copy the connection string

## Connection String Components

| Component | Direct (Wrong) | Pooler (Correct) |
|-----------|---------------|------------------|
| User | `pixcart` or custom | `postgres.[project-ref]` |
| Host | `db.[project-ref].supabase.co` | `aws-0-[region].pooler.supabase.com` |
| Port | `5432` | `6543` |
| Database | `postgres` | `postgres` |
| Parameters | None | `?pgbouncer=true&connection_limit=1` |

## Why This Matters

Vercel runs your API routes as **serverless functions** that:
- Start and stop frequently
- Can run multiple instances simultaneously
- Have limited connection capacity

The pooler connection (PgBouncer):
- Manages connection pooling efficiently
- Prevents "too many connections" errors
- Handles serverless cold starts properly
- Reduces connection overhead

## Setting in Vercel

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Update `DATABASE_URL` with the pooler connection string
5. Make sure it's set for all environments (Production, Preview, Development)

## Testing the Connection

After updating, test with:
```bash
curl https://your-app.vercel.app/api/user/usage
```

Should return 401 (not 500) if the database connection is working.

## Troubleshooting

If you still get connection errors:
1. Check if the password contains special characters (may need URL encoding)
2. Verify the Supabase project is active (not paused)
3. Check Supabase dashboard for any connection limit warnings
4. Try adding `&connect_timeout=10` to the connection string

## Example for Project mqkqyigujbamrvebrhsd

Based on your project reference, the correct format should be:
```
DATABASE_URL="postgresql://postgres.mqkqyigujbamrvebrhsd:[YOUR-DATABASE-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
```

Replace `[YOUR-DATABASE-PASSWORD]` with your actual database password from Supabase.