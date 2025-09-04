#!/bin/bash

# PixCart Deployment Monitoring Wrapper Script
# 
# This script provides convenient access to all monitoring tools
# 
# Usage:
#   ./monitor.sh [type] [options]
# 
# Types:
#   deployment - Check Vercel deployment status and logs
#   health     - Test API endpoint health
#   full       - Run comprehensive monitoring (default)
# 
# Examples:
#   ./monitor.sh
#   ./monitor.sh deployment
#   ./monitor.sh health
#   ./monitor.sh full
#   ./monitor.sh deployment oil-painting-app
#   ./monitor.sh health https://oil-painting-app-thetangstrs-projects.vercel.app

set -e  # Exit on any error

# Configuration
PROJECT_NAME="${PROJECT_NAME:-oil-painting-app}"
BASE_URL="${BASE_URL:-https://oil-painting-app-thetangstrs-projects.vercel.app}"
SCRIPTS_DIR="$(dirname "$0")/scripts"
RESULTS_DIR="./test-results"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check prerequisites
check_prerequisites() {
    print_status $BLUE "🔍 Checking prerequisites..."
    
    # Check if Node.js is available
    if ! command -v node &> /dev/null; then
        print_status $RED "❌ Node.js is not installed or not in PATH"
        exit 1
    fi
    
    # Check if Vercel CLI is available (for deployment monitoring)
    if ! command -v vercel &> /dev/null; then
        print_status $YELLOW "⚠️  Vercel CLI is not installed. Deployment monitoring may not work."
        print_status $YELLOW "   Install with: npm install -g vercel"
    else
        print_status $GREEN "✅ Vercel CLI is available"
    fi
    
    # Create results directory if it doesn't exist
    mkdir -p "$RESULTS_DIR"
    
    # Check if scripts exist
    local scripts=("deployment-monitor.js" "api-health-check.js" "comprehensive-monitor.js")
    for script in "${scripts[@]}"; do
        if [[ ! -f "$SCRIPTS_DIR/$script" ]]; then
            print_status $RED "❌ Missing script: $SCRIPTS_DIR/$script"
            exit 1
        fi
    done
    
    print_status $GREEN "✅ All prerequisites met"
}

# Function to run deployment monitoring
run_deployment_monitoring() {
    local project=${1:-$PROJECT_NAME}
    
    print_status $PURPLE "📦 Running deployment monitoring for: $project"
    print_status $BLUE "=================================="
    
    node "$SCRIPTS_DIR/deployment-monitor.js" "$project"
    local exit_code=$?
    
    if [[ $exit_code -eq 0 ]]; then
        print_status $GREEN "✅ Deployment monitoring completed successfully"
    else
        print_status $RED "❌ Deployment monitoring completed with issues (exit code: $exit_code)"
    fi
    
    return $exit_code
}

# Function to run health checks
run_health_checks() {
    local base_url=${1:-$BASE_URL}
    
    print_status $PURPLE "🏥 Running API health checks for: $base_url"
    print_status $BLUE "===================================="
    
    node "$SCRIPTS_DIR/api-health-check.js" "$base_url"
    local exit_code=$?
    
    if [[ $exit_code -eq 0 ]]; then
        print_status $GREEN "✅ Health checks completed successfully"
    else
        print_status $RED "❌ Health checks completed with issues (exit code: $exit_code)"
    fi
    
    return $exit_code
}

# Function to run comprehensive monitoring
run_comprehensive_monitoring() {
    local project=${1:-$PROJECT_NAME}
    local base_url=${2:-$BASE_URL}
    
    print_status $PURPLE "🚀 Running comprehensive monitoring"
    print_status $PURPLE "   Project: $project"
    print_status $PURPLE "   URL: $base_url"
    print_status $BLUE "==============================="
    
    node "$SCRIPTS_DIR/comprehensive-monitor.js" "$project" "$base_url"
    local exit_code=$?
    
    case $exit_code in
        0)
            print_status $GREEN "✅ All systems healthy"
            ;;
        1)
            print_status $YELLOW "⚠️  System healthy with warnings"
            ;;
        2)
            print_status $RED "❌ Critical issues detected"
            ;;
        *)
            print_status $RED "❌ Unknown error occurred (exit code: $exit_code)"
            ;;
    esac
    
    return $exit_code
}

# Function to show usage information
show_usage() {
    echo "PixCart Deployment Monitoring Tool"
    echo ""
    echo "Usage: $0 [type] [options]"
    echo ""
    echo "Types:"
    echo "  deployment  - Check Vercel deployment status and logs"
    echo "  health      - Test API endpoint health"
    echo "  full        - Run comprehensive monitoring (default)"
    echo ""
    echo "Examples:"
    echo "  $0                    # Run comprehensive monitoring with defaults"
    echo "  $0 deployment         # Check deployment status for default project"
    echo "  $0 health             # Test API health for default URL"
    echo "  $0 full               # Run comprehensive monitoring"
    echo "  $0 deployment oil-painting-app"
    echo "  $0 health https://example.vercel.app"
    echo ""
    echo "Environment Variables:"
    echo "  PROJECT_NAME          - Default project name (current: $PROJECT_NAME)"
    echo "  BASE_URL             - Default base URL (current: $BASE_URL)"
    echo ""
    echo "Results are saved to: $RESULTS_DIR"
}

# Function to show recent results
show_recent_results() {
    print_status $BLUE "📄 Recent monitoring results:"
    
    if [[ -d "$RESULTS_DIR" ]]; then
        # Find the most recent files
        local recent_files=$(find "$RESULTS_DIR" -name "*.json" -o -name "*.md" | sort -r | head -5)
        
        if [[ -z "$recent_files" ]]; then
            print_status $YELLOW "   No recent results found"
        else
            for file in $recent_files; do
                local filename=$(basename "$file")
                local timestamp=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "$file" 2>/dev/null || stat -c "%y" "$file" 2>/dev/null | cut -d' ' -f1-2)
                print_status $GREEN "   $filename ($timestamp)"
            done
        fi
    else
        print_status $YELLOW "   Results directory doesn't exist yet"
    fi
}

# Main execution
main() {
    local command=${1:-full}
    
    # Handle help and info commands
    case $command in
        -h|--help|help)
            show_usage
            exit 0
            ;;
        -r|--results|results)
            show_recent_results
            exit 0
            ;;
    esac
    
    # Check prerequisites
    check_prerequisites
    
    print_status $BLUE "🚀 PixCart Monitoring System"
    print_status $BLUE "============================="
    echo ""
    
    # Execute based on command
    case $command in
        deployment|deploy)
            run_deployment_monitoring "$2"
            exit $?
            ;;
        health|api)
            run_health_checks "$2"
            exit $?
            ;;
        full|comprehensive|*)
            run_comprehensive_monitoring "$2" "$3"
            exit $?
            ;;
    esac
}

# Execute main function with all arguments
main "$@"