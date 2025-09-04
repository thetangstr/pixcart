#!/bin/bash

# PixCart Monitoring Trigger - Manual Control Script
# 
# This script provides manual control over the deployment monitoring system.
# Useful for testing, debugging, or manually triggering monitoring outside of git hooks.
#
# Features:
# - Manual monitoring trigger
# - Monitor status checking
# - Active session management
# - Background process control
#
# Usage:
#   ./scripts/monitor-trigger.sh [command] [options]
#
# Commands:
#   start [branch] [sha]  - Start manual monitoring
#   status               - Check active monitoring sessions
#   stop [session-id]    - Stop a monitoring session
#   kill-all            - Kill all active monitoring processes
#   clean               - Clean up old session data
#   help                - Show this help

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to log with timestamp
log_with_timestamp() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a deployment-monitoring.log
}

# Configuration
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

SESSIONS_DIR=".git/hooks/monitoring-sessions"
MONITOR_SCRIPT="./scripts/post-push-monitor.sh"

# Create directories if needed
mkdir -p "$SESSIONS_DIR"

# Function to show usage
show_help() {
    echo "PixCart Monitoring Trigger v1.0"
    echo "================================"
    echo ""
    echo "Control deployment monitoring manually"
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  start [branch] [sha]    - Start manual monitoring for branch/commit"
    echo "  status                  - Show active monitoring sessions"
    echo "  stop [session-id]       - Stop a specific monitoring session"
    echo "  kill-all               - Kill all active monitoring processes"
    echo "  clean                  - Clean up old session data"
    echo "  logs [lines]           - Show recent monitoring logs"
    echo "  help                   - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start main abc1234              # Monitor specific commit"
    echo "  $0 start                           # Monitor current branch/commit"
    echo "  $0 status                          # Check active sessions"
    echo "  $0 logs 50                         # Show last 50 log lines"
    echo "  $0 stop autopush-1234567890-abc123 # Stop specific session"
    echo "  $0 kill-all                        # Stop all monitoring"
    echo ""
}

# Function to start manual monitoring
start_monitoring() {
    local branch="${1:-$(git branch --show-current)}"
    local sha="${2:-$(git rev-parse HEAD)}"
    local timestamp=$(date -u +%s)
    
    print_status $PURPLE "🚀 Starting Manual Deployment Monitoring"
    print_status $BLUE "========================================"
    print_status $CYAN "   Branch: $branch"
    print_status $CYAN "   SHA: ${sha:0:8}"
    print_status $CYAN "   Timestamp: $(date)"
    
    if [[ ! -f "$MONITOR_SCRIPT" ]]; then
        print_status $RED "❌ Monitor script not found: $MONITOR_SCRIPT"
        exit 1
    fi
    
    # Check if monitoring is already active for this commit
    local existing_session=$(find "$SESSIONS_DIR" -name "session.json" -exec grep -l "\"sha\": \"$sha\"" {} \; 2>/dev/null | head -1)
    if [[ -n "$existing_session" ]]; then
        local session_dir=$(dirname "$existing_session")
        local session_id=$(basename "$session_dir")
        print_status $YELLOW "⚠️  Monitoring session already exists for this commit: $session_id"
        print_status $YELLOW "   Use 'stop $session_id' first if you want to restart"
        return 1
    fi
    
    # Start the monitor
    log_with_timestamp "MANUAL_TRIGGER: Starting monitoring for $branch (${sha:0:8})"
    
    nohup "$MONITOR_SCRIPT" "$branch" "$sha" "$timestamp" > /dev/null 2>&1 &
    local monitor_pid=$!
    
    # Give it a moment to initialize
    sleep 2
    
    # Check if process is still running
    if kill -0 "$monitor_pid" 2>/dev/null; then
        print_status $GREEN "✅ Monitoring started successfully (PID: $monitor_pid)"
        print_status $CYAN "📊 Track progress with:"
        print_status $CYAN "   tail -f deployment-monitoring.log"
        print_status $CYAN "   ./scripts/monitor-trigger.sh status"
        
        # Store PID for reference
        echo "$monitor_pid" > /tmp/pixcart-monitor-pid-manual
    else
        print_status $RED "❌ Failed to start monitoring process"
        return 1
    fi
}

# Function to show monitoring status
show_status() {
    print_status $PURPLE "📊 PixCart Monitoring Status"
    print_status $BLUE "============================="
    
    # Check for active sessions
    if [[ ! -d "$SESSIONS_DIR" || -z "$(ls -A "$SESSIONS_DIR" 2>/dev/null)" ]]; then
        print_status $YELLOW "No active monitoring sessions found"
        return 0
    fi
    
    local active_count=0
    local completed_count=0
    
    for session_dir in "$SESSIONS_DIR"/*; do
        if [[ -d "$session_dir" && -f "$session_dir/session.json" ]]; then
            local session_file="$session_dir/session.json"
            local session_id=$(basename "$session_dir")
            
            # Extract session info
            local status=$(grep '"status"' "$session_file" | cut -d'"' -f4 2>/dev/null || echo "unknown")
            local branch=$(grep '"branch"' "$session_file" | cut -d'"' -f4 2>/dev/null || echo "unknown")
            local short_sha=$(grep '"shortSha"' "$session_file" | cut -d'"' -f4 2>/dev/null || echo "unknown")
            local trigger=$(grep '"trigger"' "$session_file" | cut -d'"' -f4 2>/dev/null || echo "unknown")
            
            # Check if process is still running
            local is_running=false
            local monitor_pids=$(pgrep -f "post-push-monitor.sh.*$short_sha" 2>/dev/null || echo "")
            if [[ -n "$monitor_pids" ]]; then
                is_running=true
            fi
            
            # Display session info
            if [[ "$status" == "completed" ]]; then
                local final_status=$(grep '"finalStatus"' "$session_file" | cut -d'"' -f4 2>/dev/null || echo "unknown")
                local pass_rate=$(grep '"passRate"' "$session_file" | cut -d: -f2 | cut -d, -f1 | tr -d ' ' 2>/dev/null || echo "0")
                
                print_status $GREEN "✅ Completed: $session_id"
                print_status $GREEN "   Branch: $branch ($short_sha) | Status: $final_status ($pass_rate%)"
                print_status $GREEN "   Trigger: $trigger"
                completed_count=$((completed_count + 1))
            elif [[ "$is_running" == "true" ]]; then
                print_status $CYAN "🔄 Active: $session_id"
                print_status $CYAN "   Branch: $branch ($short_sha) | Status: running"
                print_status $CYAN "   Trigger: $trigger | PIDs: $monitor_pids"
                active_count=$((active_count + 1))
            else
                print_status $YELLOW "⚠️  Stale: $session_id"
                print_status $YELLOW "   Branch: $branch ($short_sha) | Status: $status (not running)"
                print_status $YELLOW "   Trigger: $trigger"
            fi
        fi
    done
    
    print_status $BLUE ""
    print_status $BLUE "Summary: $active_count active, $completed_count completed sessions"
    
    # Check for orphaned processes
    local orphaned_pids=$(pgrep -f "post-push-monitor.sh" 2>/dev/null | wc -l | tr -d ' ')
    if [[ "$orphaned_pids" -gt "$active_count" ]]; then
        print_status $YELLOW "⚠️  Found $orphaned_pids monitor processes but only $active_count tracked sessions"
        print_status $YELLOW "   Consider running 'kill-all' to clean up orphaned processes"
    fi
}

# Function to stop a specific session
stop_session() {
    local session_id="$1"
    
    if [[ -z "$session_id" ]]; then
        print_status $RED "❌ Please specify a session ID"
        print_status $BLUE "Use 'status' command to see active sessions"
        return 1
    fi
    
    local session_dir="$SESSIONS_DIR/$session_id"
    if [[ ! -d "$session_dir" ]]; then
        print_status $RED "❌ Session not found: $session_id"
        return 1
    fi
    
    print_status $YELLOW "🛑 Stopping monitoring session: $session_id"
    
    # Get session info
    local short_sha=$(grep '"shortSha"' "$session_dir/session.json" | cut -d'"' -f4 2>/dev/null || echo "unknown")
    
    # Find and kill related processes
    local killed_count=0
    local monitor_pids=$(pgrep -f "post-push-monitor.sh.*$short_sha" 2>/dev/null || echo "")
    
    if [[ -n "$monitor_pids" ]]; then
        for pid in $monitor_pids; do
            if kill -TERM "$pid" 2>/dev/null; then
                killed_count=$((killed_count + 1))
                print_status $GREEN "✅ Terminated process PID: $pid"
            fi
        done
    fi
    
    # Update session status
    if [[ -f "$session_dir/session.json" ]]; then
        # Mark as manually stopped
        local temp_file=$(mktemp)
        sed 's/"status": "[^"]*"/"status": "stopped"/' "$session_dir/session.json" > "$temp_file"
        mv "$temp_file" "$session_dir/session.json"
    fi
    
    print_status $GREEN "✅ Session stopped: $session_id ($killed_count processes terminated)"
    log_with_timestamp "MANUAL_STOP: Session $session_id stopped ($killed_count processes)"
}

# Function to kill all monitoring processes
kill_all_monitoring() {
    print_status $YELLOW "🛑 Stopping all monitoring processes..."
    
    # Find all monitoring processes
    local monitor_pids=$(pgrep -f "post-push-monitor.sh" 2>/dev/null || echo "")
    local killed_count=0
    
    if [[ -n "$monitor_pids" ]]; then
        for pid in $monitor_pids; do
            if kill -TERM "$pid" 2>/dev/null; then
                killed_count=$((killed_count + 1))
                print_status $GREEN "✅ Terminated monitoring process PID: $pid"
            fi
        done
        
        # Give processes time to terminate gracefully
        sleep 2
        
        # Force kill any remaining processes
        local remaining_pids=$(pgrep -f "post-push-monitor.sh" 2>/dev/null || echo "")
        if [[ -n "$remaining_pids" ]]; then
            for pid in $remaining_pids; do
                if kill -KILL "$pid" 2>/dev/null; then
                    print_status $YELLOW "⚠️  Force-killed stubborn process PID: $pid"
                    killed_count=$((killed_count + 1))
                fi
            done
        fi
    fi
    
    # Update all active sessions to stopped
    if [[ -d "$SESSIONS_DIR" ]]; then
        for session_dir in "$SESSIONS_DIR"/*; do
            if [[ -d "$session_dir" && -f "$session_dir/session.json" ]]; then
                local status=$(grep '"status"' "$session_dir/session.json" | cut -d'"' -f4 2>/dev/null || echo "unknown")
                if [[ "$status" != "completed" ]]; then
                    local temp_file=$(mktemp)
                    sed 's/"status": "[^"]*"/"status": "stopped"/' "$session_dir/session.json" > "$temp_file"
                    mv "$temp_file" "$session_dir/session.json"
                fi
            fi
        done
    fi
    
    # Clean up PID files
    rm -f /tmp/pixcart-monitor-pid* 2>/dev/null || true
    
    if [[ $killed_count -eq 0 ]]; then
        print_status $BLUE "ℹ️  No active monitoring processes found"
    else
        print_status $GREEN "✅ Stopped $killed_count monitoring processes"
        log_with_timestamp "MANUAL_KILL_ALL: Stopped $killed_count monitoring processes"
    fi
}

# Function to clean up old session data
clean_sessions() {
    print_status $YELLOW "🧹 Cleaning up old monitoring sessions..."
    
    if [[ ! -d "$SESSIONS_DIR" ]]; then
        print_status $BLUE "ℹ️  No sessions directory found"
        return 0
    fi
    
    local cleaned_count=0
    local total_count=0
    
    # Clean sessions older than 7 days
    local cutoff_time=$(($(date -u +%s) - 604800))  # 7 days ago
    
    for session_dir in "$SESSIONS_DIR"/*; do
        if [[ -d "$session_dir" ]]; then
            total_count=$((total_count + 1))
            
            # Check session age
            local session_time=0
            if [[ -f "$session_dir/session.json" ]]; then
                session_time=$(grep '"pushTimestamp"' "$session_dir/session.json" | cut -d: -f2 | cut -d, -f1 | tr -d ' "' 2>/dev/null || echo "0")
            fi
            
            # If session is old or has no valid timestamp, clean it
            if [[ "$session_time" -lt "$cutoff_time" ]] || [[ "$session_time" -eq 0 ]]; then
                rm -rf "$session_dir"
                cleaned_count=$((cleaned_count + 1))
                print_status $GREEN "🗑️  Removed old session: $(basename "$session_dir")"
            fi
        fi
    done
    
    # Clean up old result files
    if [[ -d "./test-results" ]]; then
        local old_results=$(find ./test-results -name "deployment-result-*" -mtime +7 2>/dev/null | wc -l | tr -d ' ')
        if [[ "$old_results" -gt 0 ]]; then
            find ./test-results -name "deployment-result-*" -mtime +7 -delete 2>/dev/null || true
            print_status $GREEN "🗑️  Removed $old_results old result files"
        fi
    fi
    
    print_status $GREEN "✅ Cleanup complete: $cleaned_count/$total_count sessions removed"
    log_with_timestamp "MANUAL_CLEAN: Removed $cleaned_count old sessions"
}

# Function to show recent logs
show_logs() {
    local lines="${1:-50}"
    
    print_status $BLUE "📄 Recent Monitoring Logs (last $lines lines)"
    print_status $BLUE "=============================================="
    
    if [[ -f "deployment-monitoring.log" ]]; then
        tail -n "$lines" deployment-monitoring.log
    else
        print_status $YELLOW "No monitoring logs found"
        print_status $BLUE "Logs will be created when monitoring starts"
    fi
}

# Main command dispatcher
main() {
    local command="${1:-help}"
    
    case "$command" in
        start)
            start_monitoring "$2" "$3"
            ;;
        status)
            show_status
            ;;
        stop)
            stop_session "$2"
            ;;
        kill-all)
            kill_all_monitoring
            ;;
        clean)
            clean_sessions
            ;;
        logs)
            show_logs "$2"
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_status $RED "❌ Unknown command: $command"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"