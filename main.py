print("--- RUNNING FLASK BACKEND SERVER ---")

import os
import stripe
from dotenv import load_dotenv
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from datetime import datetime, timezone
from werkzeug.utils import secure_filename

from google.cloud import firestore
from google.cloud import storage
from google.oauth2 import id_token
from google.auth.transport import requests
from google.api_core import client_options
import vertexai
from vertexai.generative_models import GenerativeModel

# --- INITIALIZATION ---

load_dotenv()

app = Flask(__name__)
# This more explicit configuration ensures that the browser's preflight
# request for file uploads is handled correctly.
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)


db = firestore.Client(project=os.getenv('GCP_PROJECT_ID'))
storage_client = storage.Client(project=os.getenv('GCP_PROJECT_ID'))
UPLOAD_BUCKET_NAME = os.getenv('GCS_UPLOAD_BUCKET')

stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
STRIPE_PRICE_ID = os.getenv('STRIPE_PRICE_ID')
YOUR_DOMAIN = 'http://localhost:3000' 

vertexai.init(project=os.getenv('GCP_PROJECT_ID'), location="us-central1")

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

@app.route('/create-checkout-session', methods=['POST'])
def create_checkout_session():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Authorization header is missing or invalid'}), 401
    token = auth_header.split('Bearer ')[1]
    decoded_token = verify_firebase_token(token)
    if not decoded_token:
        return jsonify({'error': 'Invalid or expired authentication token'}), 401
    uid = decoded_token.get('user_id') or decoded_token.get('uid')
    email = decoded_token.get('email', '')
    if not uid:
        return jsonify({'error': 'User ID not found in token'}), 400
    try:
        user_ref = db.collection('users').document(uid)
        user_doc = user_ref.get()
        stripe_customer_id = None
        if user_doc.exists and 'stripeCustomerId' in user_doc.to_dict():
            stripe_customer_id = user_doc.to_dict()['stripeCustomerId']
        else:
            customer = stripe.Customer.create(email=email, name=email, metadata={'firebase_uid': uid})
            stripe_customer_id = customer.id
            user_data = {
                'email': email,
                'createdAt': firestore.SERVER_TIMESTAMP,
                'preSubscriptionDate': firestore.SERVER_TIMESTAMP,
                'preSubscriptionStatus': 'pending_commitment',
                'stripeCustomerId': stripe_customer_id
            }
            user_ref.set(user_data, merge=True)
        checkout_session = stripe.checkout.Session.create(
            customer=stripe_customer_id,
            line_items=[{'price': STRIPE_PRICE_ID, 'quantity': 1}],
            payment_method_types=['card'],
            mode='subscription',
            success_url=YOUR_DOMAIN + '/success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url=YOUR_DOMAIN + '/cancel',
            client_reference_id=uid
        )
        return jsonify({'id': checkout_session.id})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

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
            You are PeopleHealth Advocate, a helpful and conversational AI assistant. 
            Your tone should be clear, helpful, and empathetic.

            CONVERSATION HISTORY:
            {history_string}

            CONTEXT to answer the new question (use this information):
            {context}

            Based on the CONVERSATION HISTORY and the new CONTEXT, answer the new user question.
            - If the conversation history is empty, you can start with a friendly greeting like "Of course, I can help with that." For subsequent questions, get straight to the point.
            - Synthesize the information into a helpful, conversational paragraph.
            - After answering, proactively ask a follow-up question to guide the user. For example, if you mention an "external review," you could ask, "Would you like me to explain what an external review involves?" or "Is there anything else I can help you with regarding this?"

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


# --- UPDATED ENDPOINT FOR AGENT 2 DOCUMENT UPLOAD ---
@app.route('/upload-document', methods=['POST'])
def upload_document():
    # --- 1. Authenticate the user ---
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

    # --- 2. Check for the file in the request ---
    if 'document' not in request.files:
        return jsonify({'error': 'No document file part in the request'}), 400

    file = request.files['document']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    # --- 3. Upload the file to Google Cloud Storage ---
    if file and file.filename.lower().endswith('.pdf'):
        try:
            filename = secure_filename(file.filename)
            bucket = storage_client.bucket(UPLOAD_BUCKET_NAME)
            blob = bucket.blob(f"user_uploads/{uid}/{filename}")

            print(f"--- Uploading file {filename} to gs://{UPLOAD_BUCKET_NAME}/user_uploads/{uid}/{filename} ---")
            blob.upload_from_file(file.stream, content_type=file.content_type)
            print("--- File upload successful ---")

            return jsonify({'message': f'File {filename} uploaded successfully. Processing has started.'}), 200

        except Exception as e:
            print(f"--- ERROR during file upload: {e}")
            return jsonify({'error': 'An error occurred during the upload process.'}), 500
    else:
        return jsonify({'error': 'Invalid file type. Only PDF files are allowed.'}), 400       