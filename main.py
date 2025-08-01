import os
import stripe
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename

from google.cloud import firestore
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
UPLOAD_BUCKET_NAME = os.getenv('GCS_UPLOAD_BUCKET')
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