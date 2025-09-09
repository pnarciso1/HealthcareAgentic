# 🎫 Complete Coupon Code Implementation

## Overview

This document describes the complete implementation of coupon code functionality for the HealthcareAgentic platform. The system allows users to apply coupon codes during checkout to receive discounts on their subscription plans, with special support for 100% off coupons that provide free memberships.

## ✅ Implementation Status

**FULLY IMPLEMENTED AND WORKING** ✅
- ✅ Backend coupon validation and Stripe integration
- ✅ Frontend UI with coupon input and validation
- ✅ Beautiful modal for free subscription explanation
- ✅ Webhook integration for subscription activation
- ✅ User experience improvements for $0.00 checkouts
- ✅ ENTERPRISE75 coupon (75% off for 12 months)
- ✅ Persistent success messages with dismiss functionality
- ✅ Support for both monthly and yearly plans

## Features

- **Coupon Validation**: Real-time validation of coupon codes
- **Plan-Specific Coupons**: Coupons can be restricted to specific subscription plans
- **Multi-Plan Support**: Coupons can work with both monthly and yearly plans
- **Usage Tracking**: Tracks coupon usage to prevent abuse
- **Stripe Integration**: Uses Stripe's native promotion system
- **100% Off Support**: Special handling for free memberships
- **Partial Discount Support**: Support for percentage-based discounts (e.g., 75% off)
- **User Experience**: Beautiful modals explaining subscription terms
- **Persistent Messages**: Success messages stay visible until user dismisses them
- **Optional Payment Method**: Reduces confusion for $0.00 checkouts
- **Webhook Integration**: Automatic subscription activation

## Coupon Configuration

### Valid Coupons

The system currently supports the following coupon codes:

```python
PROMOTION_CONFIG = {
    'FRIENDSFOREVER': {
        'name': 'Friends Forever - 100% Off',
        'stripe_promo_id': 'promo_1S09wVH0nOEj29DyKss41Ysu',  # Your Stripe promo code
        'percent_off': 100,  # 100% off
        'applicable_plans': ['yearly'],  # Only valid for yearly plan
        'description': 'Get your yearly membership for free forever!'
    },
    'ENTERPRISE75': {
        'name': 'Enterprise Discount Trial - 75% Off',
        'stripe_promo_id': 'promo_1S5AX8H0nOEj29DyOgfPFYaV',  # Full Stripe promo code from dashboard
        'percent_off': 75,  # 75% off
        'applicable_plans': ['monthly', 'yearly'],  # Valid for both monthly and yearly plans
        'duration_months': 12,  # 12 months duration
        'description': '75% off for first 12 months'
    }
}
```

### Adding New Coupons

To add a new coupon, simply add it to the `PROMOTION_CONFIG` dictionary in `main.py`:

```python
'NEWCOUPON': {
    'name': 'New Coupon Name',
    'stripe_promo_id': 'promo_your_stripe_promo_id_here',
    'percent_off': 50,  # 50% off
    'applicable_plans': ['monthly', 'yearly'],
    'description': 'Description of the coupon'
}
```

## API Endpoints

### 1. Coupon Validation

**Endpoint**: `POST /validate-coupon`

**Purpose**: Validate a coupon code before checkout

**Request Body**:
```json
{
    "couponCode": "FRIENDSFOREVER",
    "plan": "yearly"
}
```

**Response** (Success):
```json
{
    "couponCode": "FRIENDSFOREVER",
    "plan": "yearly",
    "discountType": "percentage",
    "discountAmount": 100,
    "applicablePlans": ["yearly"],
    "maxUses": 100,
    "expiresAt": "N/A",
    "description": "Get your yearly membership for free forever!"
}
```

**Response** (Error):
```json
{
    "error": "Invalid or expired coupon code"
}
```

### 2. Checkout Session Creation

**Endpoint**: `POST /create-checkout-session`

**Purpose**: Create a Stripe checkout session with optional coupon application

**Request Body**:
```json
{
    "plan": "yearly",
    "couponCode": "FRIENDSFOREVER"  // Optional: coupon code
}
```

**Features**:
- Automatically validates coupon codes
- Uses Stripe's native promotion system
- Tracks coupon usage in session metadata
- Returns Stripe checkout session ID

## Complete Implementation

### Frontend Implementation

#### 1. Coupon Input UI
- **Location**: Pricing page and upgrade prompt modal
- **Elements**: Input field, apply button, success/error messages
- **Validation**: Real-time validation with backend API

#### 2. Free Subscription Modal
- **Trigger**: When FRIENDSFOREVER coupon is applied
- **Content**: Explains free membership and what to expect
- **Features**: 
  - Clear messaging about $0.00 charge
  - Explanation of optional payment method requirement
  - Professional design with call-to-action buttons

#### 3. Enterprise Discount Modal
- **Trigger**: When ENTERPRISE75 coupon is applied
- **Content**: Explains 75% off for 12 months, then full billing
- **Features**:
  - Dynamic pricing based on selected plan (monthly/yearly)
  - Clear explanation of billing terms
  - Required payment method notification
  - Professional design with call-to-action buttons

#### 4. User Experience Improvements
- **Optional Payment Method**: `payment_method_collection: 'if_required'` in Stripe
- **Clear Messaging**: Explains why Stripe may ask for payment info
- **Immediate Feedback**: Success/error messages for coupon validation
- **Persistent Success Messages**: Messages stay visible until user dismisses them
- **Dismiss Functionality**: Users can manually hide success messages with "×" button
- **Multi-Plan Support**: Coupons work with both monthly and yearly plans

### Backend Implementation

#### 1. Coupon Validation System
```python
PROMOTION_CONFIG = {
    'FRIENDSFOREVER': {
        'name': 'Friends Forever - 100% Off',
        'stripe_promo_id': 'promo_1S09wVH0nOEj29DyKss41Ysu',
        'percent_off': 100,
        'applicable_plans': ['yearly'],
        'description': 'Get your yearly membership for free forever!'
    }
}
```

#### 2. Stripe Integration
- **Promotion Codes**: Uses Stripe's native promotion system
- **Checkout Sessions**: Applies coupons via `discounts` parameter
- **Webhook Handling**: Processes `checkout.session.completed` events

#### 3. Webhook Configuration
- **Endpoint**: Uses existing webhook for paid subscriptions
- **Events**: Listens for `checkout.session.completed`
- **Security**: Stripe signature verification
- **Activation**: Automatically activates user subscriptions

## How It Works

### 1. Complete User Flow

1. **User enters coupon code** in frontend
2. **Frontend validates** coupon via `/validate-coupon` endpoint
3. **Backend validates**:
   - Coupon exists in configuration
   - Plan is applicable
   - Stripe promotion is active
   - Usage limit not exceeded
4. **Success message** displayed to user
5. **User clicks checkout** button
6. **Free subscription modal** appears (for FRIENDSFOREVER)
7. **User confirms** and proceeds to Stripe checkout
8. **Stripe processes** $0.00 payment with optional payment method
9. **Webhook triggers** on successful checkout
10. **Subscription activated** in Firestore
11. **User gets Premium access** immediately

### 2. Technical Flow

#### Frontend → Backend
```javascript
// Coupon validation
fetch('/validate-coupon', {
    method: 'POST',
    body: JSON.stringify({ couponCode: 'FRIENDSFOREVER', plan: 'yearly' })
});

// Checkout with coupon
fetch('/create-checkout-session', {
    method: 'POST',
    body: JSON.stringify({ plan: 'yearly', couponCode: 'FRIENDSFOREVER' })
});
```

#### Backend → Stripe
```python
# Create checkout session with coupon
session_params = {
    'customer': stripe_customer_id,
    'line_items': [{'price': price_id, 'quantity': 1}],
    'mode': 'subscription',
    'payment_method_collection': 'if_required',  # Optional payment method
    'discounts': [{'coupon': coupon_id}]  # Apply coupon
}
```

#### Stripe → Backend (Webhook)
```python
# Process successful checkout
if event['type'] == 'checkout.session.completed':
    session = event['data']['object']
    firebase_uid = session.get('metadata', {}).get('firebase_uid')
    
    # Activate subscription
    user_ref = db.collection('users').document(firebase_uid)
    user_ref.update({
        'subscriptionTier': 'complete_care',
        'stripeSubscriptionId': session.get('subscription')
    })
```

## Special Cases

### 100% Off Coupons (Free Memberships)

For coupons that provide 100% off (like `FRIENDSFOREVER`):

1. System validates the Stripe promotion code
2. Applies promotion to checkout session
3. User gets subscription for free
4. Stripe automatically tracks usage

## Security Features

- **Authentication Required**: All endpoints require valid Firebase tokens
- **Usage Limits**: Prevents coupon abuse via Stripe's built-in limits
- **Plan Restrictions**: Coupons only work with specified plans
- **Stripe Validation**: All coupons validated through Stripe's system
- **Webhook Verification**: Stripe signature verification

## Deployment

### Backend Deployment

```bash
# Deploy to Cloud Run
gcloud run deploy coupon-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Frontend Deployment

```bash
# Deploy to Firebase Hosting
firebase deploy --only hosting
```

### Webhook Configuration

**IMPORTANT**: Use the existing webhook endpoint for paid subscriptions:
- **URL**: `https://healthcareagentic-backend-974408923536.us-central1.run.app/stripe-webhook`
- **Events**: `checkout.session.completed`
- **Secret**: `whsec_xybLsA2xN0BuGHdhJqLuwC8cNPX1rbPm`

## Testing

### 1. Backend Testing

Use the provided test script:
```bash
python test_coupon_backend.py
```

### 2. End-to-End Testing

#### FRIENDSFOREVER Coupon (100% Off)
1. **Go to live site**: https://mycareclaim.com
2. **Enter coupon**: `FRIENDSFOREVER`
3. **Select yearly plan**: Click "Start Saving Today"
4. **Verify modal**: Free subscription modal should appear
5. **Complete checkout**: Proceed through Stripe
6. **Check subscription**: User should have Premium access immediately

#### ENTERPRISE75 Coupon (75% Off)
1. **Go to live site**: https://mycareclaim.com
2. **Enter coupon**: `ENTERPRISE75`
3. **Test monthly plan**: 
   - Select monthly plan
   - Verify success message: "✅ 75% off monthly plan - 75% off for first 12 months"
   - Complete checkout
   - Verify Stripe shows $2.00/month (75% off $7.99)
4. **Test yearly plan**:
   - Select yearly plan  
   - Verify success message: "✅ 75% off yearly plan - 75% off for first 12 months"
   - Complete checkout
   - Verify Stripe shows $19.75/year (75% off $79)
5. **Check subscription**: User should have Premium access immediately

#### User Experience Testing
1. **Persistent Messages**: Success messages should stay visible (not disappear after 5 seconds)
2. **Dismiss Functionality**: Click "×" button to hide success messages
3. **Modal Clarity**: Enterprise modal should show correct pricing for selected plan

### 3. Webhook Testing

Monitor webhook events in Stripe Dashboard:
1. Go to **Developers** → **Webhooks**
2. Click on your webhook endpoint
3. Check **"Recent deliveries"** for successful events
4. Verify **HTTP 200** responses

### 4. Log Monitoring

```bash
# Monitor Cloud Run logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=coupon-backend" --limit=20 --project=healthcareagentic
```

## Monitoring and Analytics

### Logging

The system provides comprehensive logging:

- Coupon validation attempts
- Successful coupon applications
- Stripe promotion retrieval
- Error conditions

### Metrics to Track

- Coupon usage frequency
- Conversion rates with/without coupons
- Stripe promotion performance
- User acquisition through coupons

## Future Enhancements

### Planned Features

1. **Dynamic Coupon Creation**: Admin interface for creating coupons
2. **User-Specific Coupons**: Personalized coupon codes
3. **Referral System**: Coupons for referring friends
4. **A/B Testing**: Test different coupon strategies
5. **Analytics Dashboard**: Visual coupon performance metrics

### Technical Improvements

1. **Redis Caching**: Cache coupon validation results
2. **Rate Limiting**: Prevent brute force coupon attempts
3. **Webhook Retry Logic**: Handle failed webhook deliveries
4. **Coupon Templates**: Reusable coupon configurations

## Troubleshooting

### Issues Encountered and Solutions

#### 1. Webhook Not Triggering
**Problem**: Users completed checkout but didn't get Premium access
**Root Cause**: Webhook secret mismatch between `.env` file and Stripe Dashboard
**Solution**: Use existing webhook endpoint for paid subscriptions instead of creating new one

#### 2. Stripe API Key Truncation
**Problem**: `Invalid API Key provided` error during deployment
**Root Cause**: API key getting truncated when set via `--set-env-vars`
**Solution**: Use `.env` file for environment variables instead

#### 3. Payment Method Required for $0.00
**Problem**: Stripe still asking for payment method despite $0.00 amount
**Root Cause**: Stripe's subscription model requires payment method for future billing
**Solution**: Added `payment_method_collection: 'if_required'` and clear user messaging

#### 4. Coupon Not Applied to Monthly Plans
**Problem**: ENTERPRISE75 coupon worked for yearly but not monthly plans
**Root Cause**: Frontend wasn't passing coupon code to checkout for monthly plans
**Solution**: 
- Fixed monthly button in upgrade modal to pass `currentCouponCode`
- Updated pricing page to apply coupons to both monthly and yearly plans
- Added proper coupon code handling in checkout session creation

#### 5. Success Messages Disappearing
**Problem**: Coupon success messages disappeared after 5 seconds, confusing users
**Root Cause**: Auto-hide timeout was removing success feedback
**Solution**:
- Removed auto-hide timeout for success messages
- Added dismiss button ("×") for user control
- Messages now persist until user takes action

#### 6. Webhook Signature Verification
**Problem**: `Invalid signature` errors
**Root Cause**: Webhook secret mismatch
**Solution**: Ensure webhook secret in `.env` matches Stripe Dashboard

### Common Issues

1. **Coupon Not Working**: 
   - Check if Stripe promotion is active
   - Verify promotion code ID in `PROMOTION_CONFIG`
   - Check usage limits in Stripe Dashboard

2. **Wrong Plan Error**: 
   - Verify coupon is applicable to selected plan
   - Check `applicable_plans` in configuration

3. **Stripe Errors**: 
   - Verify Stripe API keys and promotion codes
   - Check Stripe Dashboard for promotion status

4. **Webhook Issues**: 
   - Check webhook endpoint and signature verification
   - Monitor webhook deliveries in Stripe Dashboard
   - Verify webhook secret matches

5. **User Not Getting Premium Access**:
   - Check webhook logs for successful events
   - Verify Firestore user document updates
   - Check if webhook is processing `checkout.session.completed` events

### Debug Mode

Enable debug logging by checking the backend console output. All coupon operations are logged with detailed information:

```bash
# Monitor logs in real-time
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=coupon-backend" --limit=50 --project=healthcareagentic
```

## Support

For issues or questions about the coupon implementation:

1. Check the backend logs for error messages
2. Verify coupon configuration in `PROMOTION_CONFIG`
3. Test with the provided test script
4. Review Stripe dashboard for promotion details
