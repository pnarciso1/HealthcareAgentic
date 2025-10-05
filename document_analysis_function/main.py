import os
import time
import json
import re
from google.cloud import firestore
from google.cloud.firestore_v1.transaction import transactional
from google.cloud import documentai_v1beta3 as documentai
from google.cloud import storage
import vertexai
from vertexai.generative_models import GenerativeModel
import traceback

def extract_insurance_data(search_text):
    """
    Extract insurance plan data from document text.
    """
    insurance_data = {
        'deductible': None,
        'copay': None,
        'coinsurance': None,
        'out_of_pocket_max': None,
        'network_type': None,
        'coverage_details': []
    }
    
    try:
        # Extract deductible
        deductible_patterns = [
            r'deductible.*?\$?([\d,]+)',
            r'\$?([\d,]+).*?deductible',
            r'individual.*?deductible.*?\$?([\d,]+)',
            r'family.*?deductible.*?\$?([\d,]+)'
        ]
        
        for pattern in deductible_patterns:
            match = re.search(pattern, search_text, re.IGNORECASE)
            if match:
                amount = match.group(1).replace(',', '')
                insurance_data['deductible'] = float(amount)
                break
        
        # Extract copay
        copay_patterns = [
            r'copay.*?\$?([\d,]+)',
            r'\$?([\d,]+).*?copay',
            r'office.*?visit.*?copay.*?\$?([\d,]+)',
            r'primary.*?care.*?copay.*?\$?([\d,]+)'
        ]
        
        for pattern in copay_patterns:
            match = re.search(pattern, search_text, re.IGNORECASE)
            if match:
                amount = match.group(1).replace(',', '')
                insurance_data['copay'] = float(amount)
                break
        
        # Extract coinsurance
        coinsurance_patterns = [
            r'coinsurance.*?(\d+)%',
            r'(\d+)%.*?coinsurance',
            r'patient.*?responsibility.*?(\d+)%'
        ]
        
        for pattern in coinsurance_patterns:
            match = re.search(pattern, search_text, re.IGNORECASE)
            if match:
                insurance_data['coinsurance'] = int(match.group(1))
                break
        
        # Extract out-of-pocket maximum
        oop_patterns = [
            r'out.*?of.*?pocket.*?maximum.*?\$?([\d,]+)',
            r'out.*?of.*?pocket.*?max.*?\$?([\d,]+)',
            r'\$?([\d,]+).*?out.*?of.*?pocket'
        ]
        
        for pattern in oop_patterns:
            match = re.search(pattern, search_text, re.IGNORECASE)
            if match:
                amount = match.group(1).replace(',', '')
                insurance_data['out_of_pocket_max'] = float(amount)
                break
        
        # Extract network type
        if 'ppo' in search_text.lower():
            insurance_data['network_type'] = 'PPO'
        elif 'hmo' in search_text.lower():
            insurance_data['network_type'] = 'HMO'
        elif 'epo' in search_text.lower():
            insurance_data['network_type'] = 'EPO'
        elif 'pos' in search_text.lower():
            insurance_data['network_type'] = 'POS'
        
        # Extract coverage details
        coverage_keywords = [
            'preventive care', 'prescription drugs', 'emergency room',
            'urgent care', 'specialist visits', 'laboratory services',
            'imaging', 'surgery', 'hospitalization', 'mental health'
        ]
        
        for keyword in coverage_keywords:
            if keyword in search_text.lower():
                insurance_data['coverage_details'].append(keyword)
        
        return insurance_data
        
    except Exception as e:
        print(f"Error extracting insurance data: {e}")
        return insurance_data

def extract_financial_data(analysis_json, extracted_text):
    """
    Extract structured financial data from the analysis results and document text.
    Returns a dictionary with financial amounts, dates, providers, and red flags.
    """
    try:
        # Parse the analysis JSON
        analysis_data = json.loads(analysis_json)
        
        # Initialize financial data structure
        financial_data = {
            'total_charged': 0.0,
            'insurance_paid': 0.0,
            'patient_owed': 0.0,
            'red_flags': [],
            'date_of_service': None,
            'provider': None,
            'document_type': None,
            'account_number': None,
            'patient_name': None
        }
        
        # Extract basic information from analysis
        if 'key_information' in analysis_data:
            key_info = analysis_data['key_information']
            financial_data['patient_name'] = key_info.get('patient_name', 'Not Found')
            financial_data['provider'] = key_info.get('provider_name', 'Not Found')
            financial_data['account_number'] = key_info.get('account_number', 'Not Found')
            
            # Try to extract date
            statement_date = key_info.get('statement_date', 'Not Found')
            if statement_date != 'Not Found':
                financial_data['date_of_service'] = statement_date
        
        # Extract amounts using regex patterns
        amount_patterns = {
            'total_charged': [
                r'total.*?charged.*?\$?([\d,]+\.?\d*)',
                r'amount.*?due.*?\$?([\d,]+\.?\d*)',
                r'balance.*?due.*?\$?([\d,]+\.?\d*)',
                r'total.*?amount.*?\$?([\d,]+\.?\d*)'
            ],
            'insurance_paid': [
                r'insurance.*?paid.*?\$?([\d,]+\.?\d*)',
                r'plan.*?paid.*?\$?([\d,]+\.?\d*)',
                r'benefits.*?paid.*?\$?([\d,]+\.?\d*)'
            ],
            'patient_owed': [
                r'patient.*?responsibility.*?\$?([\d,]+\.?\d*)',
                r'amount.*?you.*?owe.*?\$?([\d,]+\.?\d*)',
                r'you.*?may.*?owe.*?\$?([\d,]+\.?\d*)',
                r'patient.*?owed.*?\$?([\d,]+\.?\d*)'
            ]
        }
        
        # Search for amounts in both analysis and extracted text
        search_text = f"{analysis_json} {extracted_text}".lower()
        
        for amount_type, patterns in amount_patterns.items():
            for pattern in patterns:
                match = re.search(pattern, search_text, re.IGNORECASE)
                if match:
                    amount_str = match.group(1).replace(',', '')
                    try:
                        amount = float(amount_str)
                        if amount > 0:
                            financial_data[amount_type] = amount
                            break
                    except ValueError:
                        continue
        
        # Determine document type with improved logic
        search_text_lower = search_text.lower()
        
        # Priority 1: Check for bill-specific indicators (most specific first)
        bill_indicators = [
            'amount due', 'payment required', 'pay this amount', 'total due',
            'balance due', 'outstanding balance', 'payment due', 'please pay',
            'remit payment', 'send payment', 'payment amount', 'amount owed',
            'your responsibility', 'patient responsibility', 'you owe',
            'service date', 'date of service', 'billing statement',
            'statement of account', 'account statement', 'invoice',
            'charges for services', 'services rendered', 'medical services',
            'hospital bill', 'physician bill', 'clinic bill', 'medical bill'
        ]
        
        # Priority 2: Check for EOB-specific indicators
        eob_indicators = [
            'explanation of benefits', 'eob', 'this is not a bill',
            'claim processed', 'claim number', 'claim details',
            'benefits paid', 'insurance paid', 'plan paid',
            'deductible applied', 'copay applied', 'coinsurance applied',
            'allowed amount', 'plan discount', 'provider discount',
            'member responsibility', 'what you owe', 'your share'
        ]
        
        # Priority 3: Check for insurance plan-specific indicators
        insurance_plan_indicators = [
            'summary of benefits', 'evidence of coverage', 'plan document',
            'benefit summary', 'coverage summary', 'plan summary',
            'member handbook', 'plan handbook', 'benefits handbook',
            'annual deductible', 'family deductible', 'individual deductible',
            'preventive care', 'wellness benefits', 'plan year',
            'open enrollment', 'plan effective date', 'coverage effective',
            'network providers', 'in-network', 'out-of-network',
            'prior authorization', 'referral required', 'plan limits'
        ]
        
        # Check for bill indicators first (highest priority)
        if any(indicator in search_text_lower for indicator in bill_indicators):
            financial_data['document_type'] = 'bill'
        # Check for EOB indicators second
        elif any(indicator in search_text_lower for indicator in eob_indicators):
            financial_data['document_type'] = 'eob'
        # Check for insurance plan indicators third
        elif any(indicator in search_text_lower for indicator in insurance_plan_indicators):
            financial_data['document_type'] = 'insurance_plan'
        # Fallback to simple keyword matching
        elif 'bill' in search_text_lower or 'statement' in search_text_lower:
            financial_data['document_type'] = 'bill'
        elif 'eob' in search_text_lower or 'explanation of benefits' in search_text_lower:
            financial_data['document_type'] = 'eob'
        elif 'insurance' in search_text_lower or 'policy' in search_text_lower:
            financial_data['document_type'] = 'insurance_plan'
        else:
            financial_data['document_type'] = 'unknown'
        
        # Extract red flags from analysis
        if 'initial_analysis' in analysis_data:
            analysis_text = analysis_data['initial_analysis'].lower()
            
            # Define red flag keywords
            red_flag_keywords = [
                'duplicate', 'duplicate charge', 'duplicate billing',
                'remark code', 'remark_code', 'b8', 'b9',
                'unbundling', 'improper', 'error', 'incorrect',
                'overcharge', 'overcharged', 'excessive',
                'not medically necessary', 'experimental',
                'out of network', 'out-of-network'
            ]
            
            for keyword in red_flag_keywords:
                if keyword in analysis_text:
                    financial_data['red_flags'].append(keyword)
        
        # Calculate patient owed if not found but we have other amounts
        if financial_data['patient_owed'] == 0.0 and financial_data['total_charged'] > 0:
            if financial_data['insurance_paid'] > 0:
                financial_data['patient_owed'] = financial_data['total_charged'] - financial_data['insurance_paid']
        
        # Extract insurance plan data if this is an insurance document
        if financial_data['document_type'] == 'insurance_plan':
            financial_data['insurance_data'] = extract_insurance_data(search_text)
        
        return financial_data
        
    except Exception as e:
        print(f"Error extracting financial data: {e}")
        # Return default structure if extraction fails
        return {
            'total_charged': 0.0,
            'insurance_paid': 0.0,
            'patient_owed': 0.0,
            'red_flags': [],
            'date_of_service': None,
            'provider': None,
            'document_type': None,
            'account_number': None,
            'patient_name': None,
            'insurance_data': {
                'deductible': None,
                'copay': None,
                'coinsurance': None,
                'out_of_pocket_max': None,
                'network_type': None,
                'coverage_details': []
            }
        }

def generate_insurance_plan_analysis(extracted_text, financial_data):
    """
    Generate specialized analysis for Insurance Plan documents with benefits summary,
    optimization tips, and out-of-network prevention guidance.
    """
    try:
        model = GenerativeModel("gemini-2.5-pro")
        
        prompt = f"""
        You are an expert insurance benefits advisor. Analyze this insurance plan document and provide a comprehensive analysis.

        DOCUMENT TEXT:
        {extracted_text}

        EXTRACTED FINANCIAL DATA:
        {json.dumps(financial_data, indent=2)}

        Please provide a detailed analysis in the following JSON format:

        {{
            "summary": "Brief overview of the insurance plan",
            "key_benefits": [
                "List of main benefits and coverage areas"
            ],
            "cost_structure": {{
                "deductible": "Annual deductible amount and details",
                "copay": "Copay amounts for different services",
                "coinsurance": "Coinsurance percentages",
                "out_of_pocket_max": "Maximum out-of-pocket costs"
            }},
            "network_info": {{
                "type": "HMO, PPO, EPO, etc.",
                "in_network_benefits": "Benefits of staying in-network",
                "out_of_network_penalties": "Costs of going out-of-network"
            }},
            "optimization_tips": [
                "Specific tips to maximize benefits and minimize costs"
            ],
            "out_of_network_prevention": [
                "Strategies to avoid out-of-network charges"
            ],
            "important_limitations": [
                "Key limitations, exclusions, or restrictions"
            ],
            "action_items": [
                "Specific actions the user should take to optimize their plan"
            ]
        }}

        Focus on practical, actionable advice that helps the user:
        1. Understand their coverage and benefits
        2. Avoid unexpected out-of-network charges
        3. Maximize their insurance benefits
        4. Minimize out-of-pocket costs
        5. Navigate their plan effectively

        Be specific and practical in your recommendations.
        """
        
        response = model.generate_content(prompt)
        analysis_text = response.text
        
        # Try to parse as JSON, fallback to text if parsing fails
        try:
            return json.loads(analysis_text)
        except json.JSONDecodeError:
            return {
                "summary": analysis_text[:500] + "..." if len(analysis_text) > 500 else analysis_text,
                "key_benefits": ["Analysis completed - see summary for details"],
                "cost_structure": financial_data.get('insurance_data', {}),
                "network_info": {"type": "See document for details"},
                "optimization_tips": ["Review the full analysis for specific recommendations"],
                "out_of_network_prevention": ["Always verify provider network status before appointments"],
                "important_limitations": ["See document for complete terms and conditions"],
                "action_items": ["Review your plan documents carefully"]
            }
            
    except Exception as e:
        print(f"--- ERROR in insurance plan analysis: {e}")
        return {
            "summary": "Insurance plan analysis completed with basic information extraction.",
            "key_benefits": ["See document for complete benefits details"],
            "cost_structure": financial_data.get('insurance_data', {}),
            "network_info": {"type": "See document for network details"},
            "optimization_tips": ["Always verify provider network status before appointments"],
            "out_of_network_prevention": ["Check with your insurance before receiving care"],
            "important_limitations": ["Review plan documents for complete terms"],
            "action_items": ["Contact your insurance company for specific questions"]
        }

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
        
        # Get upload category from blob metadata
        upload_category = blob.metadata.get('upload_category', 'bills') if blob.metadata else 'bills'
        print(f"--- Upload category: {upload_category} ---")
            
        file_content = blob.download_as_bytes()
        mime_type = blob.content_type

        resource_name = docai_client.processor_path(gcp_project_id, docai_location, docai_processor_id)
        raw_document = documentai.RawDocument(content=file_content, mime_type=mime_type)
        request = documentai.ProcessRequest(name=resource_name, raw_document=raw_document)

        try:
            result = docai_client.process_document(request=request)
            extracted_text = result.document.text
            print("--- Document AI processing successful. ---")
        except Exception as e:
            if "PAGE_LIMIT_EXCEEDED" in str(e):
                print(f"--- WARNING: Document has too many pages for Document AI. Creating fallback analysis. ---")
                # Create a fallback analysis for large documents
                extracted_text = f"Large document detected ({original_filename}). This document appears to be an insurance plan document with many pages. Due to processing limitations, we cannot extract the full text, but we can still provide general guidance based on the document type."
                
                # Create a basic analysis for large insurance documents
                if upload_category == 'insurance':
                    extracted_text += "\n\nThis appears to be an insurance plan document. For comprehensive analysis, please consider uploading a summary page or key sections of the document."
            else:
                raise e

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
        
        # --- 8. EXTRACT STRUCTURED FINANCIAL DATA ---
        print("--- Extracting structured financial data. ---")
        financial_data = extract_financial_data(analysis_json, extracted_text)
        print(f"--- Financial data extracted: {financial_data} ---")
        
        # --- 8.5. GENERATE CATEGORY-SPECIFIC ANALYSIS ---
        print(f"--- Generating category-specific analysis for: {upload_category} ---")
        
        if upload_category == 'insurance':
            # Generate specialized Insurance Plan analysis
            if "Large document detected" in extracted_text:
                # Special handling for large insurance documents
                insurance_analysis = {
                    "summary": "Large insurance plan document detected. Due to the document size (108+ pages), we cannot process the full text, but we can provide general guidance.",
                    "key_benefits": [
                        "This appears to be a comprehensive insurance plan document",
                        "Contains detailed coverage information and terms",
                        "Includes benefits, limitations, and cost structures"
                    ],
                    "cost_structure": {
                        "deductible": "See document for specific deductible amounts",
                        "copay": "Check document for copay schedules",
                        "coinsurance": "Review document for coinsurance percentages",
                        "out_of_pocket_max": "Document contains out-of-pocket maximum details"
                    },
                    "network_info": {
                        "type": "Check document for network type (HMO, PPO, EPO, etc.)",
                        "in_network_benefits": "Document contains in-network provider information",
                        "out_of_network_penalties": "Review document for out-of-network costs"
                    },
                    "optimization_tips": [
                        "Upload key summary pages for detailed analysis",
                        "Focus on benefits summary and coverage details",
                        "Review deductible and copay information",
                        "Check network provider directories"
                    ],
                    "out_of_network_prevention": [
                        "Always verify provider network status before appointments",
                        "Check with your insurance company before receiving care",
                        "Review the provider directory in your plan documents",
                        "Ask providers directly if they accept your insurance"
                    ],
                    "important_limitations": [
                        "Review the complete document for all terms and conditions",
                        "Check for pre-authorization requirements",
                        "Understand coverage limitations and exclusions"
                    ],
                    "action_items": [
                        "Upload summary pages or key sections for detailed analysis",
                        "Contact your insurance company for specific questions",
                        "Review the benefits summary section",
                        "Keep this document for reference during medical visits"
                    ]
                }
            else:
                insurance_analysis = generate_insurance_plan_analysis(extracted_text, financial_data)
            
            # Merge with existing analysis
            analysis_json = json.dumps({
                "key_information": analysis_json,
                "insurance_plan_analysis": insurance_analysis
            })
            print("--- Insurance Plan analysis generated successfully. ---")
        
        # --- 9. SAVING THE ANALYSIS TO FIRESTORE ---
        print("--- Saving analysis to Firestore. ---")
        
        user_ref = firestore_client.collection('users').document(uid)
        analyses_collection = user_ref.collection('analyses')
        
        new_analysis_doc = {
            'analysis_results': analysis_json,
            'financial_data': financial_data,  # Add structured financial data
            'extracted_text': extracted_text,  # CRITICAL: Save the extracted text for dispute letters
            'original_filename': original_filename,
            'gcs_uri': gcs_uri,
            'upload_category': upload_category,  # Store the upload category
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
