# 🚀 Quick Deployment Checklist

## Immediate Actions Required

### ✅ Step 1: Set Environment Variables
```bash
# Set your Document AI processor ID (REQUIRED)
export DOCAI_PROCESSOR_ID="your_actual_processor_id"

# Set bucket name (should match existing)
export GCS_UPLOAD_BUCKET="healthcare_agentic_raw_phi_uploads"
```

### ✅ Step 2: Deploy Cloud Function
```bash
# Run the automated deployment script
./deploy-cloud-function.sh
```

### ✅ Step 3: Test the System
1. Upload a new document through the web interface
2. Check Cloud Function logs: `gcloud functions logs read process-medical-bill --region=us-central1 --limit=20`
3. Verify Firestore data is created
4. Confirm dashboard updates in real-time

## 🔍 What to Look For

### Success Indicators
- ✅ File upload creates placeholder document with "processing" status
- ✅ Cloud Function triggers automatically (check logs)
- ✅ Analysis completes within 5 minutes
- ✅ Results appear in dashboard with "completed" status
- ✅ Financial data is extracted and displayed

### Failure Indicators
- ❌ Function not triggering (check trigger configuration)
- ❌ Document AI errors (check processor ID and permissions)
- ❌ Permission errors (check IAM roles)
- ❌ Timeout errors (check function configuration)

## 🆘 Emergency Contacts

### If Deployment Fails
1. **Check function logs**: `gcloud functions logs read process-medical-bill --region=us-central1`
2. **Verify function status**: `gcloud functions list --region=us-central1`
3. **Check trigger configuration**: `gcloud functions describe process-medical-bill --region=us-central1`

### Rollback Plan
If critical issues arise:
```bash
# Delete the function
gcloud functions delete process-medical-bill --region=us-central1

# Revert to previous working state
# (The system will return to file upload only, no analysis)
```

---

**Priority**: URGENT - System currently broken  
**Estimated Fix Time**: 15-30 minutes  
**Risk Level**: LOW - Only adding missing functionality
