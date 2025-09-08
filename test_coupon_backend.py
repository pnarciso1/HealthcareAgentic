#!/usr/bin/env python3
"""
Test script for backend coupon functionality.
This script tests the coupon validation and checkout session creation endpoints.
"""

import requests
import json

# Configuration
BACKEND_URL = "https://coupon-backend-974408923536.us-central1.run.app"  # Your new Cloud Run backend
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "testpassword123"

def test_coupon_validation():
    """Test the coupon validation endpoint"""
    print("=== Testing Coupon Validation ===")
    
    # Test valid coupon for yearly plan
    test_data = {
        "couponCode": "FRIENDSFOREVER",
        "plan": "yearly"
    }
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/validate-coupon",
            json=test_data,
            headers={'Content-Type': 'application/json'}
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            print("✅ Coupon validation successful")
        else:
            print("❌ Coupon validation failed")
            
    except Exception as e:
        print(f"❌ Error testing coupon validation: {e}")
    
    print()

def test_invalid_coupon():
    """Test invalid coupon code"""
    print("=== Testing Invalid Coupon ===")
    
    test_data = {
        "couponCode": "INVALIDCODE",
        "plan": "yearly"
    }
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/validate-coupon",
            json=test_data,
            headers={'Content-Type': 'application/json'}
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 400:
            print("✅ Invalid coupon correctly rejected")
        else:
            print("❌ Invalid coupon should have been rejected")
            
    except Exception as e:
        print(f"❌ Error testing invalid coupon: {e}")
    
    print()

def test_coupon_wrong_plan():
    """Test coupon code with wrong plan"""
    print("=== Testing Coupon with Wrong Plan ===")
    
    test_data = {
        "couponCode": "FRIENDSFOREVER",  # Only valid for yearly
        "plan": "monthly"  # Wrong plan
    }
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/validate-coupon",
            json=test_data,
            headers={'Content-Type': 'application/json'}
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 400:
            print("✅ Coupon correctly rejected for wrong plan")
        else:
            print("❌ Coupon should have been rejected for wrong plan")
            
    except Exception as e:
        print(f"❌ Error testing coupon with wrong plan: {e}")
    
    print()

def test_backend_health():
    """Test if backend is running"""
    print("=== Testing Backend Health ===")
    
    try:
        response = requests.get(f"{BACKEND_URL}/")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ Backend is running")
        else:
            print("❌ Backend is not responding correctly")
            
    except Exception as e:
        print(f"❌ Backend connection failed: {e}")
    
    print()

if __name__ == "__main__":
    print("🚀 Starting Backend Coupon Functionality Tests")
    print("=" * 50)
    
    # Test backend health first
    test_backend_health()
    
    # Test coupon functionality
    test_coupon_validation()
    test_invalid_coupon()
    test_coupon_wrong_plan()
    
    print("=" * 50)
    print("🏁 Backend coupon tests completed!")
    print("\nNote: These tests don't require authentication.")
    print("For full checkout testing, you'll need to implement the frontend changes.")
