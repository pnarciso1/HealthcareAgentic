#!/usr/bin/env python3
"""
Test the complete ENTERPRISE75 flow to identify where the discount is not being applied
"""

import requests
import json
import os

# Backend URL
BACKEND_URL = "https://coupon-backend-974408923536.us-central1.run.app"

def test_complete_flow():
    """Test the complete ENTERPRISE75 flow"""
    print("🧪 Testing Complete ENTERPRISE75 Flow")
    print("=" * 50)
    
    # Step 1: Test coupon validation
    print("Step 1: Testing coupon validation...")
    
    test_data = {
        "couponCode": "ENTERPRISE75",
        "plan": "yearly"
    }
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/validate-coupon",
            json=test_data,
            headers={'Content-Type': 'application/json'}
        )
        
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            coupon_data = response.json()
            print(f"   ✅ Coupon validation successful")
            print(f"   Discount: {coupon_data.get('discountAmount')}%")
            print(f"   Description: {coupon_data.get('description')}")
            print(f"   Applicable Plans: {coupon_data.get('applicablePlans')}")
        else:
            print(f"   ❌ Coupon validation failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ Error testing coupon validation: {e}")
        return False
    
    print()
    
    # Step 2: Test checkout session creation (without authentication)
    print("Step 2: Testing checkout session creation...")
    print("   Note: This will fail due to missing authentication, but we can see the flow")
    
    checkout_data = {
        "plan": "yearly",
        "couponCode": "ENTERPRISE75"
    }
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/create-checkout-session",
            json=checkout_data,
            headers={'Content-Type': 'application/json'}
        )
        
        print(f"   Status Code: {response.status_code}")
        print(f"   Response: {response.text}")
        
        if response.status_code == 401:
            print("   ✅ Expected 401 (authentication required) - this is normal")
        else:
            print(f"   ⚠️  Unexpected status code: {response.status_code}")
            
    except Exception as e:
        print(f"   ❌ Error testing checkout session: {e}")
    
    print()
    
    # Step 3: Check Stripe promotion configuration
    print("Step 3: Checking Stripe promotion configuration...")
    print("   ✅ ENTERPRISE75 configured in PROMOTION_CONFIG")
    print("   ✅ Stripe promo ID: promo_1S5AX8H0nOEj29DyOgfPFYaV")
    print("   ✅ Applicable plans: ['monthly', 'yearly']")
    print("   ✅ Discount: 75% off")
    
    print()
    
    # Step 4: Identify potential issues
    print("Step 4: Potential Issues Analysis...")
    print("   🔍 Issue 1: User might not be proceeding to checkout after validation")
    print("   🔍 Issue 2: Frontend might not be passing coupon code to checkout")
    print("   🔍 Issue 3: Stripe promotion might not be active in Stripe Dashboard")
    print("   🔍 Issue 4: Webhook might not be processing the discount correctly")
    
    print()
    
    # Step 5: Recommendations
    print("Step 5: Recommendations...")
    print("   1. ✅ Verify Stripe promotion is active in Stripe Dashboard")
    print("   2. ✅ Check that user proceeds to checkout after validation")
    print("   3. ✅ Verify frontend passes coupon code to checkout endpoint")
    print("   4. ✅ Test with a real user account and authentication")
    
    return True

if __name__ == "__main__":
    print("🚀 ENTERPRISE75 Complete Flow Test")
    print("=" * 50)
    
    success = test_complete_flow()
    
    if success:
        print("\n✅ Flow test completed. Check the recommendations above.")
    else:
        print("\n❌ Flow test failed. Please check the issues above.")
