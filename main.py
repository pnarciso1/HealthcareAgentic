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
        # Extract financial data
        financial_data = document_data.get('financial_data', {})
        analysis_results = document_data.get('analysis_results', {})
        extracted_text = document_data.get('extracted_text', '')
        
        # Parse analysis results if it's a string
        if isinstance(analysis_results, str):
            try:
                analysis_results = json.loads(analysis_results)
            except:
                analysis_results = {}
        
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
        
        # 2. Check for duplicate charges
        if extracted_text:
            # Look for repeated line items
            lines = extracted_text.split('\n')
            line_items = {}
            for line in lines:
                if any(keyword in line.lower() for keyword in ['procedure', 'service', 'code', 'cpt', 'hcpcs']):
                    # Extract potential duplicate items
                    if line in line_items:
                        line_items[line] += 1
                    else:
                        line_items[line] = 1
            
            duplicates = {item: count for item, count in line_items.items() if count > 1}
            if duplicates:
                errors.append({
                    'type': 'duplicate_charges',
                    'confidence': 'high',
                    'description': f'Found {len(duplicates)} potential duplicate charges',
                    'evidence': f'Duplicate items: {list(duplicates.keys())}'
                })
        
        # 3. Check for coding errors
        if analysis_results.get('red_flags'):
            red_flags = analysis_results['red_flags']
            coding_errors = [flag for flag in red_flags if 'code' in flag.lower() or 'cpt' in flag.lower()]
            if coding_errors:
                errors.append({
                    'type': 'coding_errors',
                    'confidence': 'high',
                    'description': f'Found {len(coding_errors)} potential coding errors',
                    'evidence': f'Coding issues: {coding_errors}'
                })
        
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
        
        # 5. Check for network status issues
        if analysis_results.get('red_flags'):
            network_flags = [flag for flag in analysis_results['red_flags'] if 'network' in flag.lower()]
            if network_flags:
                errors.append({
                    'type': 'network_status',
                    'confidence': 'medium',
                    'description': f'Potential network status issues detected',
                    'evidence': f'Network flags: {network_flags}'
                })
        
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
        
    except Exception as e:
        print(f"Error in detect_billing_errors: {e}")
    
    return errors

def generate_dispute_letter(error_type, document_data, error_details):
    """Generate a dispute letter based on error type and document data"""
    if error_type not in DISPUTE_TEMPLATES:
        return None
    
    template = DISPUTE_TEMPLATES[error_type]['template']
    
    # Extract data for template variables
    financial_data = document_data.get('financial_data', {})
    original_filename = document_data.get('original_filename', 'Unknown Document')
    
    # Prepare template variables
    variables = {
        'provider_name': 'Healthcare Provider',  # Would need to extract from document
        'bill_date': 'Recent Date',  # Would need to extract from document
        'service_description': original_filename,
        'disputed_amount': financial_data.get('total_charged', 'Unknown'),
        'original_amount': financial_data.get('total_charged', 'Unknown'),
        'expected_rate': 'Market Rate',  # Would need research
        'evidence_summary': error_details.get('evidence', 'Document analysis'),
        'patient_name': 'Patient',  # Would need user info
        'contact_info': 'Contact information',  # Would need user info
        'duplicate_items': error_details.get('evidence', 'Duplicate charges found'),
        'duplicate_amount': 'Amount to be determined',
        'incorrect_codes': error_details.get('evidence', 'Incorrect codes found'),
        'correct_codes': 'Correct codes to be determined',
        'billed_amount': financial_data.get('total_charged', 'Unknown'),
        'insurance_paid': financial_data.get('insurance_paid', 'Unknown'),
        'patient_responsibility': financial_data.get('patient_owed', 'Unknown'),
        'expected_responsibility': 'To be calculated',
        'balance_billed_amount': financial_data.get('patient_owed', 'Unknown'),
        'insurance_allowed': financial_data.get('insurance_paid', 'Unknown')
    }
    
    # Replace variables in template
    letter = template
    for key, value in variables.items():
        letter = letter.replace(f'{{{key}}}', str(value))
    
    return letter

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
    print(f"Plan requested: {plan}")
    
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

        print("Creating Stripe checkout session...")
        checkout_session = stripe.checkout.Session.create(
            customer=stripe_customer_id,
            line_items=[{'price': price_id, 'quantity': 1}],
            mode='subscription',
            success_url=YOUR_DOMAIN + '?payment=success',
            cancel_url=YOUR_DOMAIN + '?payment=cancelled',
            metadata={'firebase_uid': uid}
        )
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
        print(f"Processing checkout.session.completed for user: {firebase_uid}")
        
        if firebase_uid:
            try:
                user_ref = db.collection('users').document(firebase_uid)
                user_ref.update({
                    'subscriptionTier': 'complete_care',
                    'stripeSubscriptionId': session.get('subscription')
                })
                print(f"Successfully updated subscription for user {firebase_uid}")
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
        
        # Analyze document for billing errors
        detected_errors = detect_billing_errors(document_data)
        
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

            blob.upload_from_file(file.stream, content_type=file.content_type)
            
            return jsonify({'message': f'File {filename} uploaded successfully. Processing has started.'}), 200
        except Exception as e:
            print(f"--- ERROR during file upload: {e}")
            return jsonify({'error': 'An error occurred during the upload process.'}), 500
    else:
        return jsonify({'error': 'Invalid file type.'}), 400

if __name__ == '__main__':
    app.run(port=5000, debug=True)       