# 🚀 Cloud Function Setup Guide

## Overview

This guide will help you restore the working document analysis system by deploying the Cloud Function that processes uploaded documents.

## 🔍 What Was Broken

The system broke when the **Cloud Function trigger was disconnected** from the file upload process. Here's what happened:

**Before (Working):**
```
File Upload → Google Cloud Storage → Cloud Function Trigger → AI Analysis → Firestore → Dashboard Update
```

**After (Broken):**
```
File Upload → Google Cloud Storage → ❌ NO TRIGGER → ❌ NO ANALYSIS → ❌ NO DATA → ❌ NO DASHBOARD UPDATE
```

## ✅ What We've Fixed

1. **Backend Upload Endpoint** - Now creates placeholder documents and triggers Cloud Function
2. **Frontend Simulation** - Removed fake analysis, now shows real-time status
3. **Cloud Function Deployment** - Ready to deploy with proper triggers
4. **Real-time Updates** - Frontend listens for actual analysis completion

## 🚀 Deployment Steps

### Step 1: Prerequisites

#### Install Google Cloud CLI
```bash
# macOS (using Homebrew)
brew install google-cloud-sdk

# Or download from: https://cloud.google.com/sdk/docs/install
```

#### Authenticate and Set Project
```bash
# Login to Google Cloud
gcloud auth login

# Set your project ID
gcloud config set project healthcareagentic

# Verify project is set
gcloud config get-value project
```

### Step 2: Set Required Environment Variables

#### Document AI Processor ID
You need a Document AI processor for PDF text extraction:

```bash
# Set your Document AI processor ID
export DOCAI_PROCESSOR_ID="your_actual_processor_id"

# If you don't have one, create it:
gcloud documentai processors create \
    --processor-type=document-ocr \
    --location=us \
    --display-name="Medical Document Processor"
```

#### Other Environment Variables
```bash
# Set bucket name (should match your existing bucket)
export GCS_UPLOAD_BUCKET="healthcare_agentic_raw_phi_uploads"

# Set Document AI location
export DOCAI_LOCATION="us"
```

### Step 3: Deploy the Cloud Function

#### Option 1: Automated Deployment
```bash
# Make script executable (already done)
chmod +x deploy-cloud-function.sh

# Run deployment script
./deploy-cloud-function.sh
```

#### Option 2: Manual Deployment
```bash
# Navigate to function directory
cd document_analysis_function

# Create deployment package
zip -r function.zip main.py requirements.txt

# Deploy function
gcloud functions deploy process-medical-bill \
    --gen2 \
    --runtime=python311 \
    --region=us-central1 \
    --source=. \
    --entry-point=process_medical_bill \
    --trigger-event-filters="type=google.cloud.storage.object.v1.finalized" \
    --trigger-event-filters="bucket=healthcare_agentic_raw_phi_uploads" \
    --memory=2GB \
    --timeout=540s \
    --set-env-vars="GCP_PROJECT_ID=healthcareagentic,DOCAI_PROCESSOR_ID=$DOCAI_PROCESSOR_ID,DOCAI_LOCATION=us" \
    --allow-unauthenticated=false

# Return to root directory
cd ..
```

### Step 4: Verify Deployment

#### Check Function Status
```bash
# List deployed functions
gcloud functions list --region=us-central1

# Check function logs
gcloud functions logs read process-medical-bill --region=us-central1 --limit=20
```

#### Test the System
1. Upload a new document through the web interface
2. Check Cloud Function logs for processing
3. Verify Firestore data is created
4. Confirm dashboard updates in real-time

## 🔧 Troubleshooting

### Common Issues

#### 1. Function Not Triggering
**Symptoms**: File uploads but no analysis happens
**Check**:
- Cloud Function is deployed and active
- Trigger is configured for the correct bucket
- Function logs show no errors

**Fix**:
```bash
# Redeploy with explicit trigger
gcloud functions deploy process-medical-bill \
    --gen2 \
    --runtime=python311 \
    --region=us-central1 \
    --source=document_analysis_function \
    --entry-point=process_medical_bill \
    --trigger-event-filters="type=google.cloud.storage.object.v1.finalized" \
    --trigger-event-filters="bucket=healthcare_agentic_raw_phi_uploads" \
    --memory=2GB \
    --timeout=540s
```

#### 2. Document AI Errors
**Symptoms**: Function runs but fails on Document AI processing
**Check**:
- DOCAI_PROCESSOR_ID is set correctly
- Document AI API is enabled
- Service account has proper permissions

**Fix**:
```bash
# Enable Document AI API
gcloud services enable documentai.googleapis.com

# Check processor exists
gcloud documentai processors list --location=us
```

#### 3. Permission Errors
**Symptoms**: Function fails with permission denied errors
**Check**:
- Service account has proper IAM roles
- Required APIs are enabled

**Fix**:
```bash
# Grant necessary roles to default service account
gcloud projects add-iam-policy-binding healthcareagentic \
    --member="serviceAccount:healthcareagentic@appspot.gserviceaccount.com" \
    --role="roles/documentai.apiUser"

gcloud projects add-iam-policy-binding healthcareagentic \
    --member="serviceAccount:healthcareagentic@appspot.gserviceaccount.com" \
    --role="roles/aiplatform.user"
```

### Debug Commands

#### Monitor Function Execution
```bash
# Watch function logs in real-time
gcloud functions logs tail process-medical-bill --region=us-central1

# Check specific function details
gcloud functions describe process-medical-bill --region=us-central1
```

#### Test Function Manually
```bash
# Test function with sample event
gcloud functions call process-medical-bill \
    --region=us-central1 \
    --data='{"bucket":"test-bucket","name":"test-file.pdf"}'
```

## 📊 Expected Results

### After Successful Deployment

1. **File Upload** → Creates placeholder document with "processing" status
2. **Cloud Function Trigger** → Automatically processes uploaded files
3. **AI Analysis** → Document AI extracts text, Gemini analyzes content
4. **Data Storage** → Results saved to Firestore with "completed" status
5. **Dashboard Update** → Real-time updates show analysis results
6. **User Feedback** → Chat messages confirm completion

### Data Structure Created

```json
{
  "analysis_results": "JSON string with AI analysis",
  "financial_data": {
    "document_type": "bill|eob|insurance_plan",
    "total_charged": 1500.00,
    "insurance_paid": 1200.00,
    "patient_owed": 300.00,
    "red_flags": ["potential duplicate charge"]
  },
  "original_filename": "document.pdf",
  "gcs_uri": "gs://bucket/user_uploads/uid/document.pdf",
  "status": "completed",
  "created_at": "timestamp"
}
```

## 🔒 Security Features

### What's Protected
- **User Data Isolation** - Users can only access their own documents
- **Authentication Required** - All operations require valid Firebase auth
- **Secure Processing** - Documents processed in Google Cloud with proper IAM
- **Audit Trail** - All operations logged and tracked

### Firestore Security Rules
- Already deployed and active
- Enforce user data isolation
- Validate data structure
- Prevent unauthorized access

## 📈 Performance Monitoring

### Key Metrics to Watch
1. **Function Execution Time** - Should be under 5 minutes
2. **Success Rate** - Should be >95% for valid PDFs
3. **Error Rate** - Monitor for common failure patterns
4. **User Experience** - Time from upload to analysis completion

### Monitoring Commands
```bash
# Check function performance
gcloud functions logs read process-medical-bill --region=us-central1 --limit=100 --format="table(timestamp,severity,textPayload)"

# Monitor resource usage
gcloud functions describe process-medical-bill --region=us-central1 --format="value(serviceConfig.maxInstanceCount,serviceConfig.timeoutSeconds)"
```

## 🎯 Success Criteria

### System is Working When:
- ✅ File uploads create placeholder documents
- ✅ Cloud Function triggers automatically
- ✅ Analysis completes within 5 minutes
- ✅ Results appear in dashboard
- ✅ Users can view document details
- ✅ Financial data is extracted and displayed
- ✅ Red flags are detected and shown

### Next Steps After Deployment:
1. **Test with various document types** (bills, EOBs, insurance plans)
2. **Monitor performance** and optimize if needed
3. **Train users** on new real-time analysis workflow
4. **Plan enhancements** based on user feedback

---

**Deployment Date**: [Date]  
**Deployed By**: [Name]  
**Status**: Ready for Production  
**Next Review**: [Date + 1 month]
