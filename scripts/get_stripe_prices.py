#!/usr/bin/env python3
"""
Script to get Stripe price IDs for the HealthcareAgentic platform
"""

import stripe
import os

# Set the Stripe API key
stripe.api_key = "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"

try:
    print("🔍 Fetching Stripe products and prices...")
    
    # Get all products
    products = stripe.Product.list(limit=10)
    
    print(f"\n📦 Found {len(products.data)} products:")
    
    for product in products.data:
        print(f"\n🏷️  Product: {product.name}")
        print(f"   ID: {product.id}")
        print(f"   Active: {product.active}")
        
        # Get prices for this product
        prices = stripe.Price.list(product=product.id, limit=10)
        
        if prices.data:
            print(f"   💰 Prices:")
            for price in prices.data:
                print(f"      - ID: {price.id}")
                print(f"      - Amount: ${price.unit_amount/100:.2f}")
                print(f"      - Currency: {price.currency}")
                print(f"      - Recurring: {price.recurring}")
                print(f"      - Active: {price.active}")
                print()
        else:
            print("   ❌ No prices found for this product")
    
    print("\n✅ Stripe products and prices retrieved successfully!")
    
except Exception as e:
    print(f"❌ Error fetching Stripe data: {e}")
    print("Please check your Stripe API key and try again.")
