# Required GitHub Secrets for Deployment

## FIREBASE_SERVICE_ACCOUNT

You need to add a GitHub secret named `FIREBASE_SERVICE_ACCOUNT` with your complete Firebase service account JSON.

1. Go to: https://github.com/thetangstr/pixcarti/settings/secrets/actions
2. Click "New repository secret"
3. Name: `FIREBASE_SERVICE_ACCOUNT`
4. Value: Paste your complete Firebase service account JSON (the one you provided earlier)

The JSON should look like:
```json
{
  "type": "service_account",
  "project_id": "pixcarti",
  "private_key_id": "your-key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@pixcarti.iam.gserviceaccount.com",
  ...
}
```

## Other Required Secrets

Make sure you also have:
- `NEXTAUTH_SECRET` - A random 32+ character string
- `FIREBASE_PROJECT_ID` - pixcarti
- `FIREBASE_CLIENT_EMAIL` - Your Firebase service account email
- `FIREBASE_PRIVATE_KEY` - Your Firebase private key (from the JSON)

## Triggering Deployment

Once the `FIREBASE_SERVICE_ACCOUNT` secret is added, the deployment will automatically run when you push to the main branch.# Trigger deployment
