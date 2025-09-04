#!/bin/bash

# PixCart Git Hooks Information & Diagnostics
# 
# This script provides comprehensive information about the Git hooks system,
# including the automated post-push monitoring solution.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_header() {
    local title="$1"
    echo ""
    print_status $PURPLE "╔══════════════════════════════════════════════════════════════╗"
    printf "${PURPLE}║${NC} %-60s ${PURPLE}║${NC}\n" "$title"
    print_status $PURPLE "╚══════════════════════════════════════════════════════════════╝"
}

# Main information display
main() {
    clear
    print_status $BOLD $CYAN "🔧 PixCart Git Hooks System - Information & Diagnostics"
    print_status $CYAN "============================================================"
    
    # System Status Overview
    print_header "🎯 SYSTEM OVERVIEW"
    
    print_status $BLUE "The PixCart Git hooks system provides automated deployment monitoring"
    print_status $BLUE "that triggers immediately after a successful git push, solving the"
    print_status $BLUE "limitation that Git has no native 'post-push' hook."
    echo ""
    
    print_status $GREEN "✅ Solution Implemented:"
    print_status $GREEN "   • Pre-push hook validates build and triggers background monitoring"
    print_status $GREEN "   • Background monitor waits for push completion, then starts monitoring"
    print_status $GREEN "   • Comprehensive deployment and health monitoring runs automatically"
    print_status $GREEN "   • Real-time feedback via logs and session tracking"
    
    # Hook Status
    print_header "📋 HOOK STATUS"
    
    local hooks_dir=".git/hooks"
    
    # Check pre-push hook
    if [[ -f "$hooks_dir/pre-push" ]]; then
        if grep -q "post-push-monitor.sh" "$hooks_dir/pre-push" 2>/dev/null; then
            print_status $GREEN "✅ pre-push hook: ACTIVE (with automated monitoring trigger)"
        else
            print_status $YELLOW "⚠️  pre-push hook: EXISTS (but no monitoring trigger found)"
        fi
    else
        print_status $RED "❌ pre-push hook: MISSING"
    fi
    
    # Check post-commit hook
    if [[ -f "$hooks_dir/post-commit" ]]; then
        print_status $GREEN "✅ post-commit hook: ACTIVE"
    else
        print_status $RED "❌ post-commit hook: MISSING"
    fi
    
    # Check monitoring scripts
    if [[ -f "./scripts/post-push-monitor.sh" ]]; then
        if [[ -x "./scripts/post-push-monitor.sh" ]]; then
            print_status $GREEN "✅ post-push-monitor.sh: READY"
        else
            print_status $YELLOW "⚠️  post-push-monitor.sh: EXISTS (but not executable)"
        fi
    else
        print_status $RED "❌ post-push-monitor.sh: MISSING"
    fi
    
    if [[ -f "./scripts/monitor-trigger.sh" ]]; then
        if [[ -x "./scripts/monitor-trigger.sh" ]]; then
            print_status $GREEN "✅ monitor-trigger.sh: READY"
        else
            print_status $YELLOW "⚠️  monitor-trigger.sh: EXISTS (but not executable)"
        fi
    else
        print_status $RED "❌ monitor-trigger.sh: MISSING"
    fi
    
    # System Dependencies
    print_header "🔧 SYSTEM DEPENDENCIES"
    
    # Check Node.js
    if command -v node &> /dev/null; then
        local node_version=$(node --version)
        print_status $GREEN "✅ Node.js: $node_version"
    else
        print_status $RED "❌ Node.js: NOT INSTALLED"
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        local npm_version=$(npm --version)
        print_status $GREEN "✅ npm: v$npm_version"
    else
        print_status $RED "❌ npm: NOT INSTALLED"
    fi
    
    # Check Vercel CLI
    if command -v vercel &> /dev/null; then
        local vercel_version=$(vercel --version)
        print_status $GREEN "✅ Vercel CLI: $vercel_version"
    else
        print_status $YELLOW "⚠️  Vercel CLI: NOT INSTALLED (optional, but recommended)"
        print_status $YELLOW "   Install with: npm install -g vercel"
    fi
    
    # Check monitoring scripts dependencies
    local missing_scripts=()
    for script in "deployment-monitor.js" "api-health-check.js" "comprehensive-monitor.js"; do
        if [[ -f "./scripts/$script" ]]; then
            print_status $GREEN "✅ $script: AVAILABLE"
        else
            print_status $RED "❌ $script: MISSING"
            missing_scripts+=("$script")
        fi
    done
    
    # Active Sessions Status
    print_header "📊 ACTIVE MONITORING SESSIONS"
    
    if command -v "./scripts/monitor-trigger.sh" &> /dev/null; then
        ./scripts/monitor-trigger.sh status
    else
        print_status $RED "Cannot check sessions - monitor-trigger.sh not available"
    fi
    
    # Usage Guide
    print_header "🚀 HOW IT WORKS"
    
    print_status $CYAN "1. ${BOLD}Make changes${NC}${CYAN} to your code"
    print_status $CYAN "2. ${BOLD}Commit changes${NC}${CYAN}: git commit -m \"Your message\""
    print_status $CYAN "3. ${BOLD}Push to remote${NC}${CYAN}: git push origin main"
    print_status $CYAN "   └── Pre-push hook validates build"
    print_status $CYAN "   └── Background monitoring starts automatically"
    print_status $CYAN "   └── Deployment monitoring runs after push completes"
    print_status $CYAN "4. ${BOLD}Monitor progress${NC}${CYAN}: tail -f deployment-monitoring.log"
    print_status $CYAN "5. ${BOLD}Check results${NC}${CYAN}: ./scripts/monitor-trigger.sh status"
    
    # Manual Control
    print_header "🎮 MANUAL CONTROL COMMANDS"
    
    print_status $YELLOW "Monitor current branch/commit manually:"
    print_status $BLUE "  ./scripts/monitor-trigger.sh start"
    echo ""
    print_status $YELLOW "Check active monitoring sessions:"
    print_status $BLUE "  ./scripts/monitor-trigger.sh status"
    echo ""
    print_status $YELLOW "View recent monitoring logs:"
    print_status $BLUE "  ./scripts/monitor-trigger.sh logs 50"
    echo ""
    print_status $YELLOW "Stop all monitoring:"
    print_status $BLUE "  ./scripts/monitor-trigger.sh kill-all"
    echo ""
    print_status $YELLOW "Clean up old sessions:"
    print_status $BLUE "  ./scripts/monitor-trigger.sh clean"
    
    # Troubleshooting
    print_header "🔍 TROUBLESHOOTING"
    
    print_status $YELLOW "Problem: Monitoring doesn't start after push"
    print_status $BLUE "Solution: Check if pre-push hook exists and is executable"
    print_status $BLUE "  chmod +x .git/hooks/pre-push"
    print_status $BLUE "  grep -n 'post-push-monitor.sh' .git/hooks/pre-push"
    echo ""
    
    print_status $YELLOW "Problem: Scripts not found errors"
    print_status $BLUE "Solution: Ensure all monitoring scripts are executable"
    print_status $BLUE "  chmod +x ./scripts/*.sh"
    print_status $BLUE "  ls -la ./scripts/"
    echo ""
    
    print_status $YELLOW "Problem: Monitoring hangs or doesn't complete"
    print_status $BLUE "Solution: Kill hanging processes and restart"
    print_status $BLUE "  ./scripts/monitor-trigger.sh kill-all"
    print_status $BLUE "  ./scripts/monitor-trigger.sh clean"
    echo ""
    
    print_status $YELLOW "Problem: Can't see monitoring logs"
    print_status $BLUE "Solution: Check log files exist and monitor status"
    print_status $BLUE "  ./scripts/monitor-trigger.sh logs 20"
    print_status $BLUE "  tail -f deployment-monitoring.log"
    
    # File Locations
    print_header "📁 IMPORTANT FILE LOCATIONS"
    
    print_status $BLUE "Git Hooks:"
    print_status $GREEN "  .git/hooks/pre-push          - Build validation + monitoring trigger"
    print_status $GREEN "  .git/hooks/post-commit       - Commit tracking"
    echo ""
    
    print_status $BLUE "Monitoring Scripts:"
    print_status $GREEN "  ./scripts/post-push-monitor.sh    - Main background monitor"
    print_status $GREEN "  ./scripts/monitor-trigger.sh      - Manual control script"
    print_status $GREEN "  ./scripts/comprehensive-monitor.js - Core monitoring logic"
    print_status $GREEN "  ./monitor.sh                      - Monitoring wrapper"
    echo ""
    
    print_status $BLUE "Logs & Results:"
    print_status $GREEN "  deployment-monitoring.log          - Main monitoring log"
    print_status $GREEN "  ./test-results/                   - Detailed test results"
    print_status $GREEN "  .git/hooks/monitoring-sessions/   - Session tracking data"
    
    # Summary
    print_header "✨ SUMMARY"
    
    print_status $GREEN "🎉 The PixCart Git hooks system is now configured to automatically"
    print_status $GREEN "   monitor deployments after every successful git push!"
    echo ""
    print_status $CYAN "🚀 Just push your code normally and monitoring will start automatically."
    print_status $CYAN "📊 Track progress with: tail -f deployment-monitoring.log"
    print_status $CYAN "🎮 Manual control: ./scripts/monitor-trigger.sh help"
    
    echo ""
    print_status $PURPLE "For more information, see the project documentation."
}

# Run the information display
main "$@"