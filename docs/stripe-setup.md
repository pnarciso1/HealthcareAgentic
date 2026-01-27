# 🚀 Stripe Live Setup Guide

## **Step 1: Get Your Live Stripe Keys**

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Toggle from "Test mode" to "Live mode" (top right)
3. Go to **Developers → API keys**
4. Copy your **Live publishable key** (starts with `pk_live_`)

## **Step 2: Create Live Products and Prices**

### **In Live Mode:**
1. Go to **Products** in your Stripe Dashboard
2. Create two products:

   **Product 1: Complete Care Monthly**
   - Name: "Complete Care Monthly"
   - Price: $7.99/month
   - Billing: Recurring
   - Copy the Price ID (starts with `price_`)

   **Product 2: Complete Care Yearly**
   - Name: "Complete Care Yearly" 
   - Price: $79/year
   - Billing: Recurring
   - Copy the Price ID (starts with `price_`)

## **Step 3: Set Up Live Webhook**

### **In Live Mode:**
1. Go to **Developers → Webhooks**
2. Click **"Add endpoint"**
3. **Endpoint URL**: `https://your-domain.com/stripe-webhook`
4. **Events to send**: Select `checkout.session.completed`
5. Copy the **Webhook signing secret** (starts with `whsec_`)

## **Step 4: Update Environment Variables**

Add these to your `.env` file:

```bash
# --- STRIPE LIVE CONFIGURATION ---
STRIPE_SECRET_KEY=sk_live_your_live_secret_key_here
STRIPE_MONTHLY_PRICE_ID=price_your_monthly_price_id_here
STRIPE_YEARLY_PRICE_ID=price_your_yearly_price_id_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# --- FRONTEND DOMAIN ---
FRONTEND_DOMAIN=https://your-domain.com
```

## **Step 5: Update Frontend Stripe Key**

In `public/app.js`, line 42, replace:
```javascript
const stripe = Stripe('pk_test_YOUR_STRIPE_PUBLISHABLE_KEY');
```

With your live publishable key:
```javascript
const stripe = Stripe('pk_live_your_live_publishable_key_here');
```

## **Step 6: Update Backend Domain**

In `main.py`, line 25, update:
```python
YOUR_DOMAIN = 'https://your-domain.com'  # Your actual domain
```

## **Step 7: Test the Integration**

1. **Test Checkout**: Try creating a checkout session
2. **Test Webhook**: Make a test purchase and verify webhook fires
3. **Verify Database**: Check that user subscription is updated in Firestore

## **Security Checklist**

- [ ] Never commit `.env` file to GitHub
- [ ] Use HTTPS for all webhook endpoints
- [ ] Verify webhook signatures
- [ ] Use environment variables for all secrets
- [ ] Test in live mode with small amounts first

## **Troubleshooting**

### **Common Issues:**
1. **Webhook not firing**: Check endpoint URL and HTTPS
2. **Price ID errors**: Verify price IDs are from live mode
3. **Signature verification failed**: Check webhook secret
4. **Customer creation failed**: Verify API key permissions

### **Support:**
- Stripe Documentation: [stripe.com/docs](https://stripe.com/docs)
- Stripe Support: [support.stripe.com](https://support.stripe.com) 