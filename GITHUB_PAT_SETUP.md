# GitHub Personal Access Token Setup

## Required for Auto-Fix Workflow

The deployment monitor workflow requires a Personal Access Token (PAT) to trigger other workflows. The default `GITHUB_TOKEN` doesn't have sufficient permissions for this.

## Setup Instructions

1. **Create a Fine-grained Personal Access Token:**
   - Go to GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens
   - Click "Generate new token"
   - Name: `ACTIONS_BOT_TOKEN`
   - Expiration: 90 days (or custom)
   - Repository access: Select your repository (`thetangstr/pixcarti`)
   - Permissions needed:
     - **Actions**: Read and Write
     - **Contents**: Read
     - **Metadata**: Read (automatically selected)
   - Click "Generate token" and copy the token

2. **Add the PAT to Repository Secrets:**
   - Go to your repository settings
   - Navigate to Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `ACTIONS_BOT_TOKEN`
   - Value: Paste your PAT
   - Click "Add secret"

## Why This Is Needed

GitHub Actions workflows triggered by `workflow_run` events or by other actions run with limited permissions. They cannot trigger `workflow_dispatch` events using the default `GITHUB_TOKEN`. The PAT provides the necessary permissions to trigger workflows programmatically.

## Security Notes

- The PAT is scoped only to your repository
- It has minimal permissions (only what's needed)
- Rotate the token every 90 days for security
- Never commit the token to your repository

## Fallback

If `ACTIONS_BOT_TOKEN` is not configured, the workflow will fall back to using `GITHUB_TOKEN`, but the auto-fix functionality will not work.