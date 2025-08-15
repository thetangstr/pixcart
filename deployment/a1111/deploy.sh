#!/bin/bash

# Automatic1111 Stable Diffusion WebUI - Google Cloud Deployment Script
# This script sets up and deploys A1111 to Google Cloud Run with GPU support

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID=""
REGION="us-central1"
SERVICE_NAME="a1111-webui"
SERVICE_ACCOUNT_NAME="a1111-service"
REPO_NAME="a1111-webui"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 is not installed. Please install it first."
        exit 1
    fi
}

# Function to check if user is logged into gcloud
check_gcloud_auth() {
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        print_error "You are not logged into gcloud. Please run 'gcloud auth login' first."
        exit 1
    fi
}

# Function to get project ID
get_project_id() {
    if [ -z "$PROJECT_ID" ]; then
        PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
        if [ -z "$PROJECT_ID" ]; then
            print_error "No project ID found. Please set one with 'gcloud config set project PROJECT_ID'"
            exit 1
        fi
    fi
    print_status "Using project: $PROJECT_ID"
}

# Function to enable required APIs
enable_apis() {
    print_status "Enabling required Google Cloud APIs..."
    
    gcloud services enable cloudbuild.googleapis.com --project=$PROJECT_ID
    gcloud services enable run.googleapis.com --project=$PROJECT_ID
    gcloud services enable containerregistry.googleapis.com --project=$PROJECT_ID
    gcloud services enable artifactregistry.googleapis.com --project=$PROJECT_ID
    gcloud services enable iam.googleapis.com --project=$PROJECT_ID
    
    print_success "APIs enabled successfully"
}

# Function to create service account
create_service_account() {
    print_status "Creating service account for A1111..."
    
    # Check if service account already exists
    if gcloud iam service-accounts describe ${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com --project=$PROJECT_ID &>/dev/null; then
        print_warning "Service account already exists"
    else
        gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
            --display-name="Automatic1111 WebUI Service Account" \
            --description="Service account for A1111 Stable Diffusion WebUI" \
            --project=$PROJECT_ID
        
        print_success "Service account created"
    fi
    
    # Grant necessary permissions
    print_status "Granting permissions to service account..."
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
        --role="roles/logging.logWriter"
    
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
        --role="roles/monitoring.metricWriter"
}

# Function to build and push Docker image
build_and_push() {
    print_status "Building Docker image with Cloud Build..."
    
    # Submit build to Cloud Build
    gcloud builds submit \
        --config=deployment/a1111/cloudbuild.yaml \
        --substitutions=_REGION=$REGION,_DEPLOY_TO_CLOUD_RUN=false \
        --project=$PROJECT_ID \
        .
    
    print_success "Docker image built and pushed successfully"
}

# Function to deploy to Cloud Run
deploy_to_cloud_run() {
    local config_file="${1:-cloud-run-service.yaml}"
    local service_name="${2:-$SERVICE_NAME}"
    
    print_status "Deploying to Cloud Run using $config_file..."
    
    # Replace PROJECT_ID in the service YAML
    sed "s/PROJECT_ID/$PROJECT_ID/g" "deployment/a1111/$config_file" > /tmp/cloud-run-service.yaml
    
    # Deploy the service
    gcloud run services replace /tmp/cloud-run-service.yaml \
        --region=$REGION \
        --project=$PROJECT_ID
    
    # Ensure the service allows unauthenticated requests
    gcloud run services add-iam-policy-binding $service_name \
        --member="allUsers" \
        --role="roles/run.invoker" \
        --region=$REGION \
        --project=$PROJECT_ID
    
    # Get the service URL
    SERVICE_URL=$(gcloud run services describe $service_name \
        --region=$REGION \
        --project=$PROJECT_ID \
        --format="value(status.url)")
    
    print_success "Service deployed successfully!"
    print_success "Service URL: $SERVICE_URL"
    
    # Clean up temporary file
    rm -f /tmp/cloud-run-service.yaml
}

# Function to deploy testing configuration (cost-optimized)
deploy_testing() {
    print_status "Deploying COST-OPTIMIZED testing configuration..."
    print_warning "This configuration uses minimal resources to reduce costs during testing"
    
    # Use testing service name
    local testing_service="a1111-webui-testing"
    deploy_to_cloud_run "cloud-run-testing.yaml" "$testing_service"
    
    echo ""
    print_success "Testing deployment complete!"
    print_warning "Cost optimization features:"
    echo "  • 2 CPUs instead of 4 (50% cost reduction)"
    echo "  • 8GB RAM instead of 16GB (50% cost reduction)"
    echo "  • Max 1 instance (prevents scaling costs)"
    echo "  • 15-minute timeout (reduces max billable time)"
    echo "  • Aggressive scale-to-zero"
    echo ""
    print_status "See deployment/a1111/cost-optimization.md for detailed cost management"
}

# Function to test the deployment
test_deployment() {
    print_status "Testing deployment..."
    
    SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
        --region=$REGION \
        --project=$PROJECT_ID \
        --format="value(status.url)")
    
    print_status "Waiting for service to be ready (this may take a few minutes for cold start)..."
    
    # Wait for the service to be ready
    for i in {1..30}; do
        if curl -s -f "$SERVICE_URL/sdapi/v1/options" > /dev/null 2>&1; then
            print_success "Service is responding!"
            break
        else
            print_status "Waiting for service... (attempt $i/30)"
            sleep 10
        fi
        
        if [ $i -eq 30 ]; then
            print_error "Service did not respond within expected time"
            print_status "Check logs with: gcloud run services logs read $SERVICE_NAME --region=$REGION --project=$PROJECT_ID"
        fi
    done
}

# Function to show deployment info
show_deployment_info() {
    SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
        --region=$REGION \
        --project=$PROJECT_ID \
        --format="value(status.url)")
    
    echo ""
    echo "============================================="
    echo "  A1111 Deployment Complete!"
    echo "============================================="
    echo ""
    echo "Service URL: $SERVICE_URL"
    echo "API Endpoint: $SERVICE_URL/sdapi/v1"
    echo "Health Check: $SERVICE_URL/sdapi/v1/options"
    echo ""
    echo "To test the API:"
    echo "curl $SERVICE_URL/sdapi/v1/options"
    echo ""
    echo "To view logs:"
    echo "gcloud run services logs read $SERVICE_NAME --region=$REGION --project=$PROJECT_ID"
    echo ""
    echo "To update your oil-painting-app, change A1111_BASE_URL to:"
    echo "$SERVICE_URL"
    echo ""
}

# Main deployment function
main() {
    print_status "Starting Automatic1111 deployment to Google Cloud..."
    
    # Pre-flight checks
    check_command gcloud
    check_command docker
    check_gcloud_auth
    get_project_id
    
    # Deployment steps
    enable_apis
    create_service_account
    build_and_push
    deploy_to_cloud_run
    test_deployment
    show_deployment_info
    
    print_success "Deployment completed successfully!"
}

# Handle script arguments
case "${1:-}" in
    "build")
        print_status "Building Docker image only..."
        check_command gcloud
        check_gcloud_auth
        get_project_id
        enable_apis
        build_and_push
        ;;
    "deploy")
        print_status "Deploying production configuration to Cloud Run..."
        check_command gcloud
        check_gcloud_auth
        get_project_id
        deploy_to_cloud_run
        show_deployment_info
        ;;
    "deploy-testing")
        print_status "Deploying COST-OPTIMIZED testing configuration..."
        check_command gcloud
        check_gcloud_auth
        get_project_id
        deploy_testing
        ;;
    "test")
        print_status "Testing existing deployment..."
        check_command gcloud
        get_project_id
        test_deployment
        ;;
    "info")
        get_project_id
        show_deployment_info
        ;;
    "costs")
        print_status "Showing cost optimization information..."
        cat deployment/a1111/cost-optimization.md
        ;;
    "")
        main
        ;;
    *)
        echo "Usage: $0 [build|deploy|deploy-testing|test|info|costs]"
        echo "  build          - Build and push Docker image only"
        echo "  deploy         - Deploy production configuration to Cloud Run"
        echo "  deploy-testing - Deploy COST-OPTIMIZED testing configuration (recommended for development)"
        echo "  test           - Test existing deployment"
        echo "  info           - Show deployment information"
        echo "  costs          - Show cost optimization guide"
        echo "  (no args)      - Full production deployment"
        echo ""
        echo "For cost-effective testing, use: $0 deploy-testing"
        exit 1
        ;;
esac