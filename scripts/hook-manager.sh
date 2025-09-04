#!/bin/bash

# PixCart Git Hook Management Utility
# 
# Provides easy management of the Git hooks deployment monitoring system.
# This script helps users control, monitor, and debug the automated system.
#
# Features:
# - Hook status checking
# - Monitoring session management  
# - Log viewing and cleanup
# - Hook enable/disable functionality
# - Troubleshooting and diagnostics

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Script configuration
HOOKS_DIR=".git/hooks"
MONITORING_DIR="$HOOKS_DIR/monitoring-sessions"
LOG_FILE="deployment-monitoring.log"

# Function to check hook status
check_hook_status() {
    print_status $BLUE "🔍 Git Hook Status Check"
    print_status $BLUE "========================="
    
    local hooks=(
        "pre-push:Build validation before push"
        "post-commit:Deployment tracking after commit" 
        "post-receive:Server-side monitoring trigger"
        "post-push:Client-side monitoring activation"
    )
    
    for hook_info in "${hooks[@]}"; do
        local hook_name=$(echo "$hook_info" | cut -d':' -f1)
        local hook_desc=$(echo "$hook_info" | cut -d':' -f2)
        local hook_path="$HOOKS_DIR/$hook_name"
        
        if [[ -f "$hook_path" && -x "$hook_path" ]]; then
            print_status $GREEN "✅ $hook_name - $hook_desc"
        elif [[ -f "$hook_path" ]]; then
            print_status $YELLOW "⚠️  $hook_name - Present but not executable"
        else
            print_status $RED "❌ $hook_name - Missing"
        fi
    done
    
    echo ""
    
    # Check monitoring directories
    if [[ -d "$MONITORING_DIR" ]]; then
        local session_count=$(find "$MONITORING_DIR" -maxdepth 1 -type d | wc -l)
        session_count=$((session_count - 1))  # Exclude parent directory
        print_status $BLUE "📊 Monitoring sessions directory: $session_count sessions"
    else
        print_status $YELLOW "📊 No monitoring sessions directory found"
    fi
    
    # Check log file
    if [[ -f "$LOG_FILE" ]]; then
        local log_size=$(wc -l < "$LOG_FILE" 2>/dev/null || echo "0")
        local log_date=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "$LOG_FILE" 2>/dev/null || stat -c "%y" "$LOG_FILE" 2>/dev/null | cut -d' ' -f1-2 || echo "unknown")
        print_status $BLUE "📄 Monitoring log: $log_size lines (last modified: $log_date)"
    else
        print_status $YELLOW "📄 No monitoring log found"
    fi
}

# Function to show recent monitoring sessions
show_recent_sessions() {
    print_status $BLUE "📈 Recent Monitoring Sessions"
    print_status $BLUE "============================="
    
    if [[ ! -d "$MONITORING_DIR" ]]; then
        print_status $YELLOW "No monitoring sessions found"
        return
    fi
    
    local sessions=($(find "$MONITORING_DIR" -maxdepth 1 -type d -name "monitor-*" -o -name "autopush-*" | sort -r | head -10))
    
    if [[ ${#sessions[@]} -eq 0 ]]; then
        print_status $YELLOW "No monitoring sessions found"
        return
    fi
    
    for session_dir in "${sessions[@]}"; do
        local session_name=$(basename "$session_dir")
        local session_file="$session_dir/session.json"
        
        if [[ -f "$session_file" ]]; then
            # Extract key information from session file
            local branch=$(grep '"branch"' "$session_file" 2>/dev/null | cut -d'"' -f4 || echo "unknown")
            local status=$(grep '"status"\|"finalStatus"' "$session_file" 2>/dev/null | tail -1 | cut -d'"' -f4 || echo "unknown")
            local short_sha=$(grep '"shortSha"' "$session_file" 2>/dev/null | cut -d'"' -f4 || echo "unknown")
            
            local status_emoji="❓"
            case "$status" in
                "SUCCESS"|"success") status_emoji="✅" ;;
                "MOSTLY_SUCCESS"|"PARTIAL_SUCCESS") status_emoji="⚠️" ;;
                "FAILED"|"failed") status_emoji="❌" ;;
                "initiated"|"running") status_emoji="🔄" ;;
            esac
            
            print_status $GREEN "  $status_emoji $session_name"
            print_status $CYAN "     Branch: $branch ($short_sha) - Status: $status"
        else
            print_status $YELLOW "  ❓ $session_name (no session data)"
        fi
    done
}

# Function to show monitoring logs
show_logs() {
    local lines=${1:-50}
    
    print_status $BLUE "📋 Recent Monitoring Logs (last $lines lines)"
    print_status $BLUE "============================================="
    
    if [[ -f "$LOG_FILE" ]]; then
        tail -n "$lines" "$LOG_FILE" | while IFS= read -r line; do
            # Color code log levels
            if [[ "$line" =~ \[.*\]\ ✅ ]]; then
                print_status $GREEN "$line"
            elif [[ "$line" =~ \[.*\]\ ❌ ]]; then
                print_status $RED "$line"
            elif [[ "$line" =~ \[.*\]\ ⚠️ ]]; then
                print_status $YELLOW "$line"
            elif [[ "$line" =~ \[.*\]\ 🔄 ]]; then
                print_status $CYAN "$line"
            else
                echo "$line"
            fi
        done
    else
        print_status $YELLOW "No monitoring log file found"
    fi
}

# Function to clean up old sessions and logs
cleanup() {
    local days=${1:-7}
    
    print_status $BLUE "🧹 Cleaning up monitoring data older than $days days"
    print_status $BLUE "=================================================="
    
    local cleaned=0
    
    # Clean up old monitoring sessions
    if [[ -d "$MONITORING_DIR" ]]; then
        while IFS= read -r -d '' session_dir; do
            if [[ -n "$session_dir" ]]; then
                rm -rf "$session_dir"
                print_status $GREEN "🗑️  Removed: $(basename "$session_dir")"
                cleaned=$((cleaned + 1))
            fi
        done < <(find "$MONITORING_DIR" -maxdepth 1 -type d -mtime +"$days" -print0 2>/dev/null || true)
    fi
    
    # Clean up old result files
    if [[ -d "./test-results" ]]; then
        local old_results=$(find "./test-results" -name "*.json" -o -name "*.md" -mtime +"$days" 2>/dev/null | wc -l)
        if [[ $old_results -gt 0 ]]; then
            find "./test-results" -name "*.json" -o -name "*.md" -mtime +"$days" -delete 2>/dev/null || true
            print_status $GREEN "🗑️  Removed $old_results old test result files"
            cleaned=$((cleaned + old_results))
        fi
    fi
    
    # Clean up old notification files
    local old_notifications=$(find . -maxdepth 1 -name "deployment-*.txt" -mtime +"$days" 2>/dev/null | wc -l)
    if [[ $old_notifications -gt 0 ]]; then
        find . -maxdepth 1 -name "deployment-*.txt" -mtime +"$days" -delete 2>/dev/null || true
        print_status $GREEN "🗑️  Removed $old_notifications old notification files"
        cleaned=$((cleaned + old_notifications))
    fi
    
    print_status $BLUE "✅ Cleanup complete: $cleaned items removed"
}

# Function to enable/disable hooks
toggle_hooks() {
    local action=$1
    
    if [[ "$action" == "disable" ]]; then
        print_status $YELLOW "🔒 Disabling Git hooks..."
        
        for hook in pre-push post-commit post-receive post-push; do
            local hook_path="$HOOKS_DIR/$hook"
            if [[ -f "$hook_path" ]]; then
                mv "$hook_path" "$hook_path.disabled" 2>/dev/null || true
                print_status $YELLOW "  Disabled: $hook"
            fi
        done
        
        print_status $GREEN "✅ All monitoring hooks disabled"
        print_status $CYAN "💡 Use '$0 enable' to re-enable them"
        
    elif [[ "$action" == "enable" ]]; then
        print_status $GREEN "🔓 Enabling Git hooks..."
        
        for hook in pre-push post-commit post-receive post-push; do
            local disabled_path="$HOOKS_DIR/$hook.disabled"
            local hook_path="$HOOKS_DIR/$hook"
            if [[ -f "$disabled_path" ]]; then
                mv "$disabled_path" "$hook_path" 2>/dev/null || true
                chmod +x "$hook_path" 2>/dev/null || true
                print_status $GREEN "  Enabled: $hook"
            fi
        done
        
        print_status $GREEN "✅ All monitoring hooks enabled"
    fi
}

# Function to run diagnostics
run_diagnostics() {
    print_status $BLUE "🔬 Running System Diagnostics"
    print_status $BLUE "=============================="
    
    # Check Git repository
    if git rev-parse --git-dir >/dev/null 2>&1; then
        print_status $GREEN "✅ Git repository detected"
        local current_branch=$(git branch --show-current 2>/dev/null || echo "unknown")
        print_status $BLUE "   Current branch: $current_branch"
    else
        print_status $RED "❌ Not in a Git repository"
        return 1
    fi
    
    # Check Node.js
    if command -v node >/dev/null 2>&1; then
        local node_version=$(node --version 2>/dev/null || echo "unknown")
        print_status $GREEN "✅ Node.js available: $node_version"
    else
        print_status $RED "❌ Node.js not available"
    fi
    
    # Check npm
    if command -v npm >/dev/null 2>&1; then
        local npm_version=$(npm --version 2>/dev/null || echo "unknown")
        print_status $GREEN "✅ npm available: $npm_version"
    else
        print_status $RED "❌ npm not available"
    fi
    
    # Check Vercel CLI
    if command -v vercel >/dev/null 2>&1; then
        local vercel_version=$(vercel --version 2>/dev/null || echo "unknown")
        print_status $GREEN "✅ Vercel CLI available: $vercel_version"
    else
        print_status $YELLOW "⚠️  Vercel CLI not available (optional)"
    fi
    
    # Check monitoring scripts
    local scripts=("monitor.sh" "scripts/comprehensive-monitor.js" "scripts/deployment-monitor.js" "scripts/api-health-check.js")
    for script in "${scripts[@]}"; do
        if [[ -f "$script" ]]; then
            print_status $GREEN "✅ $script present"
        else
            print_status $RED "❌ $script missing"
        fi
    done
    
    # Check permissions
    if [[ -w "$HOOKS_DIR" ]]; then
        print_status $GREEN "✅ Hooks directory writable"
    else
        print_status $RED "❌ Hooks directory not writable"
    fi
}

# Function to show usage
show_usage() {
    print_status $PURPLE "PixCart Git Hook Management Utility"
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  status      - Show status of all Git hooks and monitoring system"
    echo "  sessions    - Show recent monitoring sessions"
    echo "  logs [N]    - Show last N lines of monitoring logs (default: 50)"
    echo "  cleanup [N] - Clean up monitoring data older than N days (default: 7)"
    echo "  enable      - Enable all monitoring hooks"
    echo "  disable     - Disable all monitoring hooks"
    echo "  diagnostic  - Run system diagnostic checks"
    echo "  help        - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 status           # Check hook status"
    echo "  $0 logs 100         # Show last 100 log lines"
    echo "  $0 cleanup 14       # Clean up data older than 14 days"
    echo "  $0 disable          # Temporarily disable monitoring"
    echo ""
}

# Main function
main() {
    local command=${1:-status}
    
    case $command in
        status|st)
            check_hook_status
            ;;
        sessions|sess)
            show_recent_sessions
            ;;
        logs|log)
            show_logs "$2"
            ;;
        cleanup|clean)
            cleanup "$2"
            ;;
        enable)
            toggle_hooks "enable"
            ;;
        disable)
            toggle_hooks "disable"
            ;;
        diagnostic|diag)
            run_diagnostics
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            print_status $RED "❌ Unknown command: $command"
            echo ""
            show_usage
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"