import os
import time
from google.cloud import firestore
from google.cloud.firestore_v1.transaction import transactional
from google.cloud import documentai_v1beta3 as documentai
from google.cloud import storage
import vertexai
from vertexai.generative_models import GenerativeModel
import traceback

def process_medical_bill(event, context):
    # --- FINAL ATOMIC VERSION - July 24, 2025 ---
    """
    Cloud Function triggered by a file upload to a specific GCS bucket.
    This function uses a Firestore transaction to ensure it only processes each event once.
    """
    
    # --- 1. GET EVENT METADATA AND INITIALIZE FIRESTORE ---
    event_id = event['generation']
    gcp_project_id = os.environ.get('GCP_PROJECT_ID')
    if not gcp_project_id:
        raise ValueError("FATAL ERROR: GCP_PROJECT_ID environment variable is not set.")
    firestore_client = firestore.Client(project=gcp_project_id)
    
    # --- 2. IDEMPOTENCY CHECK WITH TRANSACTION ---
    # This transaction ensures that the check and write are atomic, preventing race conditions.
    @transactional
    def check_and_lock_event(transaction, doc_ref):
        snapshot = doc_ref.get(transaction=transaction)
        if snapshot.exists:
            # Return False if the event has already been locked.
            return False
        # If it doesn't exist, lock it by creating the document.
        transaction.set(doc_ref, {
            'file_name': event['name'],
            'status': 'processing',
            'timestamp': firestore.SERVER_TIMESTAMP
        })
        # Return True to signal that processing should continue.
        return True

    processed_doc_ref = firestore_client.collection('processed_events').document(event_id)
    transaction = firestore_client.transaction()
    
    # Run the transaction. If it returns False, the event is a duplicate.
    if not check_and_lock_event(transaction, processed_doc_ref):
        print(f"--- Event ID {event_id} has already been processed or is being processed. Exiting. ---")
        return

    print(f"--- Locked Event ID: {event_id}. Starting processing. ---")

    try:
        # --- 3. GET ENVIRONMENT VARIABLES ---
        docai_processor_id = os.environ.get('DOCAI_PROCESSOR_ID')
        docai_location = os.environ.get('DOCAI_LOCATION', 'us')

        if not all([docai_processor_id, docai_location]):
            raise ValueError("FATAL ERROR: Document AI environment variables are not set.")

        # --- 4. INITIALIZE OTHER CLIENTS ---
        print("--- Initializing clients... ---")
        storage_client = storage.Client(project=gcp_project_id)
        vertexai.init(project=gcp_project_id, location="us-central1")
        docai_client = documentai.DocumentProcessorServiceClient(
            client_options={"api_endpoint": f"{docai_location}-documentai.googleapis.com"}
        )
        print("--- All clients initialized successfully. ---")

        # --- 5. EXTRACT FILE INFO FROM TRIGGER EVENT ---
        bucket_name = event['bucket']
        file_name = event['name']
        parts = file_name.split('/')
        if len(parts) < 3 or parts[0] != 'user_uploads':
            print(f"--- ERROR: File {file_name} is not in the expected 'user_uploads/{{uid}}/' directory structure. ---")
            return

        uid = parts[1]
        original_filename = parts[2]
        gcs_uri = f"gs://{bucket_name}/{file_name}"
        
        print(f"--- Processing for user ID: {uid}, GCS URI: {gcs_uri} ---")

        # --- 6. PARSING THE PDF WITH DOCUMENT AI ---
        print("--- Starting Document AI processing. ---")
        
        bucket = storage_client.get_bucket(bucket_name)
        blob = bucket.get_blob(file_name)
        if not blob:
            raise FileNotFoundError(f"Could not find file {file_name} in bucket {bucket_name}.")
            
        file_content = blob.download_as_bytes()
        mime_type = blob.content_type

        resource_name = docai_client.processor_path(gcp_project_id, docai_location, docai_processor_id)
        raw_document = documentai.RawDocument(content=file_content, mime_type=mime_type)
        request = documentai.ProcessRequest(name=resource_name, raw_document=raw_document)

        result = docai_client.process_document(request=request)
        extracted_text = result.document.text
        
        print("--- Document AI processing successful. ---")

        # --- 7. ANALYZING THE CONTENT WITH GEMINI ---
        print("--- Starting analysis with Gemini. ---")
        
        model = GenerativeModel("gemini-2.5-pro")
        
        prompt = f"""
        You are an expert AI assistant specializing in U.S. medical billing.
        Your task is to analyze the text extracted from a medical document and return a structured JSON output.

        DOCUMENT TEXT:
        ---
        {extracted_text}
        ---

        Based on the document text, perform the following actions:
        1.  Extract the following key-value pairs. If a value is not found, use "Not Found".
            - "patient_name"
            - "provider_name"
            - "total_amount_due"
            - "statement_date"
            - "account_number"
        2.  Create a "concise_summary" of the services rendered in one or two sentences.
        3.  Perform an "initial_analysis". Identify any potential red flags such as duplicate charges, services that seem unusually expensive, or items that are typically not covered. If no red flags are found, state that.

        Return ONLY a valid JSON object with the keys "key_information", "concise_summary", and "initial_analysis".
        """
        
        response = model.generate_content(prompt)
        raw_response_text = response.text
        
        if '```json' in raw_response_text:
            analysis_json = raw_response_text.split('```json\n', 1)[1].split('```', 1)[0]
        else:
            analysis_json = raw_response_text.strip()
        
        print("--- Gemini analysis successful. ---")
        
        # --- 8. SAVING THE ANALYSIS TO FIRESTORE ---
        print("--- Saving analysis to Firestore. ---")
        
        user_ref = firestore_client.collection('users').document(uid)
        analyses_collection = user_ref.collection('analyses')
        
        new_analysis_doc = {
            'analysis_results': analysis_json,
            'original_filename': original_filename,
            'gcs_uri': gcs_uri,
            'status': 'completed',
            'created_at': firestore.SERVER_TIMESTAMP
        }
        
        analyses_collection.add(new_analysis_doc)
        
        # Update the event log to mark as completed
        processed_doc_ref.update({'status': 'completed'})
        
        print(f"--- Analysis saved successfully for user {uid}. Event {event_id} marked as completed. ---")
        print("--- Function execution finished successfully. ---")

    except Exception as e:
        print("--- AN UNHANDLED ERROR OCCURRED ---")
        traceback.print_exc()
        
        # Try to get event_id again for error logging
        event_id_for_error = event.get('generation', 'unknown_event')
        
        try:
            if 'firestore_client' in locals():
                # Mark the event as failed in the processed log
                error_doc_ref = firestore_client.collection('processed_events').document(event_id_for_error)
                error_doc_ref.set({
                    'status': 'failed',
                    'error_message': str(e),
                    'timestamp': firestore.SERVER_TIMESTAMP
                }, merge=True)
                print(f"--- Failure record saved to processed_events log for Event ID: {event_id_for_error} ---")

        except Exception as fe:
            print(f"--- CRITICAL: Could not save failure record to processed_events log. Error: {fe} ---")
