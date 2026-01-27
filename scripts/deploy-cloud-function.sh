#!/bin/bash

# ========================================
# Cloud Function Deployment Script
# ========================================
# This script deploys the document analysis Cloud Function to Google Cloud
# 
# Prerequisites:
# 1. Google Cloud CLI installed and configured
# 2. Project ID set: gcloud config set project YOUR_PROJECT_ID
# 3. Required APIs enabled
# 4. Service account with proper permissions
# ========================================

echo "🚀 Deploying Document Analysis Cloud Function..."
echo "================================================"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud CLI not found. Please install it first:"
    echo "   https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Not authenticated with Google Cloud. Please login first:"
    echo "   gcloud auth login"
    exit 1
fi

# Get project ID
PROJECT_ID=$(gcloud config get-value project)
if [ -z "$PROJECT_ID" ]; then
    echo "❌ No project ID set. Please set it first:"
    echo "   gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo "📋 Project ID: $PROJECT_ID"

# Check if required APIs are enabled
echo "🔍 Checking required APIs..."
REQUIRED_APIS=(
    "cloudfunctions.googleapis.com"
    "cloudbuild.googleapis.com"
    "documentai.googleapis.com"
    "aiplatform.googleapis.com"
    "firestore.googleapis.com"
    "storage.googleapis.com"
)

for api in "${REQUIRED_APIS[@]}"; do
    if ! gcloud services list --enabled --filter="name:$api" --format="value(name)" | grep -q "$api"; then
        echo "⚠️  Enabling API: $api"
        gcloud services enable "$api"
    else
        echo "✅ API enabled: $api"
    fi
done

# Set environment variables
echo "🔧 Setting environment variables..."
export GCP_PROJECT_ID="$PROJECT_ID"
export DOCAI_PROCESSOR_ID="${DOCAI_PROCESSOR_ID:-your_docai_processor_id}"
export DOCAI_LOCATION="${DOCAI_LOCATION:-us}"
export GCS_UPLOAD_BUCKET="${GCS_UPLOAD_BUCKET:-healthcare_agentic_raw_phi_uploads}"

echo "📝 Environment variables:"
echo "   GCP_PROJECT_ID: $GCP_PROJECT_ID"
echo "   DOCAI_PROCESSOR_ID: $DOCAI_PROCESSOR_ID"
echo "   DOCAI_LOCATION: $DOCAI_LOCATION"
echo "   GCS_UPLOAD_BUCKET: $GCS_UPLOAD_BUCKET"

# Check if Document AI processor ID is set
if [ "$DOCAI_PROCESSOR_ID" = "your_docai_processor_id" ]; then
    echo "⚠️  WARNING: DOCAI_PROCESSOR_ID not set. You'll need to set this before the function will work."
    echo "   You can set it with: export DOCAI_PROCESSOR_ID=your_actual_processor_id"
fi

# Create deployment package
echo "📦 Creating deployment package..."
cd document_analysis_function

# Remove old zip files
rm -f function.zip function_v2.zip function_final.zip

# Create new zip file
zip -r function.zip main.py requirements.txt

# Go back to root directory
cd ..

# Deploy the Cloud Function
echo "🚀 Deploying Cloud Function..."
gcloud functions deploy process-medical-bill \
    --gen2 \
    --runtime=python311 \
    --region=us-central1 \
    --source=document_analysis_function \
    --entry-point=process_medical_bill \
    --trigger-event-filters="type=google.cloud.storage.object.v1.finalized" \
    --trigger-event-filters="bucket=$GCS_UPLOAD_BUCKET" \
    --memory=2GB \
    --timeout=540s \
    --set-env-vars="GCP_PROJECT_ID=$GCP_PROJECT_ID,DOCAI_PROCESSOR_ID=$DOCAI_PROCESSOR_ID,DOCAI_LOCATION=$DOCAI_LOCATION" \
    --allow-unauthenticated=false

if [ $? -eq 0 ]; then
    echo "✅ Cloud Function deployed successfully!"
    echo ""
    echo "🔒 Your document analysis system is now protected with:"
    echo "   • Automatic AI analysis of uploaded documents"
    echo "   • Document AI text extraction"
    echo "   • Gemini AI financial analysis"
    echo "   • Secure Firestore data storage"
    echo "   • Real-time dashboard updates"
    echo ""
    echo "⚠️  IMPORTANT: Make sure to set DOCAI_PROCESSOR_ID if you haven't already:"
    echo "   export DOCAI_PROCESSOR_ID=your_actual_processor_id"
    echo ""
    echo "📚 Next steps:"
    echo "   1. Test document upload and analysis"
    echo "   2. Monitor Cloud Function logs for any errors"
    echo "   3. Verify Firestore data is being created"
    echo "   4. Check dashboard updates in real-time"
else
    echo "❌ Failed to deploy Cloud Function. Please check the error above."
    exit 1
fi

echo ""
echo "🔍 To monitor the function:"
echo "   gcloud functions logs read process-medical-bill --region=us-central1 --limit=50"
