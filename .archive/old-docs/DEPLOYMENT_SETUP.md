# Deployment Setup Guide

This guide provides step-by-step instructions for setting up the complete CI/CD pipeline for the Oil Painting Web Application.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Firebase Setup](#firebase-setup)
3. [Database Setup](#database-setup)
4. [OAuth Provider Setup](#oauth-provider-setup)
5. [GitHub Repository Configuration](#github-repository-configuration)
6. [Environment Variables](#environment-variables)
7. [Branch Protection Rules](#branch-protection-rules)
8. [Deployment Process](#deployment-process)
9. [Monitoring and Rollback](#monitoring-and-rollback)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

- Firebase project with Hosting enabled
- PostgreSQL database (production and beta environments)
- Google Cloud Platform project (for OAuth)
- Facebook Developer App (for OAuth)
- Apple Developer Account (for OAuth)
- GitHub repository with Actions enabled

## Firebase Setup

### 1. Create Firebase Project

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init hosting
```

### 2. Configure Multiple Hosting Targets

```bash
# Set up production target
firebase target:apply hosting production your-project-id

# Set up beta target
firebase target:apply hosting beta your-project-beta-id
```

### 3. Generate Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Project Settings → Service Accounts
3. Generate new private key
4. Save the JSON content for GitHub secrets

## Database Setup

### Production Database

1. Create PostgreSQL database on your preferred provider:
   - [Neon](https://neon.tech/) (Recommended)
   - [Supabase](https://supabase.com/)
   - [PlanetScale](https://planetscale.com/)
   - [Railway](https://railway.app/)

2. Note the connection string format:
   ```
   postgresql://username:password@host:port/database?sslmode=require
   ```

### Beta Database

Create a separate database instance for beta testing with similar configuration.

## OAuth Provider Setup

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - Production: `https://your-domain.com/api/auth/callback/google`
   - Beta: `https://your-beta-domain.com/api/auth/callback/google`
   - Development: `http://localhost:3000/api/auth/callback/google`

### Facebook OAuth

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create new app
3. Add Facebook Login product
4. Configure Valid OAuth Redirect URIs:
   - Production: `https://your-domain.com/api/auth/callback/facebook`
   - Beta: `https://your-beta-domain.com/api/auth/callback/facebook`
   - Development: `http://localhost:3000/api/auth/callback/facebook`

### Apple OAuth

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Create App ID with Sign In with Apple capability
3. Create Service ID
4. Configure Return URLs:
   - Production: `https://your-domain.com/api/auth/callback/apple`
   - Beta: `https://your-beta-domain.com/api/auth/callback/apple`
5. Generate private key for Apple authentication

## GitHub Repository Configuration

### 1. Required GitHub Secrets

Add these secrets in your repository settings (Settings → Secrets and variables → Actions):

#### Firebase Secrets
- `FIREBASE_PROJECT_ID`: Your Firebase project ID
- `FIREBASE_SERVICE_ACCOUNT`: Complete JSON service account key

#### Database Secrets
- `DATABASE_URL_PROD`: Production database connection string
- `DATABASE_URL_BETA`: Beta database connection string

#### Authentication Secrets
- `NEXTAUTH_SECRET`: Random 32-character string for JWT encryption
- `NEXTAUTH_URL_PROD`: Production domain (e.g., https://your-domain.com)
- `NEXTAUTH_URL_BETA`: Beta domain (e.g., https://beta.your-domain.com)

#### Google OAuth (Production)
- `GOOGLE_CLIENT_ID_PROD`: Google OAuth client ID for production
- `GOOGLE_CLIENT_SECRET_PROD`: Google OAuth client secret for production

#### Google OAuth (Beta)
- `GOOGLE_CLIENT_ID_BETA`: Google OAuth client ID for beta
- `GOOGLE_CLIENT_SECRET_BETA`: Google OAuth client secret for beta

#### Facebook OAuth (Production)
- `FACEBOOK_CLIENT_ID_PROD`: Facebook app ID for production
- `FACEBOOK_CLIENT_SECRET_PROD`: Facebook app secret for production

#### Facebook OAuth (Beta)
- `FACEBOOK_CLIENT_ID_BETA`: Facebook app ID for beta
- `FACEBOOK_CLIENT_SECRET_BETA`: Facebook app secret for beta

#### Apple OAuth (Production)
- `APPLE_ID_PROD`: Apple service ID for production
- `APPLE_SECRET_PROD`: Apple private key for production

#### Apple OAuth (Beta)
- `APPLE_ID_BETA`: Apple service ID for beta
- `APPLE_SECRET_BETA`: Apple private key for beta

#### Apple OAuth (Shared)
- `APPLE_TEAM_ID`: Your Apple team ID
- `APPLE_KEY_ID`: Apple key ID

#### Optional A1111 Integration
- `A1111_BASE_URL_PROD`: Stable Diffusion API URL for production (optional)
- `A1111_BASE_URL_BETA`: Stable Diffusion API URL for beta (optional)

### 2. Environment Protection Rules

Configure environment protection rules in repository settings:

#### Beta Environment
- Required reviewers: 1 (optional)
- Wait timer: 0 minutes
- Deployment branches: `beta` branch only

#### Production Environment
- Required reviewers: 2 (recommended)
- Wait timer: 5 minutes (recommended)
- Deployment branches: `main` branch only

## Branch Protection Rules

Set up branch protection for `main` and `beta` branches:

### Main Branch Protection
```
- Require pull request reviews: ✅
- Required approving reviews: 2
- Dismiss stale reviews: ✅
- Require review from code owners: ✅
- Require status checks: ✅
  - CI Pipeline / status-check
- Require branches to be up to date: ✅
- Require linear history: ✅
- Include administrators: ✅
```

### Beta Branch Protection
```
- Require pull request reviews: ✅
- Required approving reviews: 1
- Require status checks: ✅
  - CI Pipeline / status-check
- Require branches to be up to date: ✅
```

## Deployment Process

### Development Workflow

1. **Feature Development**
   ```bash
   git checkout -b feature/new-feature
   # Make changes
   git commit -m "Add new feature"
   git push origin feature/new-feature
   ```

2. **Create Pull Request**
   - PR triggers CI pipeline
   - Automated tests run
   - Preview deployment created
   - Code review required

3. **Merge to Beta**
   ```bash
   git checkout beta
   git merge feature/new-feature
   git push origin beta
   ```
   - Triggers beta deployment
   - Post-deployment tests run

4. **Promote to Production**
   ```bash
   git checkout main
   git merge beta
   git push origin main
   ```
   - Triggers production deployment
   - Comprehensive validation
   - Manual approval required

### Manual Deployment

You can trigger deployments manually through GitHub Actions:

1. Go to repository → Actions tab
2. Select appropriate workflow:
   - "Deploy Beta Environment" for beta
   - "Deploy Production Environment" for production
3. Click "Run workflow"
4. Fill in required parameters

## Database Migrations

### Running Migrations

Use the Database Migration workflow for schema changes:

1. Go to Actions → "Database Migration"
2. Click "Run workflow"
3. Select environment (beta/production)
4. Choose action (deploy/reset/status)
5. For production: type "CONFIRM" in confirmation field

### Migration Safety

- Always test migrations in beta environment first
- Automatic backup before production migrations
- Verification steps after migration
- Rollback plan documented

## Monitoring and Rollback

### Monitoring

1. **GitHub Actions**
   - Monitor workflow status
   - Review deployment logs
   - Check test results

2. **Firebase Console**
   - Monitor hosting metrics
   - Check traffic patterns
   - Review error logs

3. **Database Monitoring**
   - Connection health
   - Query performance
   - Migration status

### Rollback Procedures

#### Firebase Hosting Rollback
```bash
# List recent deployments
firebase hosting:channel:list

# Deploy previous version
firebase hosting:channel:deploy <previous-version>
```

#### Database Rollback
1. Use backup created before migration
2. Run Database Migration workflow with "reset" action
3. Restore from backup using your database provider's tools

#### Emergency Rollback
1. Identify last known good commit
2. Create hotfix branch from that commit
3. Push directly to main (if branch protection allows)
4. Monitor deployment completion

## Troubleshooting

### Common Issues

#### Build Failures
```bash
# Check Node.js version compatibility
node --version  # Should be 18 or 20

# Clear cache and reinstall
npm run clean
npm ci

# Check for TypeScript errors
npm run type-check
```

#### Environment Variable Issues
- Verify all required secrets are set
- Check secret names for typos
- Ensure values don't contain special characters that need escaping

#### Database Connection Issues
- Verify connection string format
- Check database server status
- Ensure SSL mode is properly configured
- Test connection from local environment

#### OAuth Configuration Issues
- Verify redirect URIs match exactly
- Check client IDs and secrets
- Ensure OAuth apps are approved/published
- Verify domain ownership for Apple OAuth

#### Firebase Deployment Issues
- Check Firebase project permissions
- Verify service account has necessary roles
- Ensure hosting targets are properly configured
- Check build output directory exists

### Getting Help

1. Check GitHub Actions logs for detailed error messages
2. Review Firebase Console for hosting issues
3. Check database provider logs for connection issues
4. Verify OAuth provider configurations
5. Test locally with same environment variables

## Security Considerations

### Secret Management
- Rotate secrets regularly (quarterly recommended)
- Use environment-specific secrets
- Never commit secrets to repository
- Monitor secret usage in workflows

### Access Control
- Limit repository admin access
- Use required reviewers for production
- Enable 2FA for all team members
- Regular audit of collaborator access

### Monitoring
- Enable GitHub security alerts
- Monitor dependency vulnerabilities
- Regular security audits
- Log and monitor deployment activities

## Maintenance

### Regular Tasks
- Update dependencies monthly
- Review and rotate secrets quarterly
- Test rollback procedures monthly
- Update documentation as needed
- Monitor performance metrics

### Scaling Considerations
- Monitor Firebase hosting limits
- Plan for database scaling
- Consider CDN for global distribution
- Implement caching strategies

---

For additional support or questions, please create an issue in the repository or contact the development team.