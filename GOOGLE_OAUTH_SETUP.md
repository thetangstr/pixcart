# Google OAuth Setup Instructions

## 1. Get Google OAuth Credentials

### Go to Google Cloud Console:
https://console.cloud.google.com/apis/credentials

### Create OAuth 2.0 Client ID:
1. Click "CREATE CREDENTIALS" → "OAuth client ID"
2. Application type: **Web application**
3. Name: **Oil Painting App**

### Add ALL these Authorized redirect URIs:
```
http://localhost:3000/api/auth/callback/google
http://localhost:3001/api/auth/callback/google
https://oil-painting-app.vercel.app/api/auth/callback/google
https://pixcarti.web.app/api/auth/callback/google
https://oil-painting-8vj9blb2l-thetangstrs-projects.vercel.app/api/auth/callback/google
```

### Add Authorized JavaScript origins:
```
http://localhost:3000
http://localhost:3001
https://oil-painting-app.vercel.app
https://pixcarti.web.app
```

## 2. Update .env.local

Replace the placeholders in `.env.local`:
```env
GOOGLE_CLIENT_ID=YOUR_ACTUAL_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-YOUR_ACTUAL_SECRET
```

## 3. Update Vercel Environment Variables

Go to: https://vercel.com/thetangstrs-projects/oil-painting-app/settings/environment-variables

Add:
- `GOOGLE_CLIENT_ID` = Your Client ID
- `GOOGLE_CLIENT_SECRET` = Your Client Secret
- `NEXTAUTH_URL` = https://oil-painting-app.vercel.app
- `NEXTAUTH_SECRET` = [Generate with: openssl rand -base64 32]

## 4. Test Login

1. Restart your local dev server:
   ```bash
   npm run dev
   ```

2. Visit http://localhost:3000/auth/signin

3. Click "Sign in with Google"

## Common Issues & Fixes

### "Redirect URI mismatch"
- Make sure you added ALL the redirect URIs listed above
- Check for trailing slashes
- Wait 5 minutes for Google to update

### "401 Unauthorized"
- Check that GOOGLE_CLIENT_SECRET is correct
- Make sure NEXTAUTH_SECRET is set

### "This app isn't verified"
- This is normal for development
- Click "Advanced" → "Go to Oil Painting App (unsafe)"
- For production, you'll need to verify your app with Google