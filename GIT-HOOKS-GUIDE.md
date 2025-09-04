# PixCart Git Hooks - Automated Deployment Monitoring

## Overview

The PixCart Git Hooks system provides **completely automated deployment monitoring** that integrates seamlessly into your Git workflow. When you run `git push`, the system automatically:

1. ✅ Validates your build before pushing (prevents broken deployments)
2. 🚀 Pushes your code to the remote repository
3. 🔄 Immediately starts monitoring the deployment
4. 🏥 Runs comprehensive health checks
5. 📊 Provides detailed status reports
6. 🎉 Notifies you when everything is ready

**No manual intervention required!** Just `git push` and the system handles everything else.

---

## 🎯 User Experience

### Before Git Hooks
```bash
# Old workflow - lots of manual steps
git push
# Wait... is it deployed yet?
./monitor.sh deployment
# Check health manually
./monitor.sh health
# Run comprehensive check
./monitor.sh full
# Check logs, results, etc.
```

### With Git Hooks
```bash
# New workflow - completely automated
git push
# That's it! System automatically:
# ✅ Validates build
# 🚀 Pushes code  
# 🔄 Monitors deployment
# 📊 Reports results
# 💌 Notifies completion
```

---

## 🔧 System Components

### Git Hooks

| Hook | Purpose | When It Runs |
|------|---------|--------------|
| **pre-push** | Build validation | Before `git push` |
| **post-commit** | Deployment tracking | After `git commit` |
| **post-push** | Monitoring activation | After successful push |
| **post-receive** | Server-side monitoring | On remote (if applicable) |

### Support Scripts

| Script | Purpose |
|--------|---------|
| `scripts/hook-manager.sh` | Manage hooks, view logs, diagnostics |
| `scripts/deployment-poller.js` | Smart deployment status polling |
| `monitor.sh` | Existing monitoring system integration |

---

## 🚀 Quick Start

The hooks are **already installed and active!** Just use Git normally:

```bash
# Make your changes
git add .
git commit -m "Add new feature"

# Push and watch the magic happen
git push
```

### What You'll See

```
🔒 PixCart Pre-Push Validation
===============================
📋 Step 1: Checking working directory...
✅ Working directory is clean
📦 Step 2: Checking dependencies...
✅ Dependencies are up to date
🗄️  Step 3: Generating database client...
✅ Database client generated
🔍 Step 4: Running linter...
✅ Linting passed without issues
🏗️  Step 5: Validating build...
✅ Build validation successful
📁 Step 6: Checking critical files...
✅ All critical files present
🎉 All pre-push validations passed!
🚀 Proceeding with push...

🚀 PixCart Post-Push Hook - Automated Monitoring
===============================================
📤 Push completed successfully!
🎯 Deployment branch detected - Enhanced monitoring activated
⚡ Starting automated deployment monitoring...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 Your code has been pushed successfully!

🔄 Automated monitoring is now starting:
   • Deployment status tracking
   • API health checks  
   • Comprehensive system monitoring
   • Performance analysis

📊 Real-time updates will be logged to:
   • deployment-monitoring.log
   • test-results/

💡 You can continue working - monitoring runs in background!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 📊 Monitoring Output

### Real-time Log

Monitor deployment progress in real-time:

```bash
# Watch live monitoring
tail -f deployment-monitoring.log
```

### Sample Output

```
╔══════════════════════════════════════════════════════════════╗
║                 PixCart Deployment Monitor                    ║
╠══════════════════════════════════════════════════════════════╣
║ 🎯 Session: autopush-1756975234-a1b2c3d4
║ 🌿 Branch:  main (a1b2c3d4)
║ 📊 Level:   enhanced monitoring
║ ⏰ Started: 2024-12-04 15:30:45
╚══════════════════════════════════════════════════════════════╝

╭─────────────────────────────────────────────────────────────╮
│ 📦 Phase 1/3: Deployment Status Check                      │
╰─────────────────────────────────────────────────────────────╯
✅ Phase 1: Deployment monitoring PASSED

╭─────────────────────────────────────────────────────────────╮
│ 🏥 Phase 2/3: API Health Check                             │
╰─────────────────────────────────────────────────────────────╯
✅ Phase 2: Health checks PASSED

╭─────────────────────────────────────────────────────────────╮
│ 🔍 Phase 3/3: Comprehensive Analysis                        │
╰─────────────────────────────────────────────────────────────╯
✅ Phase 3: Comprehensive monitoring PASSED

╔══════════════════════════════════════════════════════════════╗
║                    🎯 MONITORING COMPLETE                     ║
╠══════════════════════════════════════════════════════════════╣
║ 🎉 Overall Status: SUCCESS
║ 📊 Success Rate: 100% (3/3 phases passed)
║ 🌿 Branch: main
║ 📦 Commit: a1b2c3d4
║ ⏰ Completed: 2024-12-04 15:33:12
╠══════════════════════════════════════════════════════════════╣
║ Phase Results:
║ • Deployment Check: ✅ PASSED
║ • Health Check:     ✅ PASSED
║ • Comprehensive:    ✅ PASSED
╠══════════════════════════════════════════════════════════════╣
║ 🎉 All systems are healthy and deployment is successful!
║ 🚀 Your application is live and ready for users.
╚══════════════════════════════════════════════════════════════╝
```

### Result Files

The system creates several output files:

- `deployment-monitoring.log` - Complete monitoring log
- `deployment-result-YYYYMMDD-HHMMSS.txt` - Quick summary
- `test-results/` - Detailed test results and reports

---

## 🎛️ Hook Management

Use the hook manager to control the system:

```bash
# Check system status
./scripts/hook-manager.sh status

# View recent monitoring sessions
./scripts/hook-manager.sh sessions

# View recent logs
./scripts/hook-manager.sh logs

# View more log lines
./scripts/hook-manager.sh logs 200

# Run system diagnostics
./scripts/hook-manager.sh diagnostic

# Temporarily disable all hooks
./scripts/hook-manager.sh disable

# Re-enable hooks
./scripts/hook-manager.sh enable

# Clean up old monitoring data
./scripts/hook-manager.sh cleanup

# Show help
./scripts/hook-manager.sh help
```

---

## 🔍 Monitoring Levels

### Standard Monitoring (Feature Branches)

For feature branches like `feature/new-ui`, `bugfix/login`, etc:

- ✅ Deployment status check
- ✅ API health verification
- ⏭️ Skip comprehensive analysis (faster)

### Enhanced Monitoring (Deployment Branches)

For deployment branches like `main`, `master`, `production`, `deploy/*`:

- ✅ Deployment status check
- ✅ API health verification  
- ✅ Comprehensive system analysis
- ✅ Performance monitoring
- ✅ Advanced health checks

---

## 🔧 Troubleshooting

### If Pre-Push Fails

The pre-push hook validates your build before allowing the push. If it fails:

1. **Check the error message** - it will show specific build errors
2. **Fix the issues** in your code
3. **Try pushing again**

Common issues:
- Build errors (TypeScript, syntax, imports)
- Missing dependencies (`npm install`)
- Linting warnings (fixable, but noted)

### If Monitoring Fails

If automated monitoring encounters issues:

```bash
# Check what went wrong
./scripts/hook-manager.sh logs

# Run diagnostics
./scripts/hook-manager.sh diagnostic  

# Run monitoring manually
./monitor.sh full
```

### Disable Hooks Temporarily

If you need to push without validation/monitoring:

```bash
# Disable all hooks
./scripts/hook-manager.sh disable

# Make your push
git push

# Re-enable hooks
./scripts/hook-manager.sh enable
```

Or skip just the pre-push hook:
```bash
# Skip pre-push validation (not recommended)
git push --no-verify
```

---

## 📋 Hook Details

### Pre-Push Hook

**Purpose**: Validate build before allowing push
**Time**: ~30-60 seconds
**Steps**:
1. Check working directory status
2. Install/verify dependencies  
3. Generate Prisma client
4. Run linting
5. **Validate full build** (critical check)
6. Verify critical files exist

**Benefits**:
- Prevents broken deployments
- Catches build errors locally
- Saves deployment resources
- Maintains code quality

### Post-Commit Hook

**Purpose**: Track commits and prepare monitoring
**Time**: <1 second
**What it does**:
- Records commit information
- Sets up monitoring preparation
- Creates deployment tracking files

### Post-Push Hook

**Purpose**: Immediate deployment monitoring activation
**Time**: 3-5 minutes (runs in background)
**Process**:
1. Wait 15 seconds for deployment to start
2. Run deployment status monitoring
3. Execute API health checks
4. Run comprehensive analysis (if deployment branch)
5. Generate detailed reports

---

## 🎯 Benefits

### For Developers
- ✅ **Zero manual work** - just `git push`
- ✅ **Immediate feedback** - know deployment status instantly
- ✅ **Prevent broken deployments** - validation before push
- ✅ **Continue coding** - monitoring runs in background
- ✅ **Rich reporting** - detailed logs and summaries

### For Teams
- ✅ **Consistent process** - same monitoring for everyone
- ✅ **Automated quality gates** - build validation enforced
- ✅ **Deployment visibility** - clear status for all deployments
- ✅ **Issue detection** - problems caught immediately
- ✅ **Historical tracking** - monitoring session history

### For Operations
- ✅ **Reliable deployments** - pre-validated builds only
- ✅ **Comprehensive monitoring** - health, performance, functionality
- ✅ **Automated reporting** - detailed logs and metrics
- ✅ **Early issue detection** - problems caught at deployment time

---

## 🔒 Security & Safety

### Build Validation
- Code must pass full build process before deployment
- Dependencies verified and up-to-date
- Critical files existence validated
- Linting enforced (with reasonable warning tolerance)

### Monitoring Safety
- All monitoring runs in background (non-blocking)
- Monitoring failures don't affect deployments
- Graceful fallbacks for missing tools
- Comprehensive error handling

### Data Privacy
- All monitoring runs locally or against your own endpoints
- No external data collection
- Session data stored locally only
- Automatic cleanup of old monitoring data

---

## 🎉 Getting Started

**You're already ready!** The hooks are installed and active. Just:

1. **Make your changes** as usual
2. **Commit your code**: `git commit -m "Your message"`
3. **Push and enjoy**: `git push`
4. **Watch the automation**: `tail -f deployment-monitoring.log`

The system will handle everything else automatically!

---

## 📞 Support

If you encounter issues:

1. **Check diagnostics**: `./scripts/hook-manager.sh diagnostic`
2. **View recent logs**: `./scripts/hook-manager.sh logs`  
3. **Check hook status**: `./scripts/hook-manager.sh status`
4. **Run manual monitoring**: `./monitor.sh full`

The system is designed to be robust and self-healing, with comprehensive error handling and fallbacks.

---

**🎯 Remember**: Just `git push` and let the automation handle the rest!