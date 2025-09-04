#!/bin/bash

# PixCart Post-Push Background Monitor
# 
# This script handles automated deployment monitoring after a successful git push.
# It runs in the background to avoid blocking the git push operation.
#
# Features:
# - Detects when push completes successfully
# - Starts deployment monitoring automatically
# - Provides real-time feedback via logs
# - Handles both deployment and feature branches appropriately
#
# Usage (called automatically by pre-push hook):
#   nohup ./scripts/post-push-monitor.sh [branch] [sha] [push_timestamp] &

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Function to print colored output (with timestamp for logs)
print_status() {
    local color=$1
    local message=$2
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${color}${message}${NC}"
}

# Function to log messages
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a deployment-monitoring.log
}

# Get script parameters
PUSH_BRANCH="${1:-$(git branch --show-current)}"
PUSH_SHA="${2:-$(git rev-parse HEAD)}"
PUSH_TIMESTAMP="${3:-$(date -u +%s)}"
SHORT_SHA="${PUSH_SHA:0:8}"

# Configuration
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# Initialize session
SESSION_ID="autopush-$(date +%s)-${SHORT_SHA}"
SESSION_DIR=".git/hooks/monitoring-sessions/$SESSION_ID"
mkdir -p "$SESSION_DIR"

print_status $PURPLE "🚀 PixCart Post-Push Monitor Started"
print_status $BLUE "======================================"
print_status $CYAN "📤 Monitoring push completion..."
print_status $CYAN "   Branch: $PUSH_BRANCH"
print_status $CYAN "   SHA: $SHORT_SHA"
print_status $CYAN "   Session: $SESSION_ID"

log_message "POST_PUSH_MONITOR: Started for $PUSH_BRANCH ($SHORT_SHA)"

# Wait for push to complete (monitoring git status)
WAIT_TIME=0
MAX_WAIT=60  # Maximum 60 seconds
PUSH_COMPLETED=false

print_status $YELLOW "⏳ Waiting for push to complete..."

while [ $WAIT_TIME -lt $MAX_WAIT ]; do
    # Check if git is still running a push operation
    if ! pgrep -f "git.*push" > /dev/null 2>&1; then
        # Check if remote refs have been updated
        sleep 2
        
        # Try to fetch latest info from remote (quietly)
        if git fetch origin --dry-run > /dev/null 2>&1; then
            PUSH_COMPLETED=true
            break
        fi
    fi
    
    sleep 2
    WAIT_TIME=$((WAIT_TIME + 2))
    
    # Progress indicator
    if [ $((WAIT_TIME % 10)) -eq 0 ]; then
        print_status $YELLOW "   Still waiting... (${WAIT_TIME}s elapsed)"
    fi
done

if [ "$PUSH_COMPLETED" = "false" ]; then
    print_status $RED "❌ Push completion detection timed out"
    log_message "ERROR: Push completion detection timed out after ${MAX_WAIT}s"
    exit 1
fi

print_status $GREEN "✅ Push completion detected!"
log_message "POST_PUSH_MONITOR: Push completion confirmed"

# Get commit details
COMMIT_MESSAGE=$(git log -1 --pretty=%s "$PUSH_SHA" 2>/dev/null || echo "Unknown commit")
AUTHOR_NAME=$(git log -1 --pretty=%an "$PUSH_SHA" 2>/dev/null || echo "Unknown author")

# Create session metadata
cat > "$SESSION_DIR/session.json" << EOF
{
  "sessionId": "$SESSION_ID",
  "trigger": "post-push-auto",
  "branch": "$PUSH_BRANCH",
  "sha": "$PUSH_SHA",
  "shortSha": "$SHORT_SHA",
  "commitMessage": "$COMMIT_MESSAGE",
  "author": "$AUTHOR_NAME",
  "pushTimestamp": "$PUSH_TIMESTAMP",
  "monitorStartTime": "$(date -u +%s)",
  "isDeploymentBranch": $([ "$PUSH_BRANCH" = "main" ] || [ "$PUSH_BRANCH" = "master" ] || [[ "$PUSH_BRANCH" == deploy* ]] && echo "true" || echo "false"),
  "monitoringLevel": "$([ "$PUSH_BRANCH" = "main" ] || [ "$PUSH_BRANCH" = "master" ] || [[ "$PUSH_BRANCH" == deploy* ]] && echo "enhanced" || echo "standard")",
  "status": "monitoring"
}
EOF

# Determine monitoring approach
is_deployment_branch=false
monitoring_level="standard"

if [[ "$PUSH_BRANCH" == "main" || "$PUSH_BRANCH" == "master" || "$PUSH_BRANCH" == "deploy"* || "$PUSH_BRANCH" == "production" ]]; then
    is_deployment_branch=true
    monitoring_level="enhanced"
fi

# Show user-friendly status update
print_status $CYAN "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_status $CYAN "🎉 Push completed successfully! Starting deployment monitoring..."
print_status $CYAN ""
print_status $CYAN "📋 Push Summary:"
print_status $CYAN "   • Branch: $PUSH_BRANCH"
print_status $CYAN "   • Commit: $SHORT_SHA"
print_status $CYAN "   • Message: $COMMIT_MESSAGE"
print_status $CYAN "   • Author: $AUTHOR_NAME"
print_status $CYAN ""
print_status $CYAN "🔄 Monitoring Configuration:"
print_status $CYAN "   • Level: $monitoring_level"
if [ "$is_deployment_branch" = "true" ]; then
    print_status $CYAN "   • Type: Production deployment monitoring"
    print_status $CYAN "   • Checks: Deployment, Health, Performance, Analytics"
else
    print_status $CYAN "   • Type: Development branch monitoring" 
    print_status $CYAN "   • Checks: Deployment, Health"
fi
print_status $CYAN ""
print_status $CYAN "📊 Results will be available in:"
print_status $CYAN "   • deployment-monitoring.log"
print_status $CYAN "   • ./test-results/"
print_status $CYAN "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

log_message "MONITORING_CONFIG: Level=$monitoring_level, Branch=$PUSH_BRANCH, IsDeployment=$is_deployment_branch"

# Wait a bit for deployment to propagate
print_status $YELLOW "⏳ Waiting for deployment to propagate..."
sleep 15

# Track monitoring phases
PHASE_COUNT=0
PHASES_PASSED=0
TOTAL_PHASES=2  # Default for feature branches
if [ "$is_deployment_branch" = "true" ]; then
    TOTAL_PHASES=3  # Enhanced monitoring for deployment branches
fi

# Phase 1: Deployment Status Check
PHASE_COUNT=1
print_status $BLUE "╭─────────────────────────────────────────────────────────────╮"
print_status $BLUE "│ 📦 Phase $PHASE_COUNT/$TOTAL_PHASES: Deployment Status Check                    │"
print_status $BLUE "╰─────────────────────────────────────────────────────────────╯"

log_message "PHASE_1: Starting deployment monitoring"

if timeout 120 ./monitor.sh deployment >> deployment-monitoring.log 2>&1; then
    print_status $GREEN "✅ Phase 1: Deployment monitoring PASSED"
    log_message "PHASE_1: PASSED - Deployment monitoring successful"
    PHASES_PASSED=$((PHASES_PASSED + 1))
    PHASE1_SUCCESS=true
else
    print_status $RED "❌ Phase 1: Deployment monitoring FAILED"
    log_message "PHASE_1: FAILED - Deployment monitoring encountered issues"
    PHASE1_SUCCESS=false
fi

# Phase 2: API Health Check
PHASE_COUNT=2
print_status $BLUE "╭─────────────────────────────────────────────────────────────╮"
print_status $BLUE "│ 🏥 Phase $PHASE_COUNT/$TOTAL_PHASES: API Health Check                           │"
print_status $BLUE "╰─────────────────────────────────────────────────────────────╯"

log_message "PHASE_2: Starting API health checks"

if timeout 90 ./monitor.sh health >> deployment-monitoring.log 2>&1; then
    print_status $GREEN "✅ Phase 2: Health checks PASSED"
    log_message "PHASE_2: PASSED - API health checks successful"
    PHASES_PASSED=$((PHASES_PASSED + 1))
    PHASE2_SUCCESS=true
else
    print_status $RED "❌ Phase 2: Health checks FAILED"
    log_message "PHASE_2: FAILED - API health checks encountered issues"
    PHASE2_SUCCESS=false
fi

# Phase 3: Comprehensive Analysis (deployment branches only)
if [ "$is_deployment_branch" = "true" ]; then
    PHASE_COUNT=3
    print_status $BLUE "╭─────────────────────────────────────────────────────────────╮"
    print_status $BLUE "│ 🔍 Phase $PHASE_COUNT/$TOTAL_PHASES: Comprehensive Analysis                     │"
    print_status $BLUE "╰─────────────────────────────────────────────────────────────╯"
    
    log_message "PHASE_3: Starting comprehensive analysis"
    
    if timeout 180 ./monitor.sh full >> deployment-monitoring.log 2>&1; then
        print_status $GREEN "✅ Phase 3: Comprehensive analysis PASSED"
        log_message "PHASE_3: PASSED - Comprehensive analysis successful"
        PHASES_PASSED=$((PHASES_PASSED + 1))
        PHASE3_SUCCESS=true
    else
        print_status $RED "❌ Phase 3: Comprehensive analysis FAILED"
        log_message "PHASE_3: FAILED - Comprehensive analysis encountered issues"
        PHASE3_SUCCESS=false
    fi
else
    # Skip comprehensive analysis for feature branches
    PHASE3_SUCCESS=true
    PHASES_PASSED=$((PHASES_PASSED + 1))
    log_message "PHASE_3: SKIPPED - Feature branch, comprehensive analysis not required"
fi

# Calculate final results
PASS_RATE=$((PHASES_PASSED * 100 / TOTAL_PHASES))

# Determine overall status
if [ $PHASES_PASSED -eq $TOTAL_PHASES ]; then
    OVERALL_STATUS="SUCCESS"
    STATUS_EMOJI="🎉"
    EXIT_CODE=0
elif [ $PHASES_PASSED -ge $((TOTAL_PHASES - 1)) ]; then
    OVERALL_STATUS="MOSTLY_SUCCESS"
    STATUS_EMOJI="⚠️"
    EXIT_CODE=1
else
    OVERALL_STATUS="FAILED"
    STATUS_EMOJI="❌"
    EXIT_CODE=2
fi

# Create beautiful final report
{
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    🎯 MONITORING COMPLETE                     ║"
    echo "╠══════════════════════════════════════════════════════════════╣"
    echo "║ $STATUS_EMOJI Overall Status: $OVERALL_STATUS"
    echo "║ 📊 Success Rate: $PASS_RATE% ($PHASES_PASSED/$TOTAL_PHASES phases passed)"
    echo "║ 🌿 Branch: $PUSH_BRANCH"
    echo "║ 📦 Commit: $SHORT_SHA"
    echo "║ 📝 Message: $COMMIT_MESSAGE"
    echo "║ 👤 Author: $AUTHOR_NAME"
    echo "║ ⏰ Completed: $(date)"
    echo "╠══════════════════════════════════════════════════════════════╣"
    echo "║ Phase Results:"
    echo "║ • Deployment Check: $([ "$PHASE1_SUCCESS" = "true" ] && echo "✅ PASSED" || echo "❌ FAILED")"
    echo "║ • Health Check:     $([ "$PHASE2_SUCCESS" = "true" ] && echo "✅ PASSED" || echo "❌ FAILED")"
    echo "║ • Comprehensive:    $([ "$is_deployment_branch" = "true" ] && ([ "$PHASE3_SUCCESS" = "true" ] && echo "✅ PASSED" || echo "❌ FAILED") || echo "➖ SKIPPED")"
    echo "╠══════════════════════════════════════════════════════════════╣"
    if [ $EXIT_CODE -eq 0 ]; then
        echo "║ 🎉 All systems are healthy and deployment is successful!"
        echo "║ 🚀 Your application is live and ready for users."
        echo "║ 🌐 Check it out at: https://oil-painting-app-thetangstrs-projects.vercel.app"
    elif [ $EXIT_CODE -eq 1 ]; then
        echo "║ ⚠️  Deployment is mostly successful with minor issues."
        echo "║ 💡 Check the logs above for details and recommendations."
        echo "║ 🔧 Your app may still be functional, but needs attention."
    else
        echo "║ ❌ Deployment encountered significant issues."
        echo "║ 🔧 Please review the logs and address the problems."
        echo "║ 🚨 Your application may not be functioning properly."
    fi
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
} | tee -a deployment-monitoring.log

# Update session with final results
cat > "$SESSION_DIR/session.json" << EOF
{
  "sessionId": "$SESSION_ID",
  "trigger": "post-push-auto",
  "branch": "$PUSH_BRANCH",
  "sha": "$PUSH_SHA",
  "shortSha": "$SHORT_SHA",
  "commitMessage": "$COMMIT_MESSAGE",
  "author": "$AUTHOR_NAME",
  "pushTimestamp": "$PUSH_TIMESTAMP",
  "monitorStartTime": "$(date -u +%s)",
  "completedAt": "$(date -u +%s)",
  "finalStatus": "$OVERALL_STATUS",
  "passRate": $PASS_RATE,
  "phasesPassedCount": $PHASES_PASSED,
  "totalPhases": $TOTAL_PHASES,
  "deploymentCheck": "$PHASE1_SUCCESS",
  "healthCheck": "$PHASE2_SUCCESS",
  "comprehensiveCheck": "$PHASE3_SUCCESS",
  "exitCode": $EXIT_CODE,
  "isDeploymentBranch": $is_deployment_branch,
  "monitoringLevel": "$monitoring_level",
  "status": "completed"
}
EOF

# Create desktop notification summary
NOTIFICATION_FILE="deployment-result-$(date +%Y%m%d-%H%M%S).txt"
{
    echo "PixCart Deployment Monitor - Results"
    echo "===================================="
    echo ""
    echo "$STATUS_EMOJI Status: $OVERALL_STATUS ($PASS_RATE% success rate)"
    echo "Branch: $PUSH_BRANCH ($SHORT_SHA)"
    echo "Message: $COMMIT_MESSAGE"
    echo "Author: $AUTHOR_NAME"
    echo "Completed: $(date)"
    echo ""
    echo "Phase Results:"
    echo "✓ Deployment: $([ "$PHASE1_SUCCESS" = "true" ] && echo "PASSED" || echo "FAILED")"
    echo "✓ Health Check: $([ "$PHASE2_SUCCESS" = "true" ] && echo "PASSED" || echo "FAILED")"
    echo "✓ Analysis: $([ "$is_deployment_branch" = "true" ] && ([ "$PHASE3_SUCCESS" = "true" ] && echo "PASSED" || echo "FAILED") || echo "SKIPPED")"
    echo ""
    if [ $EXIT_CODE -eq 0 ]; then
        echo "🎉 Your deployment was successful!"
        echo "🌐 Application is live and healthy."
        echo "🚀 Visit: https://oil-painting-app-thetangstrs-projects.vercel.app"
    elif [ $EXIT_CODE -eq 1 ]; then
        echo "⚠️ Deployment completed with warnings."
        echo "💡 Minor issues detected - check logs."
        echo "🔧 App may be functional but needs attention."
    else
        echo "❌ Deployment encountered issues."
        echo "🔧 Please review and fix problems."
        echo "🚨 Application may not be working properly."
    fi
    echo ""
    echo "Full logs: deployment-monitoring.log"
    echo "Test results: ./test-results/"
    echo "Session: $SESSION_ID"
} > "$NOTIFICATION_FILE"

log_message "FINAL_STATUS: $OVERALL_STATUS ($PASS_RATE% success) - Session: $SESSION_ID"
log_message "NOTIFICATION: Created $NOTIFICATION_FILE"

# Clean up temporary files
rm -f /tmp/pixcart-push-info 2>/dev/null || true

print_status $PURPLE "📄 Quick results saved to: $NOTIFICATION_FILE"
print_status $PURPLE "📈 Session data saved to: $SESSION_DIR/"
print_status $CYAN ""
print_status $CYAN "🔍 View detailed logs with:"
print_status $CYAN "   tail -f deployment-monitoring.log"
print_status $CYAN ""
print_status $CYAN "📊 View test results:"
print_status $CYAN "   ls -la test-results/"

log_message "POST_PUSH_MONITOR: Completed with exit code $EXIT_CODE"

exit $EXIT_CODE