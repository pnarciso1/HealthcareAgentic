#!/bin/bash

# ========================================
# Firestore Security Rules Deployment Script
# ========================================
# This script deploys the Firestore security rules to your Firebase project
# 
# Prerequisites:
# 1. Firebase CLI installed: npm install -g firebase-tools
# 2. Logged into Firebase: firebase login
# 3. Project initialized: firebase init firestore
# ========================================

echo "🚀 Deploying Firestore Security Rules..."
echo "========================================"

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Please install it first:"
    echo "   npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged into Firebase
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged into Firebase. Please login first:"
    echo "   firebase login"
    exit 1
fi

# Check if firestore.rules file exists
if [ ! -f "firestore.rules" ]; then
    echo "❌ firestore.rules file not found in current directory"
    exit 1
fi

# Deploy the security rules
echo "📋 Deploying security rules to Firebase..."
firebase deploy --only firestore:rules

if [ $? -eq 0 ]; then
    echo "✅ Security rules deployed successfully!"
    echo ""
    echo "🔒 Your Firestore database is now protected with:"
    echo "   • User data isolation (users can only access their own data)"
    echo "   • Input validation and data structure enforcement"
    echo "   • Rate limiting to prevent abuse"
    echo "   • Document ID validation"
    echo "   • Timestamp requirements for audit compliance"
    echo ""
    echo "⚠️  IMPORTANT: Test your application thoroughly after deployment!"
    echo "   The new rules may affect existing functionality if data doesn't"
    echo "   match the expected structure."
else
    echo "❌ Failed to deploy security rules. Please check the error above."
    exit 1
fi

echo ""
echo "📚 Next steps:"
echo "   1. Test your application to ensure it works with the new rules"
echo "   2. Monitor Firebase Console for any rule violations"
echo "   3. Consider implementing additional server-side validation"
echo "   4. Review the rules periodically for security updates"
