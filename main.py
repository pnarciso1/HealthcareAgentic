import os
import json
import stripe
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename

from google.cloud import firestore
from google.cloud.firestore import SERVER_TIMESTAMP
from google.cloud import storage
from google.oauth2 import id_token
from google.auth.transport import requests
import vertexai
from vertexai.generative_models import GenerativeModel

# --- INITIALIZATION ---
load_dotenv()
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": [
    "https://healthcareagentic.web.app",
    "https://mycareclaim.com",
    "https://www.mycareclaim.com",
    "https://healthcareagentic--agent2-ui-improvements-4maxho39.web.app",
    "http://localhost:8000",
    "http://127.0.0.1:8000"
]}})

db = firestore.Client(project=os.getenv('GCP_PROJECT_ID'))
storage_client = storage.Client(project=os.getenv('GCP_PROJECT_ID'))
UPLOAD_BUCKET_NAME = os.getenv('GCS_UPLOAD_BUCKET', 'healthcare_agentic_raw_phi_uploads')
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
YOUR_DOMAIN = os.getenv('FRONTEND_DOMAIN', 'http://localhost:8000')  # Use environment variable with fallback

vertexai.init(project=os.getenv('GCP_PROJECT_ID'), location="us-central1")

# --- IMPORTANT: Add your Stripe Price IDs from your .env file ---
PRICE_IDS = {
    'monthly': os.getenv('STRIPE_MONTHLY_PRICE_ID'),
    'yearly': os.getenv('STRIPE_YEARLY_PRICE_ID')
}

# --- STRIPE PROMOTION CONFIGURATION ---
# Define the FRIENDSFOREVER promotion code
PROMOTION_CONFIG = {
    'FRIENDSFOREVER': {
        'name': 'Friends Forever - 100% Off',
        'stripe_promo_id': 'promo_1S09wVH0nOEj29DyKss41Ysu',  # Full Stripe promo code from dashboard
        'percent_off': 100,  # 100% off
        'applicable_plans': ['yearly'],  # Only valid for yearly plan
        'description': 'Get your yearly membership for free forever!'
    }
}

# --- PROMOTION VALIDATION FUNCTIONS ---
def get_stripe_promotion(coupon_code):
    """
    Get the Stripe promotion using the promo code.
    
    Args:
        coupon_code (str): The coupon code to get
    
    Returns:
        stripe.PromotionCode: The Stripe promotion object, or None if failed
    """
    if coupon_code not in PROMOTION_CONFIG:
        return None
    
    promo_config = PROMOTION_CONFIG[coupon_code]
    promo_id = promo_config['stripe_promo_id']
    
    try:
        # Retrieve the promotion code from Stripe
        promotion = stripe.PromotionCode.retrieve(promo_id)
        print(f"Retrieved Stripe promotion: {promotion.id}")
        return promotion
        
    except Exception as e:
        print(f"Error retrieving Stripe promotion for {coupon_code}: {e}")
        return None

def validate_coupon_code(coupon_code, plan):
    """
    Validate a coupon code using Stripe's promotion system.
    
    Args:
        coupon_code (str): The coupon code to validate
        plan (str): The plan being purchased ('monthly' or 'yearly')
    
    Returns:
        dict: Coupon information if valid, None if invalid
    """
    print(f"=== VALIDATE_COUPON_CODE DEBUG ===")
    print(f"Input: coupon_code='{coupon_code}', plan='{plan}'")
    
    if not coupon_code:
        print("❌ No coupon code provided")
        return None
    
    coupon_code = coupon_code.upper().strip()
    print(f"Normalized coupon code: '{coupon_code}'")
    
    # Check if coupon exists in our configuration
    if coupon_code not in PROMOTION_CONFIG:
        print(f"❌ Coupon '{coupon_code}' not found in PROMOTION_CONFIG")
        print(f"Available coupons: {list(PROMOTION_CONFIG.keys())}")
        return None
    
    promo_config = PROMOTION_CONFIG[coupon_code]
    print(f"✅ Found coupon config: {promo_config}")
    
    # Check if plan is applicable
    if 'applicable_plans' in promo_config and plan not in promo_config['applicable_plans']:
        print(f"❌ Plan '{plan}' not applicable for coupon '{coupon_code}'")
        print(f"Applicable plans: {promo_config['applicable_plans']}")
        return None
    
    print(f"✅ Plan '{plan}' is applicable for coupon '{coupon_code}'")
    
    # Get Stripe promotion
    print(f"🔍 Retrieving Stripe promotion for '{coupon_code}'...")
    promotion = get_stripe_promotion(coupon_code)
    if not promotion:
        print(f"❌ Failed to retrieve Stripe promotion for '{coupon_code}'")
        return None
    
    print(f"✅ Retrieved Stripe promotion: {promotion.id}")
    print(f"Promotion active: {promotion.active}")
    print(f"Promotion max redemptions: {promotion.max_redemptions}")
    print(f"Promotion times redeemed: {promotion.times_redeemed}")
    
    # Check if promotion is active
    if not promotion.active:
        print(f"❌ Stripe promotion {coupon_code} is not active")
        return None
    
    # Check usage limits
    if promotion.max_redemptions and promotion.times_redeemed >= promotion.max_redemptions:
        print(f"❌ Promotion {coupon_code} has reached maximum redemptions")
        return None
    
    print(f"✅ Coupon '{coupon_code}' is valid for plan '{plan}'")
    print("=== VALIDATE_COUPON_CODE DEBUG END ===")
    
    return {
        'code': coupon_code,
        'stripe_promo_id': promotion.id,
        'description': promo_config['description'],
        'applicable_plans': promo_config['applicable_plans'],
        'percent_off': promo_config['percent_off'],
        'stripe_promotion': promotion
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
        promotion = get_stripe_promotion(coupon_code)
        if promotion:
            return promotion.times_redeemed or 0
        return 0
    except Exception as e:
        print(f"Error getting coupon usage count: {e}")
        return 0

def increment_coupon_usage(coupon_code):
    """
    Note: With Stripe promotions, usage is automatically tracked.
    This function is kept for compatibility but doesn't need to do anything.
    
    Args:
        coupon_code (str): The coupon code to increment
    """
    print(f"Coupon {coupon_code} usage tracked automatically by Stripe")

# --- AUTHENTICATION HELPER ---
def verify_firebase_token(token):
    try:
        project_id = os.getenv('GCP_PROJECT_ID')
        decoded_token = id_token.verify_firebase_token(token, requests.Request(), audience=project_id)
        return decoded_token
    except ValueError as e:
        print(f"--- TOKEN VERIFICATION FAILED: {e}")
        return None

# --- DISPUTE ENGINE CONSTANTS ---
DISPUTE_TEMPLATES = {
    'overcharging': {
        'title': 'Dispute for Overcharging',
        'template': '''
Dear {provider_name},

I am writing to dispute charges on my medical bill dated {bill_date} for {service_description}. After careful review, I believe the charges exceed reasonable and customary rates for this service.

**Disputed Amount**: ${disputed_amount}
**Original Charge**: ${original_amount}
**Expected Rate**: ${expected_rate}

**Evidence**: {evidence_summary}

I request that you review these charges and adjust them to reflect reasonable and customary rates. Please provide a detailed explanation if you believe the charges are correct.

I expect a response within 30 days. If this matter is not resolved satisfactorily, I will escalate it to the appropriate regulatory authorities.

Sincerely,
{patient_name}
{contact_info}

**IMPORTANT**: Please replace [YOUR NAME] and [YOUR CONTACT INFORMATION] with your actual details before sending this letter.
        '''
    },
    'duplicate_charges': {
        'title': 'Dispute for Duplicate Charges',
        'template': '''
Dear {provider_name},

I am writing to dispute duplicate charges on my medical bill dated {bill_date}. I have identified the following duplicate charges:

**Duplicate Items**:
{duplicate_items}

**Total Duplicate Amount**: ${duplicate_amount}

**Evidence**: {evidence_summary}

I request that you remove these duplicate charges from my account. Please provide an updated bill reflecting the corrected charges.

I expect a response within 30 days.

Sincerely,
{patient_name}
{contact_info}

**IMPORTANT**: Please replace [YOUR NAME] and [YOUR CONTACT INFORMATION] with your actual details before sending this letter.
        '''
    },
    'coding_errors': {
        'title': 'Dispute for Incorrect Procedure Codes',
        'template': '''
Dear {provider_name},

I am writing to dispute incorrect procedure codes on my medical bill dated {bill_date}. The following codes appear to be incorrect:

**Incorrect Codes**:
{incorrect_codes}

**Correct Codes Should Be**:
{correct_codes}

**Evidence**: {evidence_summary}

I request that you review and correct these procedure codes and adjust my bill accordingly.

I expect a response within 30 days.

Sincerely,
{patient_name}
{contact_info}
        '''
    },
    'insurance_calculation': {
        'title': 'Dispute for Insurance Calculation Error',
        'template': '''
Dear {provider_name},

I am writing to dispute an insurance calculation error on my medical bill dated {bill_date}. The patient responsibility amount appears to be incorrect.

**Billed Amount**: ${billed_amount}
**Insurance Paid**: ${insurance_paid}
**Patient Responsibility**: ${patient_responsibility}
**Expected Patient Responsibility**: ${expected_responsibility}

**Evidence**: {evidence_summary}

I request that you review the insurance calculation and correct any errors. Please provide a detailed breakdown of how the patient responsibility was calculated.

I expect a response within 30 days.

Sincerely,
{patient_name}
{contact_info}
        '''
    },
    'network_status': {
        'title': 'Dispute for Incorrect Network Status',
        'template': '''
Dear {provider_name},

I am writing to dispute incorrect network status billing on my medical bill dated {bill_date}. I believe this service should have been billed as in-network rather than out-of-network.

**Service**: {service_description}
**Billed as**: Out-of-network
**Should be**: In-network

**Evidence**: {evidence_summary}

I request that you review the network status and adjust the billing to reflect the correct network classification.

I expect a response within 30 days.

Sincerely,
{patient_name}
{contact_info}
        '''
    },
    'balance_billing': {
        'title': 'Dispute for Balance Billing Violation',
        'template': '''
Dear {provider_name},

I am writing to dispute balance billing charges on my medical bill dated {bill_date}. I believe these charges violate balance billing protections.

**Service**: {service_description}
**Balance Billed Amount**: ${balance_billed_amount}
**Insurance Allowed Amount**: ${insurance_allowed}

**Evidence**: {evidence_summary}

I request that you remove these balance billing charges as they appear to violate applicable balance billing protections.

I expect a response within 30 days.

Sincerely,
{patient_name}
{contact_info}
        '''
    }
}

# --- DISPUTE ENGINE FUNCTIONS ---
def detect_billing_errors(document_data):
    """Analyze document for potential billing errors"""
    errors = []
    
    try:
        print(f"=== DEBUG: detect_billing_errors called ===")
        
        # Extract financial data - this is where red flags are actually stored
        financial_data = document_data.get('financial_data', {})
        analysis_results = document_data.get('analysis_results', {})
        extracted_text = document_data.get('extracted_text', '')
        
        print(f"Financial data keys: {list(financial_data.keys()) if isinstance(financial_data, dict) else 'Not a dict'}")
        print(f"Analysis results type: {type(analysis_results)}")
        
        # Parse analysis results if it's a string
        if isinstance(analysis_results, str):
            try:
                analysis_results = json.loads(analysis_results)
                print(f"Parsed analysis_results keys: {list(analysis_results.keys()) if isinstance(analysis_results, dict) else 'Not a dict'}")
            except:
                analysis_results = {}
                print("Failed to parse analysis_results JSON")
        
        # 1. Check for overcharging
        if financial_data.get('total_charged'):
            total_charged = float(financial_data['total_charged'])
            # Simple heuristic: flag if charges seem unusually high
            if total_charged > 5000:  # Threshold for flagging
                errors.append({
                    'type': 'overcharging',
                    'confidence': 'medium',
                    'description': f'Total charges of ${total_charged:.2f} seem unusually high',
                    'amount': total_charged,
                    'evidence': f'Total charged amount: ${total_charged:.2f}'
                })
                print(f"Added overcharging error: ${total_charged:.2f}")
        
        # 2. Check for duplicate charges - FIXED: Look in financial_data.red_flags
        if financial_data.get('red_flags'):
            red_flags = financial_data['red_flags']
            print(f"Found red_flags in financial_data: {red_flags}")
            
            # Check for duplicate-related red flags
            duplicate_flags = [flag for flag in red_flags if 'duplicate' in flag.lower()]
            if duplicate_flags:
                errors.append({
                    'type': 'duplicate_charges',
                    'confidence': 'high',
                    'description': f'Duplicate charges detected: {", ".join(duplicate_flags)}',
                    'evidence': f'Red flags detected: {", ".join(duplicate_flags)}'
                })
                print(f"Added duplicate charges error: {duplicate_flags}")
        else:
            print("No red_flags found in financial_data")
        
        # 3. Check for coding errors - FIXED: Look in financial_data.red_flags
        if financial_data.get('red_flags'):
            red_flags = financial_data['red_flags']
            coding_errors = [flag for flag in red_flags if 'code' in flag.lower() or 'cpt' in flag.lower()]
            if coding_errors:
                errors.append({
                    'type': 'coding_errors',
                    'confidence': 'high',
                    'description': f'Found {len(coding_errors)} potential coding errors',
                    'evidence': f'Coding issues: {coding_errors}'
                })
                print(f"Added coding errors: {coding_errors}")
        
        # 4. Check for insurance calculation errors
        if financial_data.get('patient_owed') and financial_data.get('total_charged'):
            patient_owed = float(financial_data['patient_owed'])
            total_charged = float(financial_data['total_charged'])
            insurance_paid = float(financial_data.get('insurance_paid', 0))
            
            # Check if patient responsibility seems incorrect
            calculated_responsibility = total_charged - insurance_paid
            if abs(calculated_responsibility - patient_owed) > 10:  # Allow $10 tolerance
                errors.append({
                    'type': 'insurance_calculation',
                    'confidence': 'high',
                    'description': f'Insurance calculation appears incorrect. Expected: ${calculated_responsibility:.2f}, Billed: ${patient_owed:.2f}',
                    'evidence': f'Total: ${total_charged:.2f}, Insurance paid: ${insurance_paid:.2f}, Patient owed: ${patient_owed:.2f}'
                })
                print(f"Added insurance calculation error")
        
        # 5. Check for network status issues - FIXED: Look in financial_data.red_flags
        if financial_data.get('red_flags'):
            red_flags = financial_data['red_flags']
            network_flags = [flag for flag in red_flags if 'network' in flag.lower()]
            if network_flags:
                errors.append({
                    'type': 'network_status',
                    'confidence': 'medium',
                    'description': f'Potential network status issues detected',
                    'evidence': f'Network flags: {network_flags}'
                })
                print(f"Added network status error: {network_flags}")
        
        # 6. Check for balance billing violations
        if financial_data.get('patient_owed') and financial_data.get('insurance_paid'):
            patient_owed = float(financial_data['patient_owed'])
            insurance_paid = float(financial_data['insurance_paid'])
            total_charged = float(financial_data.get('total_charged', 0))
            
            # If patient owes more than what insurance didn't pay, potential balance billing
            if patient_owed > (total_charged - insurance_paid):
                errors.append({
                    'type': 'balance_billing',
                    'confidence': 'medium',
                    'description': f'Potential balance billing violation. Patient owes ${patient_owed:.2f}',
                    'evidence': f'Total: ${total_charged:.2f}, Insurance paid: ${insurance_paid:.2f}, Patient owes: ${patient_owed:.2f}'
                })
                print(f"Added balance billing error")
        
        # 7. Additional checks for other red flags from financial_data
        if financial_data.get('red_flags'):
            red_flags = financial_data['red_flags']
            # Check for any other red flags that weren't caught above
            processed_flags = set()
            for error in errors:
                if 'evidence' in error and 'Red flags detected:' in error['evidence']:
                    # Extract flags from evidence to track what we've processed
                    evidence = error['evidence']
                    if 'Red flags detected:' in evidence:
                        flags_part = evidence.split('Red flags detected:')[1].strip()
                        processed_flags.update([f.strip() for f in flags_part.split(',')])
            
            # Add any unprocessed red flags as general billing errors
            unprocessed_flags = [flag for flag in red_flags if flag.lower() not in processed_flags]
            if unprocessed_flags:
                errors.append({
                    'type': 'billing_error',
                    'confidence': 'medium',
                    'description': f'Additional billing issues detected: {", ".join(unprocessed_flags)}',
                    'evidence': f'Red flags: {", ".join(unprocessed_flags)}'
                })
                print(f"Added unprocessed red flags error: {unprocessed_flags}")
        
        print(f"=== DEBUG: Total errors found: {len(errors)} ===")
        
    except Exception as e:
        print(f"Error in detect_billing_errors: {e}")
        import traceback
        print(f"Error traceback: {traceback.format_exc()}")
    
    return errors

def generate_dispute_letter(error_type, document_data, error_details):
    """Generate a dispute letter based on error type and document data"""
    print(f"=== DEBUG: generate_dispute_letter called ===")
    print(f"Error type: {error_type}")
    print(f"Document data keys: {list(document_data.keys()) if isinstance(document_data, dict) else 'Not a dict'}")
    
    if error_type not in DISPUTE_TEMPLATES:
        print(f"❌ Error type {error_type} not found in templates")
        return None
    
    template = DISPUTE_TEMPLATES[error_type]['template']
    print(f"✅ Template found for {error_type}")
    
    # Extract data for template variables
    financial_data = document_data.get('financial_data', {})
    original_filename = document_data.get('original_filename', 'Unknown Document')
    extracted_text = document_data.get('extracted_text', '')
    analysis_results = document_data.get('analysis_results', '')
    
    print(f"Financial data: {financial_data}")
    print(f"Original filename: {original_filename}")
    print(f"Extracted text length: {len(extracted_text) if extracted_text else 0}")
    
    # Calculate more accurate values
    total_charged = financial_data.get('total_charged', 0)
    insurance_paid = financial_data.get('insurance_paid', 0)
    patient_owed = financial_data.get('patient_owed', 0)
    
    print(f"Amounts - Total: {total_charged}, Insurance: {insurance_paid}, Patient: {patient_owed}")
    
    # Extract provider name from document - try multiple sources
    provider_name = 'Healthcare Provider'
    if financial_data.get('provider'):
        provider_name = financial_data['provider']
    elif extracted_text:
        provider_name = extract_provider_name(extracted_text, original_filename)
    
    # Extract bill date from document - try multiple sources
    bill_date = 'Recent Date'
    if financial_data.get('date_of_service'):
        bill_date = financial_data['date_of_service']
    elif extracted_text:
        bill_date = extract_bill_date(extracted_text, original_filename)
    
    # Extract service description
    service_description = 'medical services'
    if extracted_text:
        service_description = get_service_description(original_filename, extracted_text)
    
    print(f"Provider: {provider_name}, Date: {bill_date}, Service: {service_description}")
    
    # Calculate expected rates based on error type
    expected_rate = calculate_expected_rate(error_type, total_charged, financial_data)
    
    # Calculate expected patient responsibility
    expected_responsibility = calculate_expected_responsibility(total_charged, insurance_paid)
    
    # Calculate duplicate amount if applicable
    duplicate_amount = calculate_duplicate_amount(error_type, error_details, total_charged)
    
    # Prepare template variables with more accurate data
    variables = {
        'provider_name': provider_name,
        'bill_date': bill_date,
        'service_description': service_description,
        'disputed_amount': format_currency(total_charged),
        'original_amount': format_currency(total_charged),
        'expected_rate': expected_rate,
        'evidence_summary': error_details.get('evidence', 'Document analysis reveals billing discrepancies'),
        'patient_name': '[YOUR NAME]',  # User will need to fill this in
        'contact_info': '[YOUR CONTACT INFORMATION]',  # User will need to fill this in
        'duplicate_items': error_details.get('evidence', 'Duplicate charges identified in billing'),
        'duplicate_amount': format_currency(duplicate_amount),
        'incorrect_codes': error_details.get('evidence', 'Incorrect procedure codes identified'),
        'correct_codes': 'Correct codes to be determined by provider review',
        'billed_amount': format_currency(total_charged),
        'insurance_paid': format_currency(insurance_paid),
        'patient_responsibility': format_currency(patient_owed),
        'expected_responsibility': format_currency(expected_responsibility),
        'balance_billed_amount': format_currency(patient_owed),
        'insurance_allowed': format_currency(insurance_paid)
    }
    
    print(f"Template variables prepared: {variables}")
    
    # Replace variables in template
    letter = template
    for key, value in variables.items():
        letter = letter.replace(f'{{{key}}}', str(value))
    
    print(f"✅ Letter generated successfully, length: {len(letter)}")
    return letter

def extract_provider_name(extracted_text, filename):
    """Extract provider name from document text or filename"""
    # Try to extract from filename first
    if 'atrium' in filename.lower():
        return 'Atrium Health'
    elif 'novant' in filename.lower():
        return 'Novant Health'
    elif 'duke' in filename.lower():
        return 'Duke Health'
    elif 'unc' in filename.lower():
        return 'UNC Health'
    
    # Try to extract from text
    text_lower = extracted_text.lower()
    if 'atrium' in text_lower:
        return 'Atrium Health'
    elif 'novant' in text_lower:
        return 'Novant Health'
    elif 'duke' in text_lower:
        return 'Duke Health'
    elif 'unc' in text_lower:
        return 'UNC Health'
    
    return 'Healthcare Provider'

def extract_bill_date(extracted_text, filename):
    """Extract bill date from document text or filename"""
    import re
    from datetime import datetime
    
    # Try to extract date from filename first
    date_pattern = r'(\d{4})(\d{2})(\d{2})'
    match = re.search(date_pattern, filename)
    if match:
        try:
            year, month, day = match.groups()
            date_obj = datetime(int(year), int(month), int(day))
            return date_obj.strftime('%B %d, %Y')
        except:
            pass
    
    # Try to extract from text
    date_patterns = [
        r'(\d{1,2})/(\d{1,2})/(\d{4})',
        r'(\d{4})-(\d{1,2})-(\d{1,2})',
        r'(\w+)\s+(\d{1,2}),?\s+(\d{4})'
    ]
    
    for pattern in date_patterns:
        match = re.search(pattern, extracted_text)
        if match:
            try:
                if '/' in pattern:
                    month, day, year = match.groups()
                    date_obj = datetime(int(year), int(month), int(day))
                elif '-' in pattern:
                    year, month, day = match.groups()
                    date_obj = datetime(int(year), int(month), int(day))
                else:
                    month_name, day, year = match.groups()
                    date_obj = datetime.strptime(f"{month_name} {day} {year}", "%B %d %Y")
                return date_obj.strftime('%B %d, %Y')
            except:
                continue
    
    return 'Recent Date'

def calculate_expected_rate(error_type, total_charged, financial_data):
    """Calculate expected rate based on error type and charges"""
    if error_type == 'overcharging':
        # For overcharging, suggest a reasonable reduction
        # This is a simplified calculation - in practice, you'd use actual market data
        if total_charged > 10000:
            # For very high charges, suggest 40-60% reduction
            suggested_rate = total_charged * 0.5
            return f"${suggested_rate:,.2f} (suggested 50% reduction based on typical rates)"
        elif total_charged > 5000:
            # For high charges, suggest 30-40% reduction
            suggested_rate = total_charged * 0.65
            return f"${suggested_rate:,.2f} (suggested 35% reduction based on typical rates)"
        else:
            # For moderate charges, suggest 20-30% reduction
            suggested_rate = total_charged * 0.75
            return f"${suggested_rate:,.2f} (suggested 25% reduction based on typical rates)"
    
    elif error_type == 'duplicate_charges':
        # For duplicates, suggest removing the duplicate amount
        duplicate_amount = total_charged * 0.5  # Assume half is duplicate
        return f"${duplicate_amount:,.2f} (remove duplicate charges)"
    
    elif error_type == 'insurance_calculation':
        # For insurance calculation errors, suggest correct patient responsibility
        insurance_paid = financial_data.get('insurance_paid', 0)
        correct_responsibility = max(0, total_charged - insurance_paid)
        return f"${correct_responsibility:,.2f} (correct patient responsibility)"
    
    else:
        # Default calculation
        suggested_rate = total_charged * 0.8
        return f"${suggested_rate:,.2f} (suggested 20% reduction)"

def calculate_expected_responsibility(total_charged, insurance_paid):
    """Calculate expected patient responsibility"""
    # Basic calculation: patient should only pay what insurance doesn't cover
    expected = max(0, total_charged - insurance_paid)
    return expected

def calculate_duplicate_amount(error_type, error_details, total_charged):
    """Calculate duplicate amount if applicable"""
    if error_type == 'duplicate_charges':
        # Estimate duplicate amount (in practice, this would be more precise)
        return total_charged * 0.5
    return 0

def get_service_description(filename, extracted_text):
    """Get a more descriptive service description"""
    # Try to extract service type from filename or text
    text_lower = extracted_text.lower()
    filename_lower = filename.lower()
    
    if any(word in text_lower or word in filename_lower for word in ['surgery', 'surgical']):
        return 'surgical procedure'
    elif any(word in text_lower or word in filename_lower for word in ['emergency', 'er', 'urgent']):
        return 'emergency room services'
    elif any(word in text_lower or word in filename_lower for word in ['lab', 'laboratory', 'test']):
        return 'laboratory testing'
    elif any(word in text_lower or word in filename_lower for word in ['imaging', 'x-ray', 'mri', 'ct']):
        return 'imaging services'
    elif any(word in text_lower or word in filename_lower for word in ['consultation', 'visit', 'appointment']):
        return 'medical consultation'
    else:
        return 'medical services'

def format_currency(amount):
    """Format amount as currency"""
    if amount is None or amount == 0:
        return '$0.00'
    return f"${amount:,.2f}"

# --- API ENDPOINTS ---

@app.route('/')
def hello_world():
    return "Hello, your backend server is running!"

@app.route('/stripe-webhook', methods=['GET'])
def stripe_webhook_test():
    return "Stripe webhook endpoint is reachable!", 200

@app.route('/create-checkout-session', methods=['POST'])
def create_checkout_session():
    print("=== STRIPE CHECKOUT DEBUG START ===")
    print(f"Request headers: {dict(request.headers)}")
    
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        print("ERROR: Authorization header missing or invalid")
        return jsonify({'error': 'Authorization header is missing or invalid'}), 401
    
    token = auth_header.split('Bearer ')[1]
    print(f"Token received: {token[:20]}...")
    
    decoded_token = verify_firebase_token(token)
    if not decoded_token:
        print("ERROR: Token verification failed")
        return jsonify({'error': 'Invalid or expired authentication token'}), 401

    uid = decoded_token.get('user_id') or decoded_token.get('uid')
    email = decoded_token.get('email', '')
    print(f"User ID: {uid}")
    print(f"Email: {email}")
    
    data = request.get_json()
    plan = data.get('plan') # 'monthly' or 'yearly'
    coupon_code = data.get('couponCode') # Optional: coupon code
    print(f"Plan requested: {plan}")
    print(f"Coupon code: {coupon_code}")
    
    price_id = PRICE_IDS.get(plan)
    print(f"Price ID: {price_id}")
    print(f"All Price IDs: {PRICE_IDS}")
    print(f"Stripe API Key: {stripe.api_key[:10]}..." if stripe.api_key else "Stripe API Key: NOT SET")

    if not price_id:
        print("ERROR: Invalid plan specified")
        return jsonify({'error': 'Invalid plan specified'}), 400

    try:
        print("Attempting to access Firestore...")
        user_ref = db.collection('users').document(uid)
        user_doc = user_ref.get()
        print(f"Firestore access successful. Document exists: {user_doc.exists}")
        
        stripe_customer_id = None
        if user_doc.exists and 'stripeCustomerId' in user_doc.to_dict():
            existing_customer_id = user_doc.to_dict()['stripeCustomerId']
            print(f"Found existing Stripe customer: {existing_customer_id}")
            
            # Check if this is a test customer ID (starts with 'cus_')
            if existing_customer_id.startswith('cus_'):
                try:
                    # Try to retrieve the customer to see if it exists in live mode
                    customer = stripe.Customer.retrieve(existing_customer_id)
                    stripe_customer_id = existing_customer_id
                    print(f"Using existing Stripe customer: {stripe_customer_id}")
                except stripe.error.InvalidRequestError as e:
                    if "No such customer" in str(e):
                        print("Test customer ID found, clearing it and creating new live customer...")
                        user_ref.update({'stripeCustomerId': None})
                        stripe_customer_id = None
                    else:
                        raise e
            else:
                stripe_customer_id = existing_customer_id
                print(f"Using existing Stripe customer: {stripe_customer_id}")
        
        if not stripe_customer_id:
            print("Creating new Stripe customer...")
            customer = stripe.Customer.create(email=email, metadata={'firebase_uid': uid})
            stripe_customer_id = customer.id
            print(f"Created new Stripe customer: {stripe_customer_id}")
            user_ref.set({'stripeCustomerId': stripe_customer_id}, merge=True)
            print("Updated Firestore with customer ID")

        # Validate and apply coupon if provided
        discount_info = None
        if coupon_code:
            discount_info = validate_coupon_code(coupon_code, plan)
            if discount_info:
                print(f"Applying coupon: {coupon_code} - {discount_info['description']}")
                # Don't increment usage yet - wait for successful payment
            else:
                print(f"Coupon code {coupon_code} is invalid or expired.")
                return jsonify({'error': f'Invalid or expired coupon code: {coupon_code}'}), 400

        print("Creating Stripe checkout session...")
        # Create checkout session parameters
        session_params = {
            'customer': stripe_customer_id,
            'line_items': [{'price': price_id, 'quantity': 1}],
            'mode': 'subscription',
            'success_url': YOUR_DOMAIN + '?payment=success',
            'cancel_url': YOUR_DOMAIN + '?payment=cancelled',
            'payment_method_collection': 'if_required',  # Only require payment method if needed
            'metadata': {
                'firebase_uid': uid,
                'coupon_code': coupon_code if coupon_code else None
            }
        }
        
        # Apply coupon discount if valid
        if discount_info:
            # Use Stripe's built-in promotion system
            # Get the underlying coupon ID from the promotion code
            promotion = discount_info['stripe_promotion']
            coupon_id = promotion.coupon.id
            session_params['discounts'] = [{'coupon': coupon_id}]
            print(f"Stripe promotion {coupon_code} applied to checkout session with coupon ID: {coupon_id}")
        
        # Create the checkout session
        checkout_session = stripe.checkout.Session.create(**session_params)
        print(f"Checkout session created successfully: {checkout_session.id}")
        print("=== STRIPE CHECKOUT DEBUG END ===")
        return jsonify({'id': checkout_session.id})
    except Exception as e:
        print(f"ERROR in Stripe checkout: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        print(f"Full traceback: {traceback.format_exc()}")
        print("=== STRIPE CHECKOUT DEBUG END ===")
        return jsonify({'error': str(e)}), 500

@app.route('/validate-coupon', methods=['POST'])
def validate_coupon():
    """Validate a coupon code for a specific plan"""
    print("=== COUPON VALIDATION ENDPOINT CALLED ===")
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
            
        coupon_code = data.get('couponCode')
        plan = data.get('plan') # 'monthly' or 'yearly'

        if not coupon_code or not plan:
            return jsonify({'error': 'Coupon code and plan are required'}), 400

        print(f"Validating coupon: {coupon_code} for plan: {plan}")
        discount_info = validate_coupon_code(coupon_code, plan)

        if discount_info:
            print(f"Coupon {coupon_code} is valid for {plan} plan. Discount: {discount_info['description']}")
            return jsonify({
                'couponCode': coupon_code,
                'plan': plan,
                'discountType': 'percentage',
                'discountAmount': discount_info['percent_off'],
                'applicablePlans': discount_info['applicable_plans'],
                'maxUses': discount_info['stripe_promotion'].max_redemptions if hasattr(discount_info['stripe_promotion'], 'max_redemptions') else float('inf'),
                'expiresAt': discount_info['stripe_promotion'].expires_at if hasattr(discount_info['stripe_promotion'], 'expires_at') else 'N/A',
                'description': discount_info['description']
            })
        else:
            print(f"Coupon {coupon_code} is invalid or expired for {plan} plan.")
            return jsonify({'error': 'Invalid or expired coupon code'}), 400
            
    except Exception as e:
        print(f"ERROR in coupon validation: {str(e)}")
        import traceback
        print(f"Full traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Internal server error during coupon validation'}), 500

@app.route('/stripe-webhook', methods=['POST'])
def stripe_webhook():
    print("=== STRIPE WEBHOOK DEBUG START ===")
    print(f"Webhook received at: {request.url}")
    print(f"Request method: {request.method}")
    print(f"Request headers: {dict(request.headers)}")
    
    payload = request.get_data(as_text=True)
    sig_header = request.headers.get('Stripe-Signature')
    endpoint_secret = os.getenv('STRIPE_WEBHOOK_SECRET')
    
    print(f"Payload length: {len(payload)}")
    print(f"Signature header present: {sig_header is not None}")
    print(f"Endpoint secret present: {endpoint_secret is not None}")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, endpoint_secret)
        print(f"Webhook event type: {event['type']}")
    except ValueError as e:
        print(f"ERROR: Invalid payload - {e}")
        return 'Invalid payload', 400
    except stripe.error.SignatureVerificationError as e:
        print(f"ERROR: Invalid signature - {e}")
        return 'Invalid signature', 400

    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        firebase_uid = session.get('metadata', {}).get('firebase_uid')
        coupon_code = session.get('metadata', {}).get('coupon_code')
        print(f"Processing checkout.session.completed for user: {firebase_uid}")
        
        if firebase_uid:
            try:
                user_ref = db.collection('users').document(firebase_uid)
                user_ref.update({
                    'subscriptionTier': 'complete_care',
                    'stripeSubscriptionId': session.get('subscription')
                })
                print(f"Successfully updated subscription for user {firebase_uid}")

                if coupon_code:
                    increment_coupon_usage(coupon_code)
                    print(f"Coupon {coupon_code} usage incremented for user {firebase_uid}")
            except Exception as e:
                print(f"ERROR updating user subscription: {e}")
        else:
            print("WARNING: No firebase_uid found in session metadata")

    print("=== STRIPE WEBHOOK DEBUG END ===")
    return 'Success', 200

@app.route('/ask-agent1', methods=['POST'])
def ask_agent1():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Authorization header is missing or invalid'}), 401
    
    token = auth_header.split('Bearer ')[1]
    decoded_token = verify_firebase_token(token)
    if not decoded_token:
        return jsonify({'error': 'Invalid or expired authentication token'}), 401
    
    data = request.get_json()
    if not data or 'question' not in data:
        return jsonify({'error': 'Request must include a question'}), 400
    
    question = data['question']
    chat_history = data.get('history', [])
    context = ""
    
    try:
        PROJECT_ID = os.getenv('GCP_PROJECT_ID')
        LOCATION = "global"
        DATA_STORE_ID = os.getenv('DATA_STORE_ID')
        from google.cloud import discoveryengine_v1alpha as discoveryengine
        client = discoveryengine.SearchServiceClient()
        serving_config = (
            f"projects/{PROJECT_ID}/locations/{LOCATION}/"
            f"collections/default_collection/dataStores/{DATA_STORE_ID}/"
            f"servingConfigs/default_config"
        )
        search_request = discoveryengine.SearchRequest(
            serving_config=serving_config,
            query=question,
            page_size=5,
            content_search_spec={
                "snippet_spec": {"return_snippet": True},
                "summary_spec": {
                    "summary_result_count": 3,
                    "include_citations": True,
                },
            },
        )
        search_response = client.search(search_request)
        for result in search_response.results:
            for snippet in result.document.derived_struct_data.get("snippets", []):
                context += snippet.get("snippet", "") + "\n\n"
    except Exception as e:
        print(f"--- ERROR during Vertex AI Search: {e}")
        return jsonify({'error': 'Failed to retrieve information from knowledge base.'}), 500
    
    try:
        if not context:
            final_answer = "I could not find any specific information related to your question in my knowledge base. Please try rephrasing your question."
        else:
            history_string = ""
            for turn in chat_history:
                history_string += f"User: {turn['user']}\nAI: {turn['ai']}\n"
            
            prompt = f"""
            You are MyCareClaim Advocate, a helpful and conversational AI assistant. 
            Your tone should be clear, helpful, and empathetic.

            CONVERSATION HISTORY:
            {history_string}

            CONTEXT to answer the new question (use this information):
            {context}

            Based on the CONVERSATION HISTORY and the new CONTEXT, answer the new user question.
            - If the conversation history is empty, you can start with a friendly greeting like "Of course, I can help with that." For subsequent questions, get straight to the point.
            - Synthesize the information into a helpful, conversational paragraph.
            - After answering, proactively ask a follow-up question to guide the user.

            New User Question:
            {question}

            Helpful Answer:
            """
            gemini_model = GenerativeModel("gemini-2.5-pro")
            response = gemini_model.generate_content(prompt)
            final_answer = response.text
    except Exception as e:
        print(f"--- ERROR during Gemini call: {e}")
        return jsonify({'error': 'The AI failed to generate an answer.'}), 500
    
    return jsonify({'answer': final_answer})

@app.route('/api/document-qa', methods=['POST'])
def document_qa():
    """Handle document-specific Q&A with dispute detection for Agent 3 handoff"""
    print("=== DOCUMENT Q&A ENDPOINT CALLED ===")
    print(f"Request method: {request.method}")
    print(f"Request URL: {request.url}")
    print(f"Request headers: {dict(request.headers)}")
    
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            print("--- ERROR: Authorization header missing or invalid")
            return jsonify({'error': 'Authorization header is missing or invalid'}), 401

        token = auth_header.split('Bearer ')[1]
        print("--- DEBUG: Token extracted, verifying...")
        decoded_token = verify_firebase_token(token)
        if not decoded_token:
            print("--- ERROR: Invalid or expired authentication token")
            return jsonify({'error': 'Invalid or expired authentication token'}), 401

        uid = decoded_token.get('user_id') or decoded_token.get('uid')
        if not uid:
            print("--- ERROR: User ID not found in token")
            return jsonify({'error': 'User ID not found in token'}), 400

        print(f"--- DEBUG: User authenticated: {uid}")
        print(f"--- DEBUG: Request content type: {request.content_type}")
        print(f"--- DEBUG: Request data: {request.get_data()}")

        data = request.get_json()
        print(f"--- DEBUG: Request JSON data: {data}")
        document_id = data.get('documentId')
        question = data.get('question')
        
        print(f"--- DEBUG: Document ID: {document_id}")
        print(f"--- DEBUG: Question: {question}")
        
        if not document_id or not question:
            print("--- ERROR: Document ID or question missing")
            return jsonify({'error': 'Document ID and question are required'}), 400

        # 1. Retrieve document context from Firestore
        print("--- DEBUG: Retrieving document from Firestore...")
        doc_ref = db.collection('users').document(uid).collection('analyses').document(document_id)
        doc_snapshot = doc_ref.get()
        
        if not doc_snapshot.exists:
            print(f"--- ERROR: Document {document_id} not found in Firestore")
            return jsonify({'error': 'Document not found'}), 404
            
        document_data = doc_snapshot.to_dict()
        print(f"--- DEBUG: Document retrieved, type: {document_data.get('document_type', 'unknown')}")
        
        # 2. Create enhanced context for Gemini
        context = {
            'documentType': document_data.get('document_type', 'unknown'),
            'extractedText': document_data.get('extracted_text', ''),
            'analysisResults': document_data.get('analysis_results', {}),
            'userQuestion': question,
            'documentId': document_id
        }
        
        # 3. Generate Gemini prompt with dispute detection
        print("--- DEBUG: Creating Gemini prompt...")
        prompt = create_document_qa_prompt(context, question)
        
        # 4. Call Gemini 2.5 Pro
        print("--- DEBUG: Calling Gemini 2.5 Pro...")
        gemini_model = GenerativeModel("gemini-2.5-pro")
        response = gemini_model.generate_content(prompt)
        ai_answer = response.text
        print(f"--- DEBUG: Gemini response received, length: {len(ai_answer)}")
        
        # 5. Detect if user wants to dispute (for Agent 3 handoff)
        print("--- DEBUG: Detecting dispute intent...")
        dispute_intent = detect_dispute_intent(question, ai_answer)
        print(f"--- DEBUG: Dispute intent: {dispute_intent}")
        
        # 6. Store Q&A in Firestore for history
        print("--- DEBUG: Storing Q&A in Firestore...")
        qa_record = {
            'document_id': document_id,
            'question': question,
            'answer': ai_answer,
            'dispute_intent': dispute_intent,
            'timestamp': SERVER_TIMESTAMP,
            'user_id': uid
        }
        db.collection('document_qa_history').add(qa_record)
        print("--- DEBUG: Q&A stored successfully")
        
        # 7. Prepare response with dispute handoff if needed
        response_data = {
            'answer': ai_answer,
            'dispute_intent': dispute_intent,
            'document_id': document_id
        }
        
        if dispute_intent:
            response_data['agent3_handoff'] = {
                'suggested': True,
                'message': 'I can help you dispute this bill! Would you like me to transfer you to our Dispute Resolution Agent?',
                'document_context': {
                    'id': document_id,
                    'type': context['documentType'],
                    'analysis': context['analysisResults']
                }
            }
        
        print("--- DEBUG: Returning response successfully")
        return jsonify(response_data)
        
    except Exception as e:
        print(f"--- ERROR during document Q&A: {e}")
        import traceback
        print(f"--- ERROR traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Failed to process your question. Please try again.'}), 500

# --- DISPUTE SYSTEM API ENDPOINTS ---

@app.route('/api/dispute/analyze-document', methods=['POST'])
def analyze_document_for_disputes():
    """Analyze a document for potential billing errors and generate dispute recommendations"""
    print("=== DISPUTE ANALYSIS ENDPOINT CALLED ===")
    
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Authorization header is missing or invalid'}), 401

    token = auth_header.split('Bearer ')[1]
    decoded_token = verify_firebase_token(token)
    if not decoded_token:
        return jsonify({'error': 'Invalid or expired authentication token'}), 401

    uid = decoded_token.get('user_id') or decoded_token.get('uid')
    if not uid:
        return jsonify({'error': 'User ID not found in token'}), 400

    data = request.get_json()
    document_id = data.get('documentId')
    
    if not document_id:
        return jsonify({'error': 'Document ID is required'}), 400

    try:
        # Retrieve document from Firestore
        doc_ref = db.collection('users').document(uid).collection('analyses').document(document_id)
        doc_snapshot = doc_ref.get()
        
        if not doc_snapshot.exists:
            return jsonify({'error': 'Document not found'}), 404
            
        document_data = doc_snapshot.to_dict()
        
        # DEBUG: Log the document structure to understand what we're working with
        print(f"=== DEBUG: Document data structure ===")
        print(f"Document ID: {document_id}")
        print(f"Keys in document_data: {list(document_data.keys())}")
        
        if 'financial_data' in document_data:
            financial_data = document_data['financial_data']
            print(f"Financial data keys: {list(financial_data.keys())}")
            if isinstance(financial_data, dict) and 'red_flags' in financial_data:
                print(f"Red flags found: {financial_data['red_flags']}")
            else:
                print("No red_flags in financial_data")
        else:
            print("No financial_data in document")
            
        if 'analysis_results' in document_data:
            analysis_results = document_data['analysis_results']
            print(f"Analysis results type: {type(analysis_results)}")
            if isinstance(analysis_results, str):
                print(f"Analysis results (first 200 chars): {analysis_results[:200]}...")
            elif isinstance(analysis_results, dict):
                print(f"Analysis results keys: {list(analysis_results.keys())}")
        
        # Analyze document for billing errors
        detected_errors = detect_billing_errors(document_data)
        
        print(f"=== DEBUG: Detected errors ===")
        print(f"Total errors found: {len(detected_errors)}")
        for i, error in enumerate(detected_errors):
            print(f"Error {i+1}: {error}")
        
        # Generate dispute recommendations
        dispute_recommendations = []
        for error in detected_errors:
            dispute_letter = generate_dispute_letter(error['type'], document_data, error)
            if dispute_letter:
                dispute_recommendations.append({
                    'error_type': error['type'],
                    'confidence': error['confidence'],
                    'description': error['description'],
                    'evidence': error['evidence'],
                    'amount': error.get('amount', 0),
                    'dispute_letter': dispute_letter,
                    'template_title': DISPUTE_TEMPLATES[error['type']]['title']
                })
        
        print(f"=== DEBUG: Dispute recommendations ===")
        print(f"Total recommendations: {len(dispute_recommendations)}")
        
        return jsonify({
            'document_id': document_id,
            'detected_errors': detected_errors,
            'dispute_recommendations': dispute_recommendations,
            'total_errors': len(detected_errors),
            'recommended_disputes': len(dispute_recommendations)
        })
        
    except Exception as e:
        print(f"--- ERROR during dispute analysis: {e}")
        import traceback
        print(f"--- ERROR traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Failed to analyze document for disputes'}), 500

@app.route('/api/dispute/generate-letter', methods=['POST'])
def generate_dispute_letter_endpoint():
    """Generate a dispute letter for a specific error type"""
    print("=== DISPUTE LETTER GENERATION ENDPOINT CALLED ===")
    
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Authorization header is missing or invalid'}), 401

    token = auth_header.split('Bearer ')[1]
    decoded_token = verify_firebase_token(token)
    if not decoded_token:
        return jsonify({'error': 'Invalid or expired authentication token'}), 401

    uid = decoded_token.get('user_id') or decoded_token.get('uid')
    if not uid:
        return jsonify({'error': 'User ID not found in token'}), 400

    data = request.get_json()
    document_id = data.get('documentId')
    error_type = data.get('errorType')
    custom_evidence = data.get('evidence', '')
    
    if not document_id or not error_type:
        return jsonify({'error': 'Document ID and error type are required'}), 400

    try:
        # Retrieve document from Firestore
        doc_ref = db.collection('users').document(uid).collection('analyses').document(document_id)
        doc_snapshot = doc_ref.get()
        
        if not doc_snapshot.exists:
            return jsonify({'error': 'Document not found'}), 404
            
        document_data = doc_snapshot.to_dict()
        
        # Generate dispute letter
        error_details = {'evidence': custom_evidence} if custom_evidence else {}
        dispute_letter = generate_dispute_letter(error_type, document_data, error_details)
        
        if not dispute_letter:
            return jsonify({'error': 'Failed to generate dispute letter'}), 500
        
        return jsonify({
            'document_id': document_id,
            'error_type': error_type,
            'dispute_letter': dispute_letter,
            'template_title': DISPUTE_TEMPLATES.get(error_type, {}).get('title', 'Dispute Letter')
        })
        
    except Exception as e:
        print(f"--- ERROR during letter generation: {e}")
        import traceback
        print(f"--- ERROR traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Failed to generate dispute letter'}), 500

@app.route('/api/dispute/submit-dispute', methods=['POST'])
def submit_dispute():
    """Submit a dispute and store it in Firestore"""
    print("=== DISPUTE SUBMISSION ENDPOINT CALLED ===")
    
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Authorization header is missing or invalid'}), 401

    token = auth_header.split('Bearer ')[1]
    decoded_token = verify_firebase_token(token)
    if not decoded_token:
        return jsonify({'error': 'Invalid or expired authentication token'}), 401

    uid = decoded_token.get('user_id') or decoded_token.get('uid')
    if not uid:
        return jsonify({'error': 'User ID not found in token'}), 400

    data = request.get_json()
    document_id = data.get('documentId')
    error_type = data.get('errorType')
    dispute_letter = data.get('disputeLetter')
    evidence = data.get('evidence', '')
    amount_disputed = data.get('amountDisputed', 0)
    
    if not document_id or not error_type or not dispute_letter:
        return jsonify({'error': 'Document ID, error type, and dispute letter are required'}), 400

    try:
        # Store dispute in Firestore
        dispute_record = {
            'document_id': document_id,
            'error_type': error_type,
            'dispute_letter': dispute_letter,
            'evidence': evidence,
            'amount_disputed': amount_disputed,
            'status': 'draft',
            'created_at': SERVER_TIMESTAMP,
            'updated_at': SERVER_TIMESTAMP,
            'user_id': uid
        }
        
        dispute_ref = db.collection('users').document(uid).collection('disputes').add(dispute_record)
        dispute_id = dispute_ref[1].id
        
        return jsonify({
            'dispute_id': dispute_id,
            'status': 'draft',
            'message': 'Dispute created successfully'
        })
        
    except Exception as e:
        print(f"--- ERROR during dispute submission: {e}")
        import traceback
        print(f"--- ERROR traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Failed to submit dispute'}), 500

@app.route('/api/dispute/user-disputes', methods=['GET'])
def get_user_disputes():
    """Get all disputes for a user"""
    print("=== GET USER DISPUTES ENDPOINT CALLED ===")
    
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Authorization header is missing or invalid'}), 401

    token = auth_header.split('Bearer ')[1]
    decoded_token = verify_firebase_token(token)
    if not decoded_token:
        return jsonify({'error': 'Invalid or expired authentication token'}), 401

    uid = decoded_token.get('user_id') or decoded_token.get('uid')
    if not uid:
        return jsonify({'error': 'User ID not found in token'}), 400

    try:
        # Get all disputes for the user
        disputes_ref = db.collection('users').document(uid).collection('disputes')
        disputes_snapshot = disputes_ref.order_by('created_at', direction=firestore.Query.DESCENDING).get()
        
        disputes = []
        for doc in disputes_snapshot:
            dispute_data = doc.to_dict()
            dispute_data['id'] = doc.id
            disputes.append(dispute_data)
        
        return jsonify({
            'disputes': disputes,
            'total_disputes': len(disputes)
        })
        
    except Exception as e:
        print(f"--- ERROR getting user disputes: {e}")
        import traceback
        print(f"--- ERROR traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Failed to retrieve disputes'}), 500

def create_document_qa_prompt(context, question):
    """Create enhanced prompt for document-specific Q&A with dispute detection"""
    return f"""
    You are a healthcare billing expert analyzing a {context['documentType']} document.
    
    DOCUMENT CONTEXT:
    Document Type: {context['documentType']}
    Extracted Text: {context['extractedText'][:2000]}...
    
    ANALYSIS RESULTS:
    {context['analysisResults']}
    
    USER QUESTION: {question}
    
    INSTRUCTIONS:
    1. Answer the question using ONLY information from this specific document
    2. Reference specific line items, amounts, or dates when relevant
    3. Explain complex billing terms in simple language
    4. If the document doesn't contain the answer, say so clearly
    5. Provide actionable next steps when appropriate
    6. Use a helpful, professional tone
    7. If the user is expressing frustration about charges or wants to dispute, acknowledge their concern and suggest professional dispute resolution
    
    IMPORTANT: If the user is asking about disputing charges, incorrect billing, or wants to fight a bill, include this in your response:
    "I understand your concern about these charges. Our Dispute Resolution Agent can help you challenge incorrect bills and potentially save you money. Would you like me to connect you with our specialized dispute agent?"
    
    RESPONSE FORMAT:
    - Direct answer to the question
    - Specific document references (line numbers, amounts, dates)
    - Plain English explanation of any technical terms
    - Recommended next steps (if applicable)
    - Dispute resolution suggestion (if relevant)
    """

def detect_dispute_intent(question, ai_answer):
    """Detect if user wants to dispute the bill based on question and context"""
    dispute_keywords = [
        'dispute', 'wrong', 'incorrect', 'error', 'mistake', 'overcharge',
        'fight', 'challenge', 'appeal', 'deny', 'refuse to pay', 'not my bill',
        'too expensive', 'too much', 'unfair', 'unreasonable', 'disagree',
        'shouldn\'t pay', 'don\'t owe', 'billing error', 'coding error'
    ]
    
    question_lower = question.lower()
    answer_lower = ai_answer.lower()
    
    # Check for dispute keywords in question
    for keyword in dispute_keywords:
        if keyword in question_lower:
            return True
    
    # Check if AI response suggests dispute resolution
    if 'dispute' in answer_lower or 'challenge' in answer_lower:
        return True
    
    return False

@app.route('/upload-document', methods=['POST'])
def upload_document():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Authorization header is missing or invalid'}), 401

    token = auth_header.split('Bearer ')[1]
    decoded_token = verify_firebase_token(token)
    if not decoded_token:
        return jsonify({'error': 'Invalid or expired authentication token'}), 401

    uid = decoded_token.get('user_id') or decoded_token.get('uid')
    if not uid:
        return jsonify({'error': 'User ID not found in token'}), 400

    if 'document' not in request.files:
        return jsonify({'error': 'No document file part in the request'}), 400

    file = request.files['document']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file:
        try:
            filename = secure_filename(file.filename)
            bucket = storage_client.bucket(UPLOAD_BUCKET_NAME)
            blob = bucket.blob(f"user_uploads/{uid}/{filename}")

            # Upload the file to Google Cloud Storage
            blob.upload_from_file(file.stream, content_type=file.content_type)
            
            # Create a placeholder document in Firestore to track the upload
            user_ref = db.collection('users').document(uid)
            analyses_collection = user_ref.collection('analyses')
            
            # Add a placeholder document that will be updated by the Cloud Function
            placeholder_doc = analyses_collection.add({
                'original_filename': filename,
                'gcs_uri': f"gs://{UPLOAD_BUCKET_NAME}/user_uploads/{uid}/{filename}",
                'status': 'processing',
                'created_at': SERVER_TIMESTAMP,
                'upload_timestamp': SERVER_TIMESTAMP
            })
            
            print(f"--- File {filename} uploaded successfully for user {uid}. Cloud Function will process it automatically. ---")
            
            return jsonify({
                'message': f'File {filename} uploaded successfully. AI analysis has started automatically.',
                'document_id': placeholder_doc[1].id,
                'status': 'processing'
            }), 200
            
        except Exception as e:
            print(f"--- ERROR during file upload: {e}")
            return jsonify({'error': 'An error occurred during the upload process.'}), 500
    else:
        return jsonify({'error': 'Invalid file type.'}), 400

if __name__ == '__main__':
    app.run(port=5000, debug=True)       