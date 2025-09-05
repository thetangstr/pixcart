# Fix Invalid Gemini API Key Issue

## Problem
The GEMINI_API_KEY is set in Vercel but it's **INVALID**. The key `AIzaSyB0QRFg7tayl1jW9oDkUfFST5K7hSx2EzM` returns:
```
API key not valid. Please pass a valid API key.
```

## Solution - Get a NEW Valid API Key

### Step 1: Create a New Gemini API Key
1. Go to https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click **"Create API key"**
4. Choose "Create API key in new project" or select existing project
5. Copy the new API key (it should start with `AIza...`)

### Step 2: Test the New Key Locally
Before updating Vercel, test that your new key works:

```javascript
// Save this as test-key.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function test() {
  const genAI = new GoogleGenerativeAI("YOUR_NEW_KEY_HERE");
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent("Hello");
  console.log("✅ Key works!");
}
test();
```

Run: `node test-key.js`

### Step 3: Update Vercel Environment Variable
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Click on `GEMINI_API_KEY`
3. Replace the old invalid key with your new working key
4. Click **Save**

### Step 4: Redeploy
1. Go to Deployments tab in Vercel
2. Click the three dots on the latest deployment
3. Select **"Redeploy"**
4. Choose "Use existing Build Cache" → **Redeploy**

## Why This Happened
The current key is either:
- Not activated for Gemini API
- From a deleted Google Cloud project
- Has exceeded its quota/limits
- Was revoked or expired

## Verify It's Working
After redeployment, test at: https://oil-painting-app.vercel.app/api/health/gemini

You should see:
```json
{
  "status": "healthy",
  "service": "gemini",
  "message": "Gemini API is configured and ready"
}
```

## Important Notes
- The key must be enabled for **Generative Language API** in Google Cloud Console
- Free tier allows 60 requests per minute
- Make sure the project has the API enabled