# --- STRIPE COUPON CONFIGURATION ---
# Define coupon codes and their properties - these will be created as Stripe coupons
COUPON_CONFIGS = {
    'FREEMEMBERSHIP': {
        'name': 'Free Yearly Membership',
        'percent_off': 100,  # 100% off
        'duration': 'once',  # One-time use
        'max_redemptions': 100,  # Maximum uses
        'applicable_plans': ['yearly'],  # Only valid for yearly plan
        'description': 'Get your yearly membership for free!'
    },
    'SAVE50': {
        'name': '50% Off Any Plan',
        'percent_off': 50,  # 50% off
        'duration': 'once',  # One-time use
        'max_redemptions': 200,  # Maximum uses
        'applicable_plans': ['monthly', 'yearly'],  # Valid for both plans
        'description': 'Save 50% on any plan!'
    }
}

# --- COUPON VALIDATION FUNCTIONS ---
def get_or_create_stripe_coupon(coupon_code):
    """
    Get an existing Stripe coupon or create a new one based on configuration.
    
    Args:
        coupon_code (str): The coupon code to get or create
    
    Returns:
        stripe.Coupon: The Stripe coupon object, or None if failed
    """
    if coupon_code not in COUPON_CONFIGS:
        return None
    
    coupon_config = COUPON_CONFIGS[coupon_code]
    
    try:
        # Try to retrieve existing coupon
        existing_coupons = stripe.Coupon.list(limit=100)
        stripe_coupon = None
        
        # Look for existing coupon with matching name
        for coupon in existing_coupons.data:
            if coupon.name == coupon_config['name']:
                stripe_coupon = coupon
                break
        
        if not stripe_coupon:
            # Create new Stripe coupon
            print(f"Creating new Stripe coupon for {coupon_code}")
            stripe_coupon = stripe.Coupon.create(
                name=coupon_config['name'],
                percent_off=coupon_config['percent_off'],
                duration=coupon_config['duration'],
                max_redemptions=coupon_config['max_redemptions']
            )
            print(f"Created Stripe coupon: {stripe_coupon.id}")
        
        return stripe_coupon
        
    except Exception as e:
        print(f"Error getting/creating Stripe coupon for {coupon_code}: {e}")
        return None

def validate_coupon_code(coupon_code, plan):
    """
    Validate a coupon code using Stripe's coupon system.
    
    Args:
        coupon_code (str): The coupon code to validate
        plan (str): The plan being purchased ('monthly' or 'yearly')
    
    Returns:
        dict: Coupon information if valid, None if invalid
    """
    if not coupon_code:
        return None
    
    coupon_code = coupon_code.upper().strip()
    
    # Check if coupon exists in our configuration
    if coupon_code not in COUPON_CONFIGS:
        return None
    
    coupon_config = COUPON_CONFIGS[coupon_code]
    
    # Check if plan is applicable
    if 'applicable_plans' in coupon_config and plan not in coupon_config['applicable_plans']:
        return None
    
    # Get or create Stripe coupon
    stripe_coupon = get_or_create_stripe_coupon(coupon_code)
    if not stripe_coupon:
        return None
    
    # Check if Stripe coupon is valid
    if not stripe_coupon.valid:
        print(f"Stripe coupon {coupon_code} is not valid")
        return None
    
    # Check usage limits
    if stripe_coupon.max_redemptions and stripe_coupon.times_redeemed >= stripe_coupon.max_redemptions:
        print(f"Coupon {coupon_code} has reached maximum redemptions")
        return None
    
    return {
        'code': coupon_code,
        'stripe_coupon_id': stripe_coupon.id,
        'description': coupon_config['description'],
        'applicable_plans': coupon_config['applicable_plans'],
        'percent_off': coupon_config['percent_off'],
        'stripe_coupon': stripe_coupon
    }

def get_coupon_usage_count(coupon_code):
    """
    Get the current usage count for a coupon code from Stripe.
    
    Args:
        coupon_code (str): The coupon code to check
    
    Returns:
        int: Current usage count
    """
    try:
        stripe_coupon = get_or_create_stripe_coupon(coupon_code)
        if stripe_coupon:
            return stripe_coupon.times_redeemed or 0
        return 0
    except Exception as e:
        print(f"Error getting coupon usage count: {e}")
        return 0

def increment_coupon_usage(coupon_code):
    """
    Note: With Stripe coupons, usage is automatically tracked.
    This function is kept for compatibility but doesn't need to do anything.
    
    Args:
        coupon_code (str): The coupon code to increment
    """
    print(f"Coupon {coupon_code} usage tracked automatically by Stripe")
