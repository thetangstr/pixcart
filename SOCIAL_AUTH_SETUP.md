# 🔐 Social Authentication Setup Guide

## OAuth Provider Configuration

### 🟦 Google OAuth Setup

#### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API

#### 2. Create OAuth Credentials
1. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client IDs**
2. Configure OAuth consent screen:
   - User Type: **External**
   - App name: **PetCanvas**
   - User support email: your email
   - App domain: `https://petcanvas.vercel.app`
   - Authorized domains: `vercel.app`
   - Developer contact: your email

3. Create OAuth 2.0 Client ID:
   - Application type: **Web application**
   - Name: **PetCanvas Web**
   - Authorized redirect URIs:
     - `http://localhost:5174/api/auth/callback/google` (development)
     - `https://petcanvas.vercel.app/api/auth/callback/google` (production)

#### 3. Environment Variables
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 🟦 Facebook OAuth Setup

#### 1. Create Facebook App
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create App → **Consumer** → **Next**
3. App name: **PetCanvas**
4. Contact email: your email

#### 2. Configure Facebook Login
1. Add **Facebook Login** product
2. Go to **Facebook Login** → **Settings**
3. Valid OAuth Redirect URIs:
   - `http://localhost:5174/api/auth/callback/facebook`
   - `https://petcanvas.vercel.app/api/auth/callback/facebook`
4. Login from devices: **Yes**

#### 3. App Settings
1. Go to **Settings** → **Basic**
2. Add domains: `localhost`, `petcanvas.vercel.app`
3. Privacy Policy URL: `https://petcanvas.vercel.app/privacy`
4. Terms of Service URL: `https://petcanvas.vercel.app/terms`

#### 4. Environment Variables
```env
FACEBOOK_CLIENT_ID=your_facebook_app_id
FACEBOOK_CLIENT_SECRET=your_facebook_app_secret
```

### 🍎 Apple OAuth Setup

#### 1. Apple Developer Account
1. Go to [Apple Developer](https://developer.apple.com/)
2. Sign in with Apple ID (requires Apple Developer Program membership)

#### 2. Create App ID
1. Go to **Certificates, IDs & Profiles** → **Identifiers**
2. Create new App ID:
   - Description: **PetCanvas**
   - Bundle ID: `com.petcanvas.webapp`
   - Enable **Sign in with Apple**

#### 3. Create Service ID
1. Create new Service ID:
   - Description: **PetCanvas Web**
   - Identifier: `com.petcanvas.webapp.service`
   - Enable **Sign in with Apple**
   - Configure domains:
     - Primary App ID: your App ID from step 2
     - Domains: `petcanvas.vercel.app`, `localhost`
     - Return URLs: 
       - `https://petcanvas.vercel.app/api/auth/callback/apple`
       - `http://localhost:5174/api/auth/callback/apple`

#### 4. Create Private Key
1. Go to **Keys** → Create new key
2. Key Name: **PetCanvas Apple Auth**
3. Enable **Sign in with Apple**
4. Configure key (select your App ID)
5. Download the `.p8` file (keep it secure!)

#### 5. Environment Variables
```env
APPLE_ID=com.petcanvas.webapp.service
APPLE_SECRET=your_jwt_secret
```

**Note**: Apple Secret is a JWT token you need to generate using your private key.

## 🔧 NextAuth Configuration

The app is already configured with all providers in `/app/api/auth/[...nextauth]/route.ts`.

### Complete Environment Variables

Add to your `.env.local`:

```env
# NextAuth
NEXTAUTH_SECRET=your_nextauth_secret_key
NEXTAUTH_URL=http://localhost:5174

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Facebook OAuth
FACEBOOK_CLIENT_ID=your_facebook_app_id
FACEBOOK_CLIENT_SECRET=your_facebook_app_secret

# Apple OAuth  
APPLE_ID=com.petcanvas.webapp.service
APPLE_SECRET=your_jwt_secret

# Database (Firestore)
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY="your_firebase_private_key"
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
```

### GitHub Secrets (Production)

Add these secrets in GitHub repository settings:

```
NEXTAUTH_SECRET=your_nextauth_secret_key
NEXTAUTH_URL=https://petcanvas.vercel.app
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FACEBOOK_CLIENT_ID=your_facebook_app_id
FACEBOOK_CLIENT_SECRET=your_facebook_app_secret
APPLE_ID=com.petcanvas.webapp.service
APPLE_SECRET=your_jwt_secret
```

## 🧪 Testing Social Login

### 1. Start Development Server
```bash
npm run dev
```

### 2. Test OAuth Flow
1. Go to `http://localhost:5174/auth/signin`
2. Click on each social login button
3. Complete OAuth flow
4. Verify redirection to `/upload`

### 3. Check Database
Verify user creation in Firestore console.

## 🎯 Public Access Configuration

The app is configured to work without whitelist restrictions. Users can sign up with any OAuth provider and start creating oil paintings immediately.

### Remove Whitelist (Already Done)
The authentication has been updated to allow public access while maintaining admin controls for the feedback system.

## 🚨 Security Considerations

### 1. Production Domains
- Only add your actual production domains to OAuth providers
- Never use `localhost` domains in production

### 2. Secrets Management
- Use strong, random values for `NEXTAUTH_SECRET`
- Store all secrets securely
- Rotate secrets regularly

### 3. OAuth App Review
- Submit Facebook app for review if using advanced features
- Apple Sign In requires App Store Connect setup for production

## 🔄 OAuth App Status

### Development (Ready)
- ✅ Google: Works immediately
- ✅ Facebook: Works in development mode
- ⚠️ Apple: Requires developer account

### Production (Requires Review)
- ✅ Google: No review needed
- ⏳ Facebook: Submit for app review
- ⏳ Apple: Requires Apple Developer Program

## 📱 Mobile Considerations

When deploying to mobile (React Native, etc.):
- Update redirect URLs for mobile deep links
- Configure mobile-specific OAuth settings
- Test on actual devices

## 🆘 Troubleshooting

### Common Issues

1. **"Invalid redirect URI"**
   - Check redirect URLs match exactly in OAuth provider
   - Ensure no trailing slashes

2. **"App not approved"** (Facebook)
   - Use development mode for testing
   - Submit app for review for public use

3. **"Invalid client"** (Google)
   - Verify client ID and secret are correct
   - Check if OAuth consent screen is published

4. **Apple Sign In not working**
   - Verify Apple Developer Program membership
   - Check Service ID configuration
   - Ensure domains are verified

### Debug Mode
```bash
# Enable NextAuth debug logging
NEXTAUTH_DEBUG=true npm run dev
```

## ✅ Quick Test Checklist

- [ ] Google OAuth works in development
- [ ] Facebook OAuth works in development  
- [ ] Apple OAuth configured (if dev account available)
- [ ] Users can sign in and access `/upload`
- [ ] User data saves to Firestore
- [ ] Admin functions work with social login
- [ ] Production environment variables set
- [ ] OAuth apps configured for production domains

## 🎉 Success!

Once configured, users can sign in with:
- **Google** - Instant access
- **Facebook** - Instant access (dev mode) 
- **Apple** - Instant access (with dev account)
- **Email/Password** - Traditional flow

All authentication flows redirect to `/upload` where users can start creating oil paintings! 🎨🐕