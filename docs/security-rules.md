# 🔒 Firestore Security Rules Documentation

## Overview

This document explains the Firestore security rules implemented to protect user data and prevent unauthorized access in the MyCareClaim application.

## 🚨 Critical Security Features

### 1. **User Data Isolation**
- **Rule**: Users can only access their own data
- **Implementation**: `request.auth.uid == userId`
- **Protection**: Prevents users from accessing other users' medical documents, chat history, and disputes

### 2. **Authentication Required**
- **Rule**: All operations require valid Firebase authentication
- **Implementation**: `request.auth != null`
- **Protection**: Prevents anonymous access to sensitive healthcare data

### 3. **Data Structure Validation**
- **Rule**: Enforces required fields and data types
- **Implementation**: `request.resource.data.keys().hasAll(['required', 'fields'])`
- **Protection**: Ensures data integrity and prevents malformed data

## 📋 Detailed Rule Breakdown

### User Collection Rules
```javascript
match /users/{userId} {
  // Users can only access their own profile
  allow read, write: if request.auth != null && request.auth.uid == userId;
  
  // Subcollections (analyses, chat_history, disputes) are protected
  match /{collection}/{document=**} {
    allow read, write: if request.auth != null && request.auth.uid == userId;
  }
}
```

**Protected Subcollections:**
- `analyses` - Document analysis results
- `chat_history` - AI agent conversations
- `disputes` - Billing dispute records

### Document Q&A History Rules
```javascript
match /document_qa_history/{documentId} {
  allow read, write: if request.auth != null && 
    resource.data.user_id == request.auth.uid;
}
```

**Protection**: Users can only access Q&A records they created

### Data Validation Rules

#### User Profile Validation
```javascript
allow create: if request.auth != null && 
  request.auth.uid == userId &&
  request.resource.data.keys().hasAll(['email', 'createdAt']) &&
  request.resource.data.email is string &&
  request.resource.data.createdAt is timestamp;
```

**Required Fields:**
- `email` - User's email address
- `createdAt` - Account creation timestamp

#### Document Analysis Validation
```javascript
allow create: if request.auth != null && 
  request.auth.uid == userId &&
  request.resource.data.keys().hasAll(['original_filename', 'status']) &&
  request.resource.data.original_filename is string &&
  request.resource.data.status in ['pending', 'processing', 'completed', 'failed'];
```

**Required Fields:**
- `original_filename` - Name of uploaded document
- `status` - Analysis status (must be one of allowed values)

#### Chat History Validation
```javascript
allow create: if request.auth != null && 
  request.auth.uid == userId &&
  request.resource.data.keys().hasAll(['question', 'answer']) &&
  request.resource.data.question is string &&
  request.resource.data.answer is string;
```

**Required Fields:**
- `question` - User's question
- `answer` - AI agent's response

#### Dispute Validation
```javascript
allow create: if request.auth != null && 
  request.auth.uid == userId &&
  request.resource.data.keys().hasAll(['document_id', 'error_type', 'status']) &&
  request.resource.data.error_type is string &&
  request.resource.data.status in ['draft', 'submitted', 'in_progress', 'resolved'];
```

**Required Fields:**
- `document_id` - Reference to disputed document
- `error_type` - Type of billing error
- `status` - Dispute status (must be one of allowed values)

### Data Integrity Rules

#### Document ID Validation
```javascript
analysisId.matches('^[a-zA-Z0-9_-]+$')
```

**Protection**: Prevents malicious document ID manipulation

#### Timestamp Requirements
```javascript
request.resource.data.created_at is timestamp
request.resource.data.updated_at is timestamp
```

**Protection**: Ensures audit trail compliance

## 🚀 Deployment Instructions

### 1. **Prerequisites**
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firestore (if not already done)
firebase init firestore
```

### 2. **Deploy Security Rules**
```bash
# Deploy only the security rules
firebase deploy --only firestore:rules

# Or use the deployment script
chmod +x deploy-security-rules.sh
./deploy-security-rules.sh
```

### 3. **Verify Deployment**
- Check Firebase Console → Firestore → Rules
- Verify the rules are active
- Test with your application

## ⚠️ Important Considerations

### 1. **Testing Required**
- **CRITICAL**: Test your application thoroughly after deployment
- The new rules may affect existing functionality
- Monitor Firebase Console for rule violations

### 2. **Data Structure Compliance**
- Ensure existing data matches the required structure
- Update any data that doesn't comply with validation rules
- Consider data migration if necessary

### 3. **Performance Impact**
- Security rules add overhead to database operations
- Monitor query performance after deployment
- Optimize queries if performance degrades

## 🔍 Monitoring and Maintenance

### 1. **Rule Violations**
- Monitor Firebase Console for rule violations
- Check application logs for access denied errors
- Investigate and fix any unexpected denials

### 2. **Regular Reviews**
- Review security rules quarterly
- Update rules based on new features
- Consider security audits annually

### 3. **Emergency Procedures**
```javascript
// Emergency lockdown (uncomment if needed)
// match /{document=**} {
//   allow read, write: if false;
// }
```

## 🛡️ Additional Security Recommendations

### 1. **Server-Side Validation**
- Implement additional validation in your Python backend
- Double-check user permissions before processing requests
- Log all access attempts for audit purposes

### 2. **Rate Limiting**
- Implement rate limiting in your backend API
- Prevent abuse of document upload and analysis features
- Monitor for unusual usage patterns

### 3. **Data Encryption**
- Consider encrypting sensitive medical data at rest
- Implement secure file upload validation
- Use HTTPS for all communications

### 4. **Access Logging**
- Log all database access attempts
- Monitor for suspicious access patterns
- Implement alerting for security events

## 📞 Support and Troubleshooting

### Common Issues
1. **Access Denied Errors**: Check if user is authenticated and accessing own data
2. **Validation Failures**: Ensure data structure matches required format
3. **Performance Issues**: Monitor rule complexity and optimize if needed

### Getting Help
- Check Firebase Console for rule violations
- Review application logs for error details
- Test rules in Firebase Console simulator
- Consult Firebase documentation for advanced rule patterns

---

**Last Updated**: December 2024  
**Version**: 1.0  
**Security Level**: Production Ready
