// app.js

// Import all the Firebase functions we will need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import {
    getFirestore,
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    serverTimestamp,
    doc,
    setDoc,
    getDoc,
    getDocs,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";


// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDA_Evkv1vg5vWWb0SLbTQ4FruyK2KDd9c",
    authDomain: "healthcareagentic.firebaseapp.com",
    projectId: "healthcareagentic",
    storageBucket: "healthcareagentic.firebasestorage.app",
    messagingSenderId: "974408923536",
    appId: "1:974408923536:web:46fa2a46bb807774fa5b15",
    measurementId: "G-WY9T3WJ31F"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

        // Initialize Stripe - LIVE MODE for production
        const stripe = Stripe('pk_live_51Q1BbeH0nOEj29DyC8yCJIq8elEieHjz3f2LaUAPFILAk0TR1SfqrWdNNNeprOEpEfCjtQLWP15yDykhXEzugu1200z3flyMhO');

        // Backend URL configuration
        const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://127.0.0.1:5000' 
            : 'https://healthcareagentic-backend-974408923536.us-central1.run.app'; 

// --- MAIN SCRIPT LOGIC ---

document.addEventListener('DOMContentLoaded', () => {

    // --- Get all the DOM elements ---
    const authSection = document.getElementById('auth-section');
    const appContainer = document.getElementById('app-container');
    
    // Logged-out pages
    const landingPageContent = document.getElementById('landing-page-content');
    const howItWorksPage = document.getElementById('how-it-works-page');
    const resourcesPage = document.getElementById('resources-page');
    const pricingPage = document.getElementById('pricing-page');

    // Logged-in pages
    const pages = document.querySelectorAll('.page');
    
    // Navigation buttons
    const logoLink = document.getElementById('logo-link');
    const navHowItWorksLink = document.getElementById('nav-how-it-works');
    const navPricingLink = document.getElementById('nav-pricing');
    const navResourcesLink = document.getElementById('nav-resources');
    const navAgentsLink = document.getElementById('nav-agents');
    const agentSelectionCards = document.querySelectorAll('.agent-selection-card');
    const upgradeButtons = document.querySelectorAll('.pricing-card button');
    
    // Modal elements
    const loginNavButton = document.getElementById('login-nav-button');
    const getStartedButton = document.getElementById('get-started-button');
    const getStartedMainButton = document.getElementById('get-started-main-button');
    const getStartedCtaButton = document.getElementById('get-started-cta-button');
    const loginCtaButton = document.getElementById('login-cta-button');
    const askAgentCtaButton = document.getElementById('ask-agent-cta-button');
    const formsContainer = document.getElementById('forms-container');
    const loginFormWrapper = document.getElementById('login-form-wrapper');
    const signupFormWrapper = document.getElementById('signup-form-wrapper');
    const resetPasswordWrapper = document.getElementById('reset-password-wrapper');
    const closeModalButtons = document.querySelectorAll('.close-modal');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const backToLoginLink = document.getElementById('back-to-login-link');
    
    // Resource Modal elements
    const resourceModal = document.getElementById('resource-modal');
    const resourceModalBody = document.getElementById('resource-modal-body');
    const readBillArticle = document.getElementById('read-bill-article');
    const denialArticle = document.getElementById('denial-article');
    const downloadAppealTemplate = document.getElementById('download-appeal-template');
    const downloadChecklistTemplate = document.getElementById('download-checklist-template');

    // Form elements
    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login-form');
    const resetPasswordForm = document.getElementById('reset-password-form');
    const logoutButton = document.getElementById('logout-button');
    const signupMessage = document.getElementById('signup-message');
    const loginMessage = document.getElementById('login-message');
    const resetMessage = document.getElementById('reset-message');
    
    // Agent 1 elements
    const qaForm = document.getElementById('agent1-qa-form');
    const questionInput = document.getElementById('agent1-question');
    const chatContainer = document.getElementById('agent1-chat');
    const chatMessages = document.querySelector('.chat-messages');
    const recentQuestionsList = document.getElementById('recent-questions-list');
    
    // Agent 2 elements
    const uploadForm = document.getElementById('agent2-upload-form');
    const fileInput = document.getElementById('document-upload');
    const browseFilesButton = document.getElementById('browse-files-button');
    const agent2ProgressContainer = document.getElementById('agent2-progress-container');
    const agent2StatusMessage = document.getElementById('agent2-status-message');
    const agent2ResultsList = document.getElementById('agent2-results-list');
    
    // New Agent 2 UI elements
    const agent2ChatMessages = document.getElementById('agent2-chat-messages');
    const analysisStatus = document.getElementById('analysis-status');
    const processingStages = document.querySelectorAll('.stage');
    const metricCards = document.querySelectorAll('.metric-card');
    
    // Modal elements
    const documentDetailsModal = document.getElementById('document-details-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    const closeModal = document.getElementById('close-modal');
    
    // Q&A Modal elements
    const qaModal = document.getElementById('qa-modal');
    const qaMessages = document.getElementById('qa-messages');
    const qaQuestion = document.getElementById('qa-question');
    const qaSubmit = document.getElementById('qa-submit');
    const closeQAModalBtn = document.getElementById('close-qa-modal');
    
    // Agent 3 Dispute Dashboard elements
    const agent3Page = document.getElementById('agent3-page');
    const disputeDashboard = document.getElementById('dispute-dashboard');
    const disputeCreationFlow = document.getElementById('dispute-creation-flow');
    const disputeManagement = document.getElementById('dispute-management');
    const disputeLetterPreview = document.getElementById('dispute-letter-preview');
    
    // Dispute Detail Modal elements
    const disputeDetailModal = document.getElementById('dispute-detail-modal');
    const disputeDetailTitle = document.getElementById('dispute-detail-title');
    const disputeDetailContent = document.getElementById('dispute-detail-content');
    const closeDisputeModal = document.getElementById('close-dispute-modal');
    
    // Dispute Dashboard elements
    const disputeOverview = document.getElementById('dispute-overview');
    const quickActions = document.getElementById('quick-actions');
    const recentDisputes = document.getElementById('recent-disputes');
    const disputeStats = document.getElementById('dispute-stats');
    
    // Dispute Creation elements
    const documentSelection = document.getElementById('document-selection');
    const errorAnalysis = document.getElementById('error-analysis');
    const disputeLetterGeneration = document.getElementById('dispute-letter-generation');
    const disputeSubmission = document.getElementById('dispute-submission');
    
    // Dispute Management elements
    const disputesList = document.getElementById('disputes-list');
    const disputeFilters = document.getElementById('dispute-filters');
    const disputeSearch = document.getElementById('dispute-search');

    // New Agent 2 elements
    const categoryUploads = document.querySelectorAll('.category-upload');
    const browseCategoryButtons = document.querySelectorAll('.browse-category-btn');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const dateFilter = document.getElementById('date-filter');
    const financialMetrics = document.querySelectorAll('.metric-card .amount, .metric-card .percentage, .metric-card .trend');

    // New Agent 1 elements
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const viewAllBtn = document.getElementById('view-all-btn');
    const viewAllContainer = document.getElementById('view-all-questions');
    const copyAnswerBtn = document.getElementById('copy-answer-btn');
    const feedbackSection = document.getElementById('feedback-section');
    const feedbackHelpful = document.getElementById('feedback-helpful');
    const feedbackNotHelpful = document.getElementById('feedback-not-helpful');
    const feedbackThanks = document.getElementById('feedback-thanks');

    let agent1ChatHistory = [];
    let unsubscribeAnalyses = null;
    let unsubscribeChatHistory = null;
    let currentUserSubscriptionTier = 'free';
    
    // Chat helper functions
    function addMessageToChat(sender, message, isThinking = false) {
        if (!chatMessages) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        if (isThinking) {
            messageDiv.id = 'thinking-message';
        }
        
        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'message-bubble';
        
        const messageP = document.createElement('p');
        messageP.textContent = message;
        
        bubbleDiv.appendChild(messageP);
        messageDiv.appendChild(bubbleDiv);
        chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    function removeThinkingMessage() {
        const thinkingMessage = document.getElementById('thinking-message');
        if (thinkingMessage) {
            thinkingMessage.remove();
        }
    }
    
    // Agent 2 Chat helper functions
    function addMessageToAgent2Chat(sender, message, isThinking = false) {
        if (!agent2ChatMessages) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        if (isThinking) {
            messageDiv.id = 'agent2-thinking-message';
        }
        
        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'message-bubble';
        
        const messageP = document.createElement('p');
        messageP.textContent = message;
        
        bubbleDiv.appendChild(messageP);
        messageDiv.appendChild(bubbleDiv);
        agent2ChatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        const chatContainer = document.getElementById('agent2-chat');
        if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }
    
    function removeAgent2ThinkingMessage() {
        const thinkingMessage = document.getElementById('agent2-thinking-message');
        if (thinkingMessage) {
            thinkingMessage.remove();
        }
    }
    
    function updateProcessingStage(stageName) {
        processingStages.forEach(stage => {
            stage.classList.remove('active', 'completed');
        });
        
        const stageMap = {
            'upload': 'stage-upload',
            'analyzing': 'stage-analyzing',
            'calculating': 'stage-calculating',
            'complete': 'stage-complete'
        };
        
        const currentStageId = stageMap[stageName];
        if (currentStageId) {
            const currentStage = document.getElementById(currentStageId);
            if (currentStage) {
                currentStage.classList.add('active');
            }
            
            // Mark previous stages as completed
            const stageOrder = ['upload', 'analyzing', 'calculating', 'complete'];
            const currentIndex = stageOrder.indexOf(stageName);
            
            for (let i = 0; i < currentIndex; i++) {
                const prevStageId = stageMap[stageOrder[i]];
                const prevStage = document.getElementById(prevStageId);
                if (prevStage) {
                    prevStage.classList.add('completed');
                    prevStage.classList.remove('active');
                }
            }
        }
    }
    
    // --- PAGE NAVIGATION LOGIC ---
    const showLandingPage = (pageName) => {
        landingPageContent.classList.add('hidden');
        howItWorksPage.classList.add('hidden');
        resourcesPage.classList.add('hidden');
        pricingPage.classList.add('hidden');

        if (pageName === 'how-it-works') {
            howItWorksPage.classList.remove('hidden');
        } else if (pageName === 'resources') {
            resourcesPage.classList.remove('hidden');
        } else if (pageName === 'pricing') {
            pricingPage.classList.remove('hidden');
        } else { // Default to main landing page
            landingPageContent.classList.remove('hidden');
        }
    };

    const showAppPage = (pageId) => {
        pages.forEach(page => page.classList.add('hidden'));
        const pageToShow = document.getElementById(pageId);
        if (pageToShow) {
            pageToShow.classList.remove('hidden');
            
            // Initialize specific pages
            if (pageId === 'agent-3-page') {
                console.log('📄 Agent 3 page shown, initializing...');
                initializeAgent3();
            } else if (pageId === 'agent-2-page') {
                if (auth.currentUser) {
                    listenForAnalysisResults(auth.currentUser.uid);
                }
            }
        }
    };

    // --- MODAL LOGIC ---
    const showModal = (formToShow) => {
        formsContainer.classList.remove('hidden');
        loginFormWrapper.classList.add('hidden-form');
        signupFormWrapper.classList.add('hidden-form');
        resetPasswordWrapper.classList.add('hidden-form');

        if (formToShow === 'login') {
            loginFormWrapper.classList.remove('hidden-form');
        } else if (formToShow === 'signup') {
            signupFormWrapper.classList.remove('hidden-form');
        } else if (formToShow === 'reset') {
            resetPasswordWrapper.classList.remove('hidden-form');
        }
    };

    const hideModal = () => {
        formsContainer.classList.add('hidden');
        if (signupForm) signupForm.reset();
        if (loginForm) loginForm.reset();
        if (resetPasswordForm) resetPasswordForm.reset();
        if (signupMessage) signupMessage.textContent = '';
        if (loginMessage) loginMessage.textContent = '';
        if (resetMessage) resetMessage.textContent = '';
    };

    const showUpgradePrompt = () => {
        // Create upgrade prompt modal
        const upgradePrompt = document.createElement('div');
        upgradePrompt.id = 'upgrade-prompt';
        upgradePrompt.className = 'upgrade-prompt-overlay';
        upgradePrompt.innerHTML = `
            <div class="upgrade-prompt-content">
                <button class="close-upgrade-prompt">&times;</button>
                <div class="upgrade-prompt-header">
                    <h2>🚀 Unlock Your Full Healthcare Power</h2>
                    <p>Get access to AI agents that can save you hundreds or thousands on medical bills.</p>
                </div>
                <div class="upgrade-prompt-value">
                    <div class="value-stat">
                        <span class="stat-number">$800+</span>
                        <span class="stat-label">Average savings per user</span>
                    </div>
                    <div class="value-stat">
                        <span class="stat-number">75%</span>
                        <span class="stat-label">Success rate on disputes</span>
                    </div>
                </div>
                <div class="upgrade-prompt-features">
                    <h3>Complete Care includes:</h3>
                    <ul>
                        <li>✅ <strong>Bill & Claim Analysis:</strong> Upload documents to find errors and savings</li>
                        <li>✅ <strong>Challenge Bills:</strong> Generate professional dispute letters</li>
                        <li>✅ <strong>Fight Denials:</strong> Appeal insurance denials with expert guidance</li>
                        <li>✅ <strong>Unlimited Uploads:</strong> Analyze all your medical documents</li>
                        <li>✅ <strong>Priority Support:</strong> Get help when you need it most</li>
                    </ul>
                </div>
                <div class="upgrade-prompt-actions">
                    <button class="btn-primary upgrade-now-btn">Start Saving Today - $7.99/month</button>
                    <button class="btn-secondary upgrade-yearly-btn">Best Value - $79/year (Save $17)</button>
                    <button class="btn-text close-upgrade-prompt-btn">Continue with Free Plan</button>
                </div>
                <div class="upgrade-prompt-guarantee">
                    <p>💯 30-day money-back guarantee • Cancel anytime</p>
                </div>
            </div>
        `;
        
        document.body.appendChild(upgradePrompt);
        
        // Add event listeners
        const closeButtons = upgradePrompt.querySelectorAll('.close-upgrade-prompt, .close-upgrade-prompt-btn');
        const upgradeNowBtn = upgradePrompt.querySelector('.upgrade-now-btn');
        const upgradeYearlyBtn = upgradePrompt.querySelector('.upgrade-yearly-btn');
        
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                document.body.removeChild(upgradePrompt);
            });
        });
        
        upgradeNowBtn.addEventListener('click', () => {
            document.body.removeChild(upgradePrompt);
            initiateStripeCheckout('monthly');
        });
        
        upgradeYearlyBtn.addEventListener('click', () => {
            document.body.removeChild(upgradePrompt);
            initiateStripeCheckout('yearly');
        });
        
        // Close on outside click
        upgradePrompt.addEventListener('click', (e) => {
            if (e.target === upgradePrompt) {
                document.body.removeChild(upgradePrompt);
            }
        });
    };

    const initiateStripeCheckout = (plan) => {
        auth.currentUser.getIdToken().then(idToken => {
                            fetch(`${BACKEND_URL}/create-checkout-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ plan: plan })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(session => {
                return stripe.redirectToCheckout({ sessionId: session.id });
            })
            .catch(error => {
                console.error('Error:', error);
                alert('There was an error creating your checkout session. Please try again.');
            });
        });
    };

    // --- RESOURCE CONTENT ---
    const resourceContent = {
        "read-bill-article": `
            <h2>How to Read Your Medical Bill Without Losing Your Mind</h2>
            <p>Medical bills are notoriously confusing. Between the codes, unclear charges, and insurance jargon, it's easy to feel overwhelmed. Here's a quick guide to help you decode your bill and spot red flags.</p>
            <h3>1. Check the Basics</h3>
            <p>Make sure the following info is correct: Your name and date of service, Provider name (hospital, doctor, lab), Account number and bill date.</p>
            <h3>2. Understand the Key Sections</h3>
            <p>Service Descriptions, Billing Codes, Charged Amount vs. Allowed Amount, Insurance Payment, Patient Responsibility.</p>
            <h3>3. Look for Common Errors</h3>
            <p>Charges for canceled or duplicate services, Wrong patient info or insurance ID, Out-of-network charges that should be in-network.</p>
            <h3>4. Pro Tip</h3>
            <p>Request an itemized bill — this breaks down every charge and is crucial if you plan to dispute anything.</p>
        `,
        "denial-article": `
            <h2>What to Do When Your Insurance Denies a Claim</h2>
            <p>A denied insurance claim doesn't mean the end of the road. Here's what you can do to fight back and get your claim reconsidered.</p>
            <h3>1. Understand Why It Was Denied</h3>
            <p>Common reasons include: Lack of pre-authorization, Service deemed "not medically necessary", Incorrect coding.</p>
            <h3>2. Call Your Insurance Provider</h3>
            <p>Ask for the specific denial reason and reference number and request a copy of the claim and explanation of benefits (EOB).</p>
            <h3>3. Gather Your Documents</h3>
            <p>You'll need: The denied bill/claim, Doctor's notes or medical necessity letter, Appeal letter.</p>
            <h3>4. File an Appeal</h3>
            <p>Submit your documentation within the insurer's appeal window (often 30–60 days). Use certified mail or online portals and keep a copy of everything.</p>
        `
    };

    // --- EVENT LISTENERS ---
    loginNavButton.addEventListener('click', () => showModal('login'));
    getStartedButton.addEventListener('click', () => showModal('signup'));
    getStartedMainButton.addEventListener('click', () => showModal('signup'));
    getStartedCtaButton.addEventListener('click', () => showModal('signup'));
    loginCtaButton.addEventListener('click', () => showModal('login'));
    askAgentCtaButton.addEventListener('click', () => {
        if (auth.currentUser) {
            showAppPage('agent-1-page');
        } else {
            showModal('login');
        }
    });
    
    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        showModal('reset');
    });
    backToLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        showModal('login');
    });
    closeModalButtons.forEach(button => button.addEventListener('click', hideModal));
    formsContainer.addEventListener('click', (e) => {
        if (e.target === formsContainer) hideModal();
    });
    
    navHowItWorksLink.addEventListener('click', (e) => {
        e.preventDefault();
        showLandingPage('how-it-works');
    });

    navPricingLink.addEventListener('click', (e) => {
        e.preventDefault();
        showLandingPage('pricing');
    });

    navResourcesLink.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = '/resources';
    });

    // Contact Human functionality
    const navContactHumanLink = document.getElementById('nav-contact-human');
    const contactHumanModal = document.getElementById('contact-human-modal');
    const contactHumanButtons = document.querySelectorAll('.contact-human-btn');
    const contactOptions = document.querySelectorAll('.contact-option');

    // Show Contact Human modal
    const showContactHumanModal = () => {
        contactHumanModal.classList.remove('hidden');
    };

    // Hide Contact Human modal
    const hideContactHumanModal = () => {
        contactHumanModal.classList.add('hidden');
    };

    // Handle contact option clicks
    const handleContactOptionClick = (option) => {
        const email = option.getAttribute('data-email');
        const subject = option.getAttribute('data-subject');
        const body = option.getAttribute('data-body');
        
        // Create mailto link
        const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        
        // Open email client
        window.location.href = mailtoLink;
        
        // Close modal after a short delay
        setTimeout(() => {
            hideContactHumanModal();
        }, 500);
    };

    // Event listeners for Contact Human
    if (navContactHumanLink) {
        navContactHumanLink.addEventListener('click', (e) => {
            e.preventDefault();
            showContactHumanModal();
        });
    }

    // Contact Human modal close functionality
    contactHumanModal.addEventListener('click', (e) => {
        if (e.target === contactHumanModal) {
            hideContactHumanModal();
        }
    });

    // Contact option clicks
    contactOptions.forEach(option => {
        option.addEventListener('click', () => {
            handleContactOptionClick(option);
        });
    });

    // Contact Human buttons on agent pages
    contactHumanButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            showContactHumanModal();
        });
    });

    // Learn more button functionality
    const learnMoreButton = document.getElementById('learn-more-button');
    if (learnMoreButton) {
        learnMoreButton.addEventListener('click', (e) => {
            e.preventDefault();
            showLandingPage('how-it-works');
        });
    }

    logoLink.addEventListener('click', () => {
        if (auth.currentUser) {
            showAppPage('agent-selection-page');
        } else {
            showLandingPage('main');
        }
    });
    
    navAgentsLink.addEventListener('click', (e) => {
        e.preventDefault();
        showAppPage('agent-selection-page');
    });

    agentSelectionCards.forEach(card => {
        // Handle card clicks (excluding button clicks)
        card.addEventListener('click', (e) => {
            // Don't trigger if clicking on the button
            if (e.target.classList.contains('agent-select-btn')) {
                return;
            }
            
            const pageId = card.getAttribute('data-page');
            const isLocked = pageId !== 'agent-1-page' && currentUserSubscriptionTier === 'free';
            
            if (isLocked) {
                showUpgradePrompt();
            } else {
                showAppPage(pageId);
            }
        });
        
        // Handle "Get Started" button clicks
        const selectBtn = card.querySelector('.agent-select-btn');
        if (selectBtn) {
            selectBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card click
                
                const pageId = card.getAttribute('data-page');
                const isLocked = pageId !== 'agent-1-page' && currentUserSubscriptionTier === 'free';
                
                if (isLocked) {
                    showUpgradePrompt();
                } else {
                    showAppPage(pageId);
                }
            });
        }
    });

    readBillArticle.addEventListener('click', () => {
        resourceModalBody.innerHTML = resourceContent['read-bill-article'];
        resourceModal.classList.remove('hidden');
    });

    denialArticle.addEventListener('click', () => {
        resourceModalBody.innerHTML = resourceContent['denial-article'];
        resourceModal.classList.remove('hidden');
    });

    resourceModal.addEventListener('click', (e) => {
        if (e.target === resourceModal) {
            resourceModal.classList.add('hidden');
        }
    });
    
    downloadAppealTemplate.addEventListener('click', () => alert("Template download functionality is coming soon!"));
    downloadChecklistTemplate.addEventListener('click', () => alert("Checklist download functionality is coming soon!"));


    // --- AGENT 3 DISPUTE SYSTEM FUNCTIONS ---
    
    // Global variables for dispute system
    let userDisputes = [];
    let currentDisputeDocument = null;
    let currentDisputeAnalysis = null;
    
    // Initialize Agent 3 dispute system
    function initializeAgent3() {
        console.log('🚀 Initializing Agent 3 dispute system...');
        if (agent3Page) {
            // Load disputes data first, then setup UI
            loadDisputeDashboard().then(() => {
                setupDisputeEventListeners();
                console.log('✅ Agent 3 initialization complete');
            }).catch(error => {
                console.error('❌ Error initializing Agent 3:', error);
                setupDisputeEventListeners();
            });
        }
    }
    
    // Show main page (Agent selection)
    window.showMainPage = function() {
        console.log('🏠 Navigating to main page...');
        showAppPage('agent-selection-page');
        
        // Ensure the main page content is properly loaded
        setTimeout(() => {
            console.log('🔄 Refreshing main page content...');
            updateUIAfterLogin();
        }, 100);
    };
    
    // Load dispute dashboard data
    async function loadDisputeDashboard() {
        console.log('📊 Loading dispute dashboard...');
        try {
            const user = auth.currentUser;
            if (!user) {
                console.error('❌ No authenticated user found');
                return;
            }
            
            console.log('👤 User authenticated, getting ID token...');
            const idToken = await user.getIdToken();
            
            console.log('📡 Fetching user disputes from backend...');
            console.log('🌐 Backend URL:', BACKEND_URL);
            const response = await fetch(`${BACKEND_URL}/api/dispute/user-disputes`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('📥 Response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Disputes data received:', data);
                userDisputes = data.disputes || [];
                console.log('📋 User disputes loaded:', userDisputes);
                updateDisputeDashboard();
            } else {
                const errorText = await response.text();
                console.error('❌ Error loading disputes:', response.status, errorText);
            }
        } catch (error) {
            console.error('❌ Error loading dispute dashboard:', error);
        }
    }
    
    // Update dispute dashboard UI
    function updateDisputeDashboard() {
        console.log('📊 Updating dispute dashboard, userDisputes:', userDisputes);
        
        if (!disputeStats || !recentDisputes) {
            console.error('❌ Dispute dashboard containers not found');
            return;
        }
        
        // Update statistics
        const totalDisputes = userDisputes.length;
        const activeDisputes = userDisputes.filter(d => d.status === 'draft' || d.status === 'submitted' || d.status === 'in_progress').length;
        const resolvedDisputes = userDisputes.filter(d => d.status === 'resolved').length;
        const totalAmountDisputed = userDisputes.reduce((sum, d) => sum + (d.amount_disputed || 0), 0);
        
        console.log('📈 Statistics:', { totalDisputes, activeDisputes, resolvedDisputes, totalAmountDisputed });
        
        disputeStats.innerHTML = `
            <div class="stat-card">
                <h4>Total Disputes</h4>
                <div class="stat-value">${totalDisputes}</div>
            </div>
            <div class="stat-card">
                <h4>Active Disputes</h4>
                <div class="stat-value">${activeDisputes}</div>
            </div>
            <div class="stat-card">
                <h4>Resolved</h4>
                <div class="stat-value">${resolvedDisputes}</div>
            </div>
            <div class="stat-card">
                <h4>Amount Disputed</h4>
                <div class="stat-value">$${totalAmountDisputed.toFixed(2)}</div>
            </div>
        `;
        
        // Update recent disputes
        const recentDisputesList = userDisputes.slice(0, 5);
        console.log('📋 Recent disputes list:', recentDisputesList);
        
        if (recentDisputesList.length > 0) {
            recentDisputes.innerHTML = recentDisputesList.map(dispute => {
                // Handle date formatting for recent disputes
                let createdDate = 'Unknown';
                if (dispute.created_at) {
                    try {
                        if (dispute.created_at.toDate && typeof dispute.created_at.toDate === 'function') {
                            createdDate = dispute.created_at.toDate().toLocaleDateString();
                        } else if (dispute.created_at.seconds) {
                            createdDate = new Date(dispute.created_at.seconds * 1000).toLocaleDateString();
                        } else if (typeof dispute.created_at === 'string') {
                            createdDate = new Date(dispute.created_at).toLocaleDateString();
                        } else if (typeof dispute.created_at === 'number') {
                            createdDate = new Date(dispute.created_at).toLocaleDateString();
                        } else {
                            createdDate = new Date().toLocaleDateString();
                        }
                    } catch (error) {
                        console.error('❌ Error parsing date for recent dispute:', dispute.id, error);
                        createdDate = 'Unknown';
                    }
                }
                
                return `
                    <div class="dispute-item">
                        <div class="dispute-info">
                            <h4>${dispute.error_type?.replace('_', ' ').toUpperCase() || 'UNKNOWN ERROR'}</h4>
                            <p>Status: ${dispute.status || 'Unknown'}</p>
                            <p>Created: ${createdDate}</p>
                            <p>Amount: $${dispute.amount_disputed?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div class="dispute-actions">
                            <button class="btn-small" onclick="viewDispute('${dispute.id}')">View</button>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            recentDisputes.innerHTML = '<p class="placeholder">No disputes yet. Start by analyzing a document!</p>';
        }
        
        console.log('✅ Dispute dashboard updated successfully');
    }
    
    // Setup dispute event listeners
    function setupDisputeEventListeners() {
        // Quick action buttons
        if (quickActions) {
            quickActions.innerHTML = `
                <button class="btn-primary" onclick="startNewDispute()">Start New Dispute</button>
                <button class="btn-secondary" onclick="viewAllDisputes()">View All Disputes</button>
                <button class="btn-secondary" onclick="uploadDocumentForDispute()">Upload Document</button>
            `;
        }
    }
    
    // Start new dispute flow
    window.startNewDispute = function() {
        if (disputeCreationFlow) {
            disputeCreationFlow.classList.remove('hidden');
            disputeDashboard.classList.add('hidden');
            showDocumentSelection();
        }
    };
    
    // Show document selection for dispute
    function showDocumentSelection() {
        if (!documentSelection) return;
        
        // Get user's analyzed documents
        const analysesCollectionRef = collection(db, 'users', auth.currentUser.uid, 'analyses');
        const q = query(analysesCollectionRef, orderBy('created_at', 'desc'));
        
        getDocs(q).then(snapshot => {
            const documents = [];
            snapshot.forEach(doc => {
                const analysis = doc.data();
                analysis.id = doc.id;
                documents.push(analysis);
            });
            
            documentSelection.innerHTML = `
                <h3>Select Document to Dispute</h3>
                <div class="document-grid">
                    ${documents.map(doc => `
                        <div class="document-card">
                            <div class="doc-header">
                                <span class="doc-type">${doc.financial_data?.document_type === 'eob' ? '📋 EOB' : '📄 Bill'}</span>
                                <span class="doc-status ${doc.status}">${doc.status}</span>
                            </div>
                            <h4>${doc.original_filename || 'Unknown Document'}</h4>
                            <p>Amount: $${doc.financial_data?.total_charged?.toFixed(2) || '0.00'}</p>
                            <button class="btn-primary" onclick="selectDocumentForDispute('${doc.id}')">Analyze for Disputes</button>
                        </div>
                    `).join('')}
                </div>
            `;
        });
    }
    
    // Select document for dispute
    window.selectDocumentForDispute = async function(documentId) {
        console.log('🔍 Starting dispute analysis for document:', documentId);
        try {
            const user = auth.currentUser;
            if (!user) {
                console.error('❌ No authenticated user found');
                return;
            }
            
            console.log('👤 User authenticated, getting ID token...');
            const idToken = await user.getIdToken();
            
            console.log('📡 Sending request to backend...');
            const response = await fetch(`${BACKEND_URL}/api/dispute/analyze-document`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ documentId })
            });
            
            console.log('📥 Response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Analysis successful:', data);
                currentDisputeDocument = documentId;
                currentDisputeAnalysis = data;
                showErrorAnalysis(data);
            } else {
                const errorText = await response.text();
                console.error('❌ Error analyzing document for disputes:', response.status, errorText);
                alert('Error analyzing document. Please try again.');
            }
        } catch (error) {
            console.error('❌ Error selecting document for dispute:', error);
            alert('Network error. Please check your connection and try again.');
        }
    };
    
    // Show error analysis results
    function showErrorAnalysis(analysisData) {
        console.log('📊 Showing error analysis results:', analysisData);
        
        if (!errorAnalysis) {
            console.error('❌ Error analysis container not found');
            return;
        }
        
        // Hide document selection and show error analysis
        if (documentSelection) {
            documentSelection.classList.add('hidden');
        }
        errorAnalysis.classList.remove('hidden');
        
        const { detected_errors, dispute_recommendations } = analysisData;
        
        errorAnalysis.innerHTML = `
            <div class="step-header">
                <h3>🔍 Step 2: Review Detected Billing Errors</h3>
                <div class="step-progress">
                    <span class="progress-step completed">1</span>
                    <span class="progress-line"></span>
                    <span class="progress-step active">2</span>
                    <span class="progress-line"></span>
                    <span class="progress-step">3</span>
                    <span class="progress-line"></span>
                    <span class="progress-step">4</span>
                </div>
            </div>
            <div class="step-instructions">
                <p>Our AI has analyzed your document and found potential billing errors. Review each error and its confidence level.</p>
                <div class="confidence-explanation">
                    <h4>Confidence Levels:</h4>
                    <div class="confidence-levels">
                        <div class="confidence-level high">
                            <span class="confidence-dot high"></span>
                            <span><strong>High:</strong> Very likely to be a billing error</span>
                        </div>
                        <div class="confidence-level medium">
                            <span class="confidence-dot medium"></span>
                            <span><strong>Medium:</strong> Possibly a billing error, worth investigating</span>
                        </div>
                        <div class="confidence-level low">
                            <span class="confidence-dot low"></span>
                            <span><strong>Low:</strong> May be an error, but less certain</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="error-analysis-results">
                ${detected_errors && detected_errors.length > 0 ? detected_errors.map(error => `
                    <div class="error-card ${error.confidence}">
                        <div class="error-header">
                            <h4>${error.type.replace('_', ' ').toUpperCase()}</h4>
                            <span class="confidence-badge ${error.confidence}">${error.confidence}</span>
                        </div>
                        <p>${error.description}</p>
                        <div class="error-evidence">
                            <strong>Evidence:</strong> ${error.evidence}
                        </div>
                        <button class="btn-primary" onclick="generateDisputeLetter('${error.type}')">Generate Dispute Letter</button>
                    </div>
                `).join('') : '<p class="placeholder">No billing errors detected in this document.</p>'}
            </div>
            <div class="step-actions">
                <button class="btn-secondary" onclick="showDocumentSelection()">← Back to Document Selection</button>
            </div>
        `;
        
        console.log('✅ Error analysis step displayed successfully');
    }
    
    // Generate dispute letter
    window.generateDisputeLetter = async function(errorType) {
        console.log('📝 Generating dispute letter for error type:', errorType);
        try {
            const user = auth.currentUser;
            if (!user) {
                console.error('❌ No authenticated user found');
                return;
            }
            
            console.log('👤 User authenticated, getting ID token...');
            const idToken = await user.getIdToken();
            
            console.log('📡 Sending request to generate letter...');
            const response = await fetch(`${BACKEND_URL}/api/dispute/generate-letter`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    documentId: currentDisputeDocument,
                    errorType: errorType
                })
            });
            
            console.log('📥 Response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Letter generated successfully:', data);
                showDisputeLetterPreview(data.dispute_letter, errorType);
            } else {
                const errorText = await response.text();
                console.error('❌ Error generating dispute letter:', response.status, errorText);
                alert('Error generating dispute letter. Please try again.');
            }
        } catch (error) {
            console.error('❌ Error generating dispute letter:', error);
            alert('Network error. Please check your connection and try again.');
        }
    };
    
    // Show dispute letter preview
    function showDisputeLetterPreview(letter, errorType) {
        console.log('📄 Showing dispute letter preview for error type:', errorType);
        
        if (!disputeLetterPreview) {
            console.error('❌ Dispute letter preview container not found');
            return;
        }
        
        // Hide error analysis and show letter preview
        if (errorAnalysis) {
            errorAnalysis.classList.add('hidden');
        }
        disputeLetterPreview.classList.remove('hidden');
        
        disputeLetterPreview.innerHTML = `
            <div class="step-header">
                <h3>📝 Step 3: Review Your Dispute Letter</h3>
                <div class="step-progress">
                    <span class="progress-step completed">1</span>
                    <span class="progress-line"></span>
                    <span class="progress-step completed">2</span>
                    <span class="progress-line"></span>
                    <span class="progress-step active">3</span>
                    <span class="progress-line"></span>
                    <span class="progress-step">4</span>
                </div>
            </div>
            <div class="step-instructions">
                <p>Review the generated dispute letter. You can edit it if needed before submitting.</p>
                <div class="letter-tips">
                    <div class="tip">
                        <span class="tip-icon">✏️</span>
                        <span>Feel free to personalize the letter with your specific details</span>
                    </div>
                    <div class="tip">
                        <span class="tip-icon">📧</span>
                        <span>You can send this letter via email, mail, or fax to the provider</span>
                    </div>
                    <div class="tip">
                        <span class="tip-icon">📅</span>
                        <span>Keep track of when you send it - most providers respond within 30 days</span>
                    </div>
                </div>
            </div>
            <div class="letter-preview">
                <div class="letter-content">
                    ${letter.replace(/\n/g, '<br>')}
                </div>
                <div class="letter-actions">
                    <button class="btn-secondary" onclick="editDisputeLetter()">✏️ Edit Letter</button>
                    <button class="btn-secondary" onclick="downloadLetter()">📥 Download PDF</button>
                    <button class="btn-primary" onclick="submitDispute('${errorType}')">📤 Submit Dispute</button>
                </div>
            </div>
            <div class="step-actions">
                <button class="btn-secondary" onclick="showErrorAnalysis()">← Back to Error Analysis</button>
            </div>
        `;
        
        console.log('✅ Dispute letter preview displayed successfully');
    }
    
    // Submit dispute
    window.submitDispute = async function(errorType) {
        console.log('📤 Submitting dispute for error type:', errorType);
        try {
            const user = auth.currentUser;
            if (!user) {
                console.error('❌ No authenticated user found');
                return;
            }
            
            console.log('👤 User authenticated, getting ID token...');
            const idToken = await user.getIdToken();
            
            const disputeData = {
                documentId: currentDisputeDocument,
                errorType: errorType,
                disputeLetter: currentDisputeAnalysis.dispute_recommendations.find(r => r.error_type === errorType)?.dispute_letter || '',
                amountDisputed: currentDisputeAnalysis.detected_errors.find(e => e.type === errorType)?.amount || 0
            };
            
            console.log('📋 Submitting dispute data:', disputeData);
            
            const response = await fetch(`${BACKEND_URL}/api/dispute/submit-dispute`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(disputeData)
            });
            
            console.log('📥 Response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Dispute submitted successfully:', data);
                alert('Dispute submitted successfully!');
                
                // Refresh the disputes data
                await loadDisputeDashboard();
                showDisputeDashboard();
            } else {
                const errorText = await response.text();
                console.error('❌ Error submitting dispute:', response.status, errorText);
                alert('Error submitting dispute. Please try again.');
            }
        } catch (error) {
            console.error('❌ Error submitting dispute:', error);
            alert('Network error. Please check your connection and try again.');
        }
    };
    
    // Show dispute dashboard
    window.showDisputeDashboard = function() {
        console.log('🏠 Showing dispute dashboard...');
        if (disputeDashboard) {
            disputeDashboard.classList.remove('hidden');
            disputeCreationFlow.classList.add('hidden');
            disputeLetterPreview.classList.add('hidden');
            // Refresh data when showing dashboard
            loadDisputeDashboard();
        }
    };
    
    // Refresh disputes data
    window.refreshDisputes = function() {
        console.log('🔄 Refreshing disputes data...');
        loadDisputeDashboard();
    };
    
    // View all disputes
    window.viewAllDisputes = function() {
        console.log('📋 Viewing all disputes...');
        if (disputeManagement) {
            disputeManagement.classList.remove('hidden');
            disputeDashboard.classList.add('hidden');
            // Refresh disputes data before showing the list
            loadDisputeDashboard().then(() => {
                loadDisputesList();
            });
        }
    };
    
    // Load disputes list
    function loadDisputesList() {
        console.log('📋 Loading disputes list, userDisputes:', userDisputes);
        if (!disputesList) {
            console.error('❌ Disputes list container not found');
            return;
        }
        
        if (!userDisputes || userDisputes.length === 0) {
            disputesList.innerHTML = '<p class="placeholder">No disputes found. Start by creating a new dispute!</p>';
            return;
        }
        
        disputesList.innerHTML = userDisputes.map(dispute => {
            console.log('📄 Processing dispute:', dispute);
            
            // Handle different date formats from Firestore
            let createdDate = 'Unknown';
            if (dispute.created_at) {
                try {
                    if (dispute.created_at.toDate && typeof dispute.created_at.toDate === 'function') {
                        // Firestore Timestamp
                        createdDate = dispute.created_at.toDate().toLocaleDateString();
                    } else if (dispute.created_at.seconds) {
                        // Firestore Timestamp object without toDate method
                        createdDate = new Date(dispute.created_at.seconds * 1000).toLocaleDateString();
                    } else if (typeof dispute.created_at === 'string') {
                        // ISO string
                        createdDate = new Date(dispute.created_at).toLocaleDateString();
                    } else if (typeof dispute.created_at === 'number') {
                        // Unix timestamp
                        createdDate = new Date(dispute.created_at).toLocaleDateString();
                    } else {
                        // Fallback
                        createdDate = new Date().toLocaleDateString();
                    }
                } catch (error) {
                    console.error('❌ Error parsing date for dispute:', dispute.id, error);
                    createdDate = 'Unknown';
                }
            }
            
            return `
                <div class="dispute-item">
                    <div class="dispute-info">
                        <h4>${dispute.error_type?.replace('_', ' ').toUpperCase() || 'UNKNOWN ERROR'}</h4>
                        <p>Status: ${dispute.status || 'Unknown'}</p>
                        <p>Created: ${createdDate}</p>
                        <p>Amount: $${dispute.amount_disputed?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div class="dispute-actions">
                        <button class="btn-small" onclick="viewDispute('${dispute.id}')">View</button>
                        <button class="btn-small" onclick="editDispute('${dispute.id}')">Edit</button>
                    </div>
                </div>
            `;
        }).join('');
        
        console.log('✅ Disputes list loaded successfully');
    }
    
    // View specific dispute
    window.viewDispute = function(disputeId) {
        console.log('👁️ Viewing dispute:', disputeId);
        const dispute = userDisputes.find(d => d.id === disputeId);
        if (dispute) {
            showDisputeDetail(dispute);
        } else {
            console.error('❌ Dispute not found:', disputeId);
            alert('Dispute not found. Please refresh and try again.');
        }
    };
    
    // Show dispute detail modal
    function showDisputeDetail(dispute) {
        console.log('📄 Showing dispute detail:', dispute);
        
        if (!disputeDetailModal || !disputeDetailTitle || !disputeDetailContent) {
            console.error('❌ Dispute detail modal elements not found');
            return;
        }
        
        // Handle date formatting
        let createdDate = 'Unknown';
        if (dispute.created_at) {
            try {
                if (dispute.created_at.toDate && typeof dispute.created_at.toDate === 'function') {
                    createdDate = dispute.created_at.toDate().toLocaleDateString();
                } else if (dispute.created_at.seconds) {
                    createdDate = new Date(dispute.created_at.seconds * 1000).toLocaleDateString();
                } else if (typeof dispute.created_at === 'string') {
                    createdDate = new Date(dispute.created_at).toLocaleDateString();
                } else if (typeof dispute.created_at === 'number') {
                    createdDate = new Date(dispute.created_at).toLocaleDateString();
                } else {
                    createdDate = new Date().toLocaleDateString();
                }
            } catch (error) {
                console.error('❌ Error parsing date for dispute:', dispute.id, error);
                createdDate = 'Unknown';
            }
        }
        
        // Update modal title
        disputeDetailTitle.textContent = `${dispute.error_type?.replace('_', ' ').toUpperCase() || 'UNKNOWN ERROR'} Dispute`;
        
        // Update modal content
        disputeDetailContent.innerHTML = `
            <div class="dispute-detail-info">
                <div class="detail-section">
                    <h4>Dispute Information</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Error Type:</label>
                            <span>${dispute.error_type?.replace('_', ' ').toUpperCase() || 'Unknown'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Status:</label>
                            <span class="status-badge ${dispute.status}">${dispute.status || 'Unknown'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Created:</label>
                            <span>${createdDate}</span>
                        </div>
                        <div class="detail-item">
                            <label>Amount Disputed:</label>
                            <span>$${dispute.amount_disputed?.toFixed(2) || '0.00'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4>Dispute Letter</h4>
                    <div class="dispute-letter-content">
                        ${dispute.dispute_letter ? dispute.dispute_letter.replace(/\n/g, '<br>') : '<p class="placeholder">No dispute letter available.</p>'}
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4>Actions</h4>
                    <div class="detail-actions">
                        <button class="btn-secondary" onclick="editDispute('${dispute.id}')">✏️ Edit Dispute</button>
                        <button class="btn-secondary" onclick="downloadDisputeLetter('${dispute.id}')">📥 Download Letter</button>
                        <button class="btn-primary" onclick="submitDisputeUpdate('${dispute.id}')">📤 Submit Update</button>
                    </div>
                </div>
            </div>
        `;
        
        // Show modal
        disputeDetailModal.classList.remove('hidden');
        console.log('✅ Dispute detail modal displayed');
    }
    
    // Edit dispute
    window.editDispute = function(disputeId) {
        console.log('✏️ Editing dispute:', disputeId);
        const dispute = userDisputes.find(d => d.id === disputeId);
        if (dispute) {
            showDisputeEditor(dispute);
        } else {
            console.error('❌ Dispute not found for editing:', disputeId);
            alert('Dispute not found. Please refresh and try again.');
        }
    };
    
    // Show dispute editor
    function showDisputeEditor(dispute) {
        console.log('📝 Showing dispute editor for:', dispute);
        
        if (!disputeDetailModal || !disputeDetailTitle || !disputeDetailContent) {
            console.error('❌ Dispute detail modal elements not found');
            return;
        }
        
        // Update modal title
        disputeDetailTitle.textContent = `Edit ${dispute.error_type?.replace('_', ' ').toUpperCase() || 'UNKNOWN ERROR'} Dispute`;
        
        // Update modal content with editable form
        disputeDetailContent.innerHTML = `
            <div class="dispute-editor">
                <div class="editor-section">
                    <h4>Dispute Information</h4>
                    <div class="editor-grid">
                        <div class="editor-item">
                            <label>Error Type:</label>
                            <span>${dispute.error_type?.replace('_', ' ').toUpperCase() || 'Unknown'}</span>
                        </div>
                        <div class="editor-item">
                            <label>Status:</label>
                            <span class="status-badge ${dispute.status}">${dispute.status || 'Unknown'}</span>
                        </div>
                        <div class="editor-item">
                            <label>Amount Disputed:</label>
                            <span>$${dispute.amount_disputed?.toFixed(2) || '0.00'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="editor-section">
                    <h4>Edit Dispute Letter</h4>
                    <div class="letter-editor">
                        <textarea id="dispute-letter-editor" rows="15" placeholder="Edit your dispute letter here...">${dispute.dispute_letter || ''}</textarea>
                        <div class="editor-tips">
                            <p><strong>💡 Tips for effective dispute letters:</strong></p>
                            <ul>
                                <li>Be specific about the billing error</li>
                                <li>Include relevant dates and amounts</li>
                                <li>Request a specific resolution</li>
                                <li>Set a reasonable deadline for response</li>
                                <li>Keep a professional tone</li>
                            </ul>
                        </div>
                    </div>
                </div>
                
                <div class="editor-section">
                    <h4>Actions</h4>
                    <div class="editor-actions">
                        <button class="btn-secondary" onclick="cancelEdit()">❌ Cancel</button>
                        <button class="btn-secondary" onclick="resetLetter('${dispute.id}')">🔄 Reset to Original</button>
                        <button class="btn-primary" onclick="saveDisputeEdit('${dispute.id}')">💾 Save Changes</button>
                    </div>
                </div>
            </div>
        `;
        
        // Show modal
        disputeDetailModal.classList.remove('hidden');
        console.log('✅ Dispute editor displayed');
    }
    
    // Guide toggle function
    window.toggleGuide = function() {
        const guide = document.getElementById('dispute-guide');
        if (guide) {
            guide.classList.toggle('hidden');
        }
    };
    
    // Navigation functions for dispute flow
    window.showDocumentSelection = function() {
        if (documentSelection) {
            documentSelection.classList.remove('hidden');
            errorAnalysis.classList.add('hidden');
            disputeLetterPreview.classList.add('hidden');
        }
    };
    
    window.showErrorAnalysis = function() {
        if (errorAnalysis && currentDisputeAnalysis) {
            errorAnalysis.classList.remove('hidden');
            documentSelection.classList.add('hidden');
            disputeLetterPreview.classList.add('hidden');
            showErrorAnalysis(currentDisputeAnalysis);
        }
    };
    
    // Download letter function
    window.downloadLetter = function() {
        // TODO: Implement PDF download functionality
        alert('PDF download functionality coming soon!');
    };
    
    // Edit letter function
    window.editDisputeLetter = function() {
        // TODO: Implement letter editing functionality
        alert('Letter editing functionality coming soon!');
    };
    
    // Close dispute detail modal
    window.closeDisputeModal = function() {
        if (disputeDetailModal) {
            disputeDetailModal.classList.add('hidden');
        }
    };
    
    // Download dispute letter
    window.downloadDisputeLetter = function(disputeId) {
        console.log('📥 Downloading dispute letter for:', disputeId);
        const dispute = userDisputes.find(d => d.id === disputeId);
        if (dispute) {
            downloadLetterAsPDF(dispute);
        } else {
            console.error('❌ Dispute not found for download:', disputeId);
            alert('Dispute not found. Please refresh and try again.');
        }
    };
    
    // Download letter as PDF
    function downloadLetterAsPDF(dispute) {
        console.log('📄 Generating PDF for dispute:', dispute);
        
        // Create a formatted letter for PDF
        const letterContent = formatLetterForPDF(dispute);
        
        // Create a blob with the letter content
        const blob = new Blob([letterContent], { type: 'text/plain' });
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `dispute_letter_${dispute.error_type}_${new Date().toISOString().split('T')[0]}.txt`;
        
        // Trigger download
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        console.log('✅ Letter downloaded successfully');
    }
    
    // Format letter for PDF/download
    function formatLetterForPDF(dispute) {
        const date = new Date().toLocaleDateString();
        
        let letterContent = `DISPUTE LETTER\n`;
        letterContent += `Generated: ${date}\n`;
        letterContent += `Error Type: ${dispute.error_type?.replace('_', ' ').toUpperCase() || 'UNKNOWN ERROR'}\n`;
        letterContent += `Amount Disputed: $${dispute.amount_disputed?.toFixed(2) || '0.00'}\n`;
        letterContent += `Status: ${dispute.status || 'Unknown'}\n`;
        letterContent += `\n${'='.repeat(50)}\n\n`;
        
        if (dispute.dispute_letter) {
            letterContent += dispute.dispute_letter;
        } else {
            letterContent += 'No dispute letter available.';
        }
        
        letterContent += `\n\n${'='.repeat(50)}\n`;
        letterContent += `Generated by MyCareClaim Dispute System\n`;
        letterContent += `Date: ${date}\n`;
        
        return letterContent;
    }
    
    // Submit dispute update
    window.submitDisputeUpdate = function(disputeId) {
        // TODO: Implement dispute update functionality
        alert('Dispute update functionality coming soon!');
    };
    
    // Cancel edit and return to view mode
    window.cancelEdit = function() {
        console.log('❌ Canceling edit...');
        const disputeId = getCurrentEditingDisputeId();
        if (disputeId) {
            const dispute = userDisputes.find(d => d.id === disputeId);
            if (dispute) {
                showDisputeDetail(dispute);
            }
        }
    };
    
    // Reset letter to original
    window.resetLetter = function(disputeId) {
        console.log('🔄 Resetting letter for dispute:', disputeId);
        const dispute = userDisputes.find(d => d.id === disputeId);
        if (dispute) {
            // TODO: Fetch original letter from backend
            alert('Reset functionality will be implemented to restore the original generated letter.');
        }
    };
    
    // Save dispute edit
    window.saveDisputeEdit = async function(disputeId) {
        console.log('💾 Saving dispute edit for:', disputeId);
        const letterEditor = document.getElementById('dispute-letter-editor');
        if (!letterEditor) {
            console.error('❌ Letter editor not found');
            return;
        }
        
        const updatedLetter = letterEditor.value.trim();
        if (!updatedLetter) {
            alert('Please enter a dispute letter before saving.');
            return;
        }
        
        try {
            const user = auth.currentUser;
            if (!user) {
                console.error('❌ No authenticated user found');
                return;
            }
            
            const idToken = await user.getIdToken();
            const response = await fetch(`${BACKEND_URL}/api/dispute/update-dispute`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    disputeId: disputeId,
                    disputeLetter: updatedLetter
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Dispute updated successfully:', data);
                
                // Update local dispute data
                const disputeIndex = userDisputes.findIndex(d => d.id === disputeId);
                if (disputeIndex !== -1) {
                    userDisputes[disputeIndex].dispute_letter = updatedLetter;
                }
                
                alert('Dispute letter updated successfully!');
                
                // Return to view mode
                const dispute = userDisputes.find(d => d.id === disputeId);
                if (dispute) {
                    showDisputeDetail(dispute);
                }
            } else {
                const errorText = await response.text();
                console.error('❌ Error updating dispute:', response.status, errorText);
                alert('Error updating dispute. Please try again.');
            }
        } catch (error) {
            console.error('❌ Error saving dispute edit:', error);
            alert('Network error. Please check your connection and try again.');
        }
    };
    
    // Helper function to get current editing dispute ID
    function getCurrentEditingDisputeId() {
        // This is a simple implementation - in a real app, you might store this in a variable
        const disputeIdMatch = disputeDetailTitle.textContent.match(/Edit (.+) Dispute/);
        if (disputeIdMatch) {
            const errorType = disputeIdMatch[1].toLowerCase().replace(' ', '_');
            const dispute = userDisputes.find(d => d.error_type === errorType);
            return dispute ? dispute.id : null;
        }
        return null;
    }

    // --- AUTH STATE LISTENER ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            const userDocRef = doc(db, 'users', user.uid);
            getDoc(userDocRef).then(docSnap => {
                if (docSnap.exists()) {
                    const newSubscriptionTier = docSnap.data().subscriptionTier || 'free';
                    const wasUpgraded = currentUserSubscriptionTier === 'free' && newSubscriptionTier === 'complete_care';
                    currentUserSubscriptionTier = newSubscriptionTier;
                    
                    if (wasUpgraded) {
                        showUpgradeSuccessMessage();
                    }
                }
                updateUIAfterLogin();
            });
        } else {
            authSection.classList.remove('hidden');
            appContainer.classList.add('hidden');
            showLandingPage('main');
            if (unsubscribeAnalyses) unsubscribeAnalyses();
            if (unsubscribeChatHistory) unsubscribeChatHistory();
            agent1ChatHistory = [];
            currentUserSubscriptionTier = 'free';
        }
    });

    const showUpgradeSuccessMessage = () => {
        const successMessage = document.createElement('div');
        successMessage.className = 'upgrade-success-message';
        successMessage.innerHTML = `
            <div class="success-content">
                <h3>🎉 Welcome to Complete Care!</h3>
                <p>You now have access to all premium agents. Start exploring!</p>
                <button class="btn-primary dismiss-success">Got it!</button>
            </div>
        `;
        
        document.body.appendChild(successMessage);
        
        const dismissBtn = successMessage.querySelector('.dismiss-success');
        dismissBtn.addEventListener('click', () => {
            document.body.removeChild(successMessage);
        });
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (document.body.contains(successMessage)) {
                document.body.removeChild(successMessage);
            }
        }, 5000);
    };

    const updateUIAfterLogin = () => {
        authSection.classList.add('hidden');
        appContainer.classList.remove('hidden');
        showAppPage('agent-selection-page');
        hideModal();
        
        agentSelectionCards.forEach(card => {
            const page = card.getAttribute('data-page');
            const isLocked = page !== 'agent-1-page' && currentUserSubscriptionTier === 'free';
            card.classList.toggle('locked', isLocked);
            
            if (isLocked) {
                card.querySelector('p').textContent = '🔒 Upgrade to Complete Care to unlock this agent';
                card.style.opacity = '0.6';
                card.style.cursor = 'not-allowed';
            } else {
                card.querySelector('p').textContent = card.dataset.originalText;
                card.style.opacity = '1';
                card.style.cursor = 'pointer';
            }
        });

        listenForAnalysisResults(auth.currentUser.uid);
        listenForChatHistory(auth.currentUser.uid);
    };

    agentSelectionCards.forEach(card => {
        card.dataset.originalText = card.querySelector('p').textContent;
    });

    // --- Firestore Listeners ---
    function listenForChatHistory(uid) {
        const chatHistoryCollectionRef = collection(db, 'users', uid, 'chat_history');
        const q = query(chatHistoryCollectionRef, orderBy('created_at', 'desc')); 
        
        unsubscribeChatHistory = onSnapshot(q, (snapshot) => {
            agent1ChatHistory = [];
            let fullChatHtml = '';
            const recentQuestions = [];
            
            const docs = snapshot.docs.reverse();

            if (docs.length === 0) {
                fullChatHtml = '<p class="placeholder">Your answer will appear here...</p>';
            } else {
                docs.forEach(doc => {
                    const message = doc.data();
                    agent1ChatHistory.push({ "user": message.question, "ai": message.answer });
                    fullChatHtml += `<p><strong>You:</strong> ${message.question}</p><p><strong>Agent:</strong> ${message.answer}</p><hr>`;
                    
                    if (message.question && !recentQuestions.includes(message.question)) {
                        // Debug: Log the timestamp to see what we're getting
                        console.log('Message timestamp:', message.created_at);
                        console.log('Message data:', message);
                        
                        recentQuestions.push({
                            question: message.question,
                            timestamp: message.created_at,
                            id: doc.id
                        });
                    }
                });
            }

            // Note: This function is for displaying chat history, but we're now using chat bubbles
            // The chat history will be displayed through the addMessageToChat function

            // Show/hide copy button and feedback based on whether there's an answer
            if (copyAnswerBtn && feedbackSection) {
                if (docs.length > 0) {
                    copyAnswerBtn.style.display = 'inline-block';
                    feedbackSection.style.display = 'block';
                    
                    // Reset feedback buttons
                    feedbackHelpful.style.display = 'inline-block';
                    feedbackNotHelpful.style.display = 'inline-block';
                    feedbackThanks.style.display = 'none';
                } else {
                    copyAnswerBtn.style.display = 'none';
                    feedbackSection.style.display = 'none';
                }
            }

            if (recentQuestionsList) {
                recentQuestionsList.innerHTML = ''; 
                
                // Limit to 5 questions for display
                const questionsToDisplay = recentQuestions.slice(-5).reverse();
                const hasMoreQuestions = recentQuestions.length > 5;
                
                if (questionsToDisplay.length === 0) {
                    const li = document.createElement('li');
                    li.textContent = "Your recent questions will appear here.";
                    li.style.justifyContent = 'center';
                    li.style.color = 'var(--text-secondary)';
                    recentQuestionsList.appendChild(li);
                } else {
                    questionsToDisplay.forEach(questionData => {
                        const li = document.createElement('li');
                        li.className = 'question-item answered';
                        
                        // Create question preview (truncate if too long)
                        const questionPreview = questionData.question.length > 60 
                            ? questionData.question.substring(0, 60) + '...'
                            : questionData.question;
                        
                        // Create timestamp
                        const timestamp = questionData.timestamp ? formatTimestamp(questionData.timestamp) : '';
                        
                        li.innerHTML = `
                            <div class="question-content">
                                <div class="question-text">${questionPreview}</div>
                                <div class="question-timestamp">${timestamp}</div>
                            </div>
                            <div class="question-indicators">
                                <span class="status-indicator answered">✓</span>
                                <span class="arrow">→</span>
                            </div>
                        `;

                        li.addEventListener('click', () => {
                            questionInput.value = questionData.question;
                            qaForm.dispatchEvent(new Event('submit', { cancelable: true }));
                        });
                        recentQuestionsList.appendChild(li);
                    });
                }
                
                // Show/hide "View All" button
                if (viewAllContainer) {
                    if (hasMoreQuestions) {
                        viewAllContainer.classList.remove('hidden');
                    } else {
                        viewAllContainer.classList.add('hidden');
                    }
                }
            }
        });
    }

    function formatTimestamp(timestamp) {
        console.log('formatTimestamp called with:', timestamp);
        
        if (!timestamp) {
            console.log('No timestamp provided');
            return '';
        }
        
        try {
            const now = new Date();
            let messageTime;
            
            // Handle different timestamp formats
            if (timestamp.toDate) {
                // Firestore Timestamp object
                messageTime = timestamp.toDate();
                console.log('Firestore timestamp converted to:', messageTime);
            } else if (timestamp.seconds) {
                // Firestore Timestamp with seconds/nanoseconds
                messageTime = new Date(timestamp.seconds * 1000);
                console.log('Firestore timestamp with seconds converted to:', messageTime);
            } else if (timestamp instanceof Date) {
                // Already a Date object
                messageTime = timestamp;
                console.log('Already a Date object:', messageTime);
            } else {
                // Try to parse as string or number
                messageTime = new Date(timestamp);
                console.log('Parsed as Date:', messageTime);
            }
            
            // Check if the date is valid
            if (isNaN(messageTime.getTime())) {
                console.log('Invalid date, returning empty string');
                return '';
            }
            
            const diffInMinutes = Math.floor((now - messageTime) / (1000 * 60));
            console.log('Time difference in minutes:', diffInMinutes);
            
            if (diffInMinutes < 1) return 'Just now';
            if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
            if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
            return `${Math.floor(diffInMinutes / 1440)}d ago`;
            
        } catch (error) {
            console.error('Error formatting timestamp:', error);
            return '';
        }
    }
    function listenForAnalysisResults(uid) {
        const analysesCollectionRef = collection(db, 'users', uid, 'analyses');
        const q = query(analysesCollectionRef, orderBy('created_at', 'desc'));
        unsubscribeAnalyses = onSnapshot(q, (snapshot) => {
            if (!agent2ResultsList) return;
            if (snapshot.empty) {
                agent2ResultsList.innerHTML = '<p class="placeholder">Once the analysis is complete, you\'ll see a detailed report here.</p>';
                updateFinancialDashboard([]);
                return;
            }
            
            const analyses = [];
            agent2ResultsList.innerHTML = '';
            
            snapshot.forEach(doc => {
                const analysis = doc.data();
                analysis.id = doc.id; // Add the document ID to the analysis object
                analyses.push(analysis);
            });
            
            // Get current filter
            const activeFilter = document.querySelector('.filter-btn.active')?.getAttribute('data-filter') || 'all';
            
            // Filter analyses based on current selection
            const filteredAnalyses = filterAnalyses(analyses, activeFilter);
            
            // Display filtered results
            displayAnalyses(filteredAnalyses);
            
            // Update financial dashboard with all analyses (not filtered)
            updateFinancialDashboard(analyses);
        });
    }

    function filterAnalyses(analyses, filter) {
        switch (filter) {
            case 'bills':
                return analyses.filter(analysis => 
                    analysis.financial_data && 
                    analysis.financial_data.document_type === 'bill'
                );
            case 'eobs':
                return analyses.filter(analysis => 
                    analysis.financial_data && 
                    analysis.financial_data.document_type === 'eob'
                );
            case 'flags':
                return analyses.filter(analysis => 
                    analysis.financial_data && 
                    analysis.financial_data.red_flags && 
                    analysis.financial_data.red_flags.length > 0
                );
            case 'all':
            default:
                return analyses;
        }
    }

    function displayAnalyses(analyses) {
        if (!agent2ResultsList) return;
        
        if (analyses.length === 0) {
            agent2ResultsList.innerHTML = '<p class="placeholder">No documents match the current filter.</p>';
            return;
        }
        
        agent2ResultsList.innerHTML = '';
        
        analyses.forEach(analysis => {
            const documentCard = document.createElement('div');
            documentCard.classList.add('document-card');
            
            // Create document header
            const docHeader = document.createElement('div');
            docHeader.classList.add('doc-header');
            
            const docType = document.createElement('div');
            docType.classList.add('doc-type');
            docType.textContent = analysis.financial_data?.document_type === 'eob' ? '📋 EOB Statement' : '📄 Medical Bill';
            docHeader.appendChild(docType);
            
            const docStatus = document.createElement('div');
            docStatus.classList.add('doc-status');
            if (analysis.status === 'completed') {
                docStatus.classList.add('completed');
                docStatus.textContent = 'Analysis Complete';
            } else if (analysis.status === 'failed') {
                docStatus.classList.add('error');
                docStatus.textContent = 'Analysis Failed';
            } else {
                docStatus.classList.add('processing');
                docStatus.textContent = 'Processing';
            }
            docHeader.appendChild(docStatus);
            
            documentCard.appendChild(docHeader);
            
            // Create document preview
            const docPreview = document.createElement('div');
            docPreview.classList.add('doc-preview');
            
            const docTitle = document.createElement('h4');
            docTitle.textContent = analysis.original_filename || 'Unknown Document';
            docPreview.appendChild(docTitle);
            
            if (analysis.status === 'completed') {
                try {
                    const results = JSON.parse(analysis.analysis_results);
                    
                    // Add summary
                    const summaryP = document.createElement('p');
                    summaryP.textContent = results.concise_summary || 'No summary available.';
                    docPreview.appendChild(summaryP);
                    
                    // Add financial data if available
                    if (analysis.financial_data) {
                        const amountP = document.createElement('p');
                        amountP.textContent = `Amount: $${analysis.financial_data.total_charged?.toFixed(2) || '0.00'}`;
                        docPreview.appendChild(amountP);
                        
                        if (analysis.financial_data.insurance_paid !== undefined) {
                            const insuranceP = document.createElement('p');
                            insuranceP.textContent = `Insurance Paid: $${analysis.financial_data.insurance_paid.toFixed(2)}`;
                            docPreview.appendChild(insuranceP);
                        }
                        
                        if (analysis.financial_data.patient_owed !== undefined) {
                            const owedP = document.createElement('p');
                            owedP.textContent = `Your Responsibility: $${analysis.financial_data.patient_owed.toFixed(2)}`;
                            docPreview.appendChild(owedP);
                        }
                        
                        // Add status based on red flags
                        const statusP = document.createElement('p');
                        if (analysis.financial_data.red_flags && analysis.financial_data.red_flags.length > 0) {
                            statusP.textContent = `Status: Red flags detected - ${analysis.financial_data.red_flags.join(', ')}`;
                        } else {
                            statusP.textContent = 'Status: Coverage applied correctly';
                        }
                        docPreview.appendChild(statusP);
                    }
                    
                } catch (e) {
                    console.error("Error parsing analysis JSON:", e);
                    const errorP = document.createElement('p');
                    errorP.textContent = 'Error: Could not display analysis results.';
                    docPreview.appendChild(errorP);
                }
            } else if (analysis.status === 'failed') {
                const errorP = document.createElement('p');
                errorP.textContent = `Status: Analysis failed - ${analysis.error_message || 'Unknown error'}`;
                docPreview.appendChild(errorP);
            } else {
                const processingP = document.createElement('p');
                processingP.textContent = 'Status: Currently being analyzed...';
                docPreview.appendChild(processingP);
            }
            
            documentCard.appendChild(docPreview);
            
            // Create document actions
            const docActions = document.createElement('div');
            docActions.classList.add('doc-actions');
            
            const viewDetailsBtn = document.createElement('button');
            viewDetailsBtn.classList.add('btn-small');
            viewDetailsBtn.textContent = 'View Details';
            viewDetailsBtn.disabled = analysis.status !== 'completed';
            viewDetailsBtn.addEventListener('click', () => showDocumentDetails(analysis));
            docActions.appendChild(viewDetailsBtn);
            
            const askQuestionsBtn = document.createElement('button');
            askQuestionsBtn.classList.add('btn-small');
            askQuestionsBtn.textContent = 'Ask Questions';
            askQuestionsBtn.disabled = analysis.status !== 'completed';
            askQuestionsBtn.addEventListener('click', () => {
                console.log('--- DEBUG: Analysis object:', analysis);
                console.log('--- DEBUG: Analysis ID:', analysis.id);
                const documentData = {
                    type: analysis.financial_data?.document_type === 'eob' ? 'EOB Statement' : 'Medical Bill',
                    filename: analysis.original_filename,
                    analysis: analysis
                };
                showQAModal(analysis.id, documentData);
            });
            docActions.appendChild(askQuestionsBtn);
            
            // Add dispute button for bills with red flags
            if (analysis.status === 'completed' && analysis.financial_data?.red_flags?.length > 0) {
                const disputeBtn = document.createElement('button');
                disputeBtn.classList.add('btn-small');
                disputeBtn.textContent = 'Dispute Charges';
                docActions.appendChild(disputeBtn);
            }
            
            documentCard.appendChild(docActions);
            
            agent2ResultsList.appendChild(documentCard);
        });
    }

    function updateFinancialDashboard(analyses) {
        // Calculate totals from all analyses
        let totalCharged = 0;
        let totalInsurancePaid = 0;
        let totalPatientOwed = 0;
        let totalRedFlags = 0;
        let redFlagAmount = 0;
        
        analyses.forEach(analysis => {
            if (analysis.financial_data) {
                const fd = analysis.financial_data;
                totalCharged += fd.total_charged || 0;
                totalInsurancePaid += fd.insurance_paid || 0;
                totalPatientOwed += fd.patient_owed || 0;
                
                // Count red flags and their associated amounts
                if (fd.red_flags && fd.red_flags.length > 0) {
                    totalRedFlags += fd.red_flags.length;
                    // If there are red flags, consider the patient owed amount as potentially problematic
                    redFlagAmount += fd.patient_owed || 0;
                }
            }
        });
        
        // Update metric cards
        const metricCards = document.querySelectorAll('.metric-card');
        metricCards.forEach(card => {
            const amountElement = card.querySelector('.amount');
            const percentageElement = card.querySelector('.percentage');
            const trendElement = card.querySelector('.trend');
            
            if (amountElement) {
                const cardTitle = card.querySelector('h4').textContent;
                
                switch (cardTitle) {
                    case 'Total Charges':
                        amountElement.textContent = `$${totalCharged.toFixed(2)}`;
                        if (trendElement) {
                            trendElement.textContent = analyses.length > 0 ? `${analyses.length} document(s) processed` : 'No documents yet';
                        }
                        break;
                    case 'Insurance Paid':
                        amountElement.textContent = `$${totalInsurancePaid.toFixed(2)}`;
                        if (percentageElement) {
                            const percentage = totalCharged > 0 ? (totalInsurancePaid / totalCharged * 100) : 0;
                            percentageElement.textContent = `${percentage.toFixed(1)}%`;
                        }
                        break;
                    case 'Your Responsibility':
                        amountElement.textContent = `$${totalPatientOwed.toFixed(2)}`;
                        if (percentageElement) {
                            const percentage = totalCharged > 0 ? (totalPatientOwed / totalCharged * 100) : 0;
                            percentageElement.textContent = `${percentage.toFixed(1)}%`;
                        }
                        break;
                    case 'Red Flags':
                        amountElement.textContent = `$${redFlagAmount.toFixed(2)}`;
                        if (percentageElement) {
                            const percentage = totalCharged > 0 ? (redFlagAmount / totalCharged * 100) : 0;
                            percentageElement.textContent = `${percentage.toFixed(1)}% of total`;
                        }
                        break;
                }
            }
        });
        
        // Update category stats
        const categoryStats = document.querySelectorAll('.category-stats .stat');
        categoryStats.forEach(stat => {
            const categoryZone = stat.closest('.category-zone');
            if (categoryZone) {
                const category = categoryZone.getAttribute('data-category');
                const count = analyses.filter(analysis => 
                    analysis.financial_data && 
                    analysis.financial_data.document_type === category
                ).length;
                stat.textContent = `${count} document${count !== 1 ? 's' : ''}`;
            }
        });
    }


    // --- EVENT LISTENERS ---
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = signupForm['signup-email'].value;
            const password = signupForm['signup-password'].value;
            createUserWithEmailAndPassword(auth, email, password)
                .then((userCredential) => {
                    const userDocRef = doc(db, 'users', userCredential.user.uid);
                    return setDoc(userDocRef, {
                        email: email,
                        createdAt: serverTimestamp(),
                        subscriptionTier: 'free'
                    });
                })
                .catch(error => {
                    if (error.code === 'auth/email-already-in-use') {
                        signupMessage.textContent = 'This email address is already in use. Please log in or use a different email.';
                    } else {
                        signupMessage.textContent = error.message;
                    }
                });
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = loginForm['login-email'].value;
            const password = loginForm['login-password'].value;
            signInWithEmailAndPassword(auth, email, password)
                .catch(error => { loginMessage.textContent = error.message; });
        });
    }

    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = resetPasswordForm['reset-email'].value;
            sendPasswordResetEmail(auth, email)
                .then(() => {
                    resetMessage.textContent = 'Password reset email sent! Please check your inbox.';
                    resetMessage.style.color = 'green';
                })
                .catch((error) => {
                    resetMessage.textContent = error.message;
                    resetMessage.style.color = 'red';
                });
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            signOut(auth).catch(error => console.error("Logout error:", error));
        });
    }

    // User menu functionality
    const userMenuToggle = document.getElementById('user-menu-toggle');
    const userMenuDropdown = document.getElementById('user-menu-dropdown');
    
    if (userMenuToggle && userMenuDropdown) {
        userMenuToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            userMenuToggle.classList.toggle('active');
            userMenuDropdown.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!userMenuToggle.contains(e.target) && !userMenuDropdown.contains(e.target)) {
                userMenuToggle.classList.remove('active');
                userMenuDropdown.classList.remove('show');
            }
        });
    }
    
    // Modal event listeners
    if (closeModal) {
        closeModal.addEventListener('click', closeDocumentModal);
    }
    
    // Dispute detail modal event listeners
    if (closeDisputeModal) {
        closeDisputeModal.addEventListener('click', () => {
            disputeDetailModal.classList.add('hidden');
        });
    }
    
    if (disputeDetailModal) {
        disputeDetailModal.addEventListener('click', (e) => {
            if (e.target === disputeDetailModal) {
                disputeDetailModal.classList.add('hidden');
            }
        });
    }
    
    if (documentDetailsModal) {
        // Close modal when clicking overlay
        documentDetailsModal.addEventListener('click', (e) => {
            if (e.target === documentDetailsModal) {
                closeDocumentModal();
            }
        });
        
        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !documentDetailsModal.classList.contains('hidden')) {
                closeDocumentModal();
            }
        });
    }

    if (qaForm) {
        qaForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const question = questionInput.value;
            if (!question) return;
            
            // Add user message bubble
            addMessageToChat('user', question);
            
            // Show thinking message
            addMessageToChat('ai', 'Thinking...', true);
            
            questionInput.value = '';
            const user = auth.currentUser;
            if (user) {
                user.getIdToken()
                    .then(idToken => fetch(`${BACKEND_URL}/ask-agent1`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                        body: JSON.stringify({ question: question, history: agent1ChatHistory })
                    }))
                    .then(response => response.json())
                    .then(data => {
                        const ai_answer = data.answer || "Sorry, I received an empty answer.";
                        
                        // Remove thinking message and add AI response
                        removeThinkingMessage();
                        addMessageToChat('ai', ai_answer);
                        
                        const chatHistoryCollectionRef = collection(db, 'users', user.uid, 'chat_history');
                        addDoc(chatHistoryCollectionRef, {
                            question: question,
                            answer: ai_answer,
                            created_at: serverTimestamp()
                        });
                    })
                    .catch(error => {
                        removeThinkingMessage();
                        addMessageToChat('ai', `Error: ${error.message}`);
                    });
            }
        });
    }

    // Agent 2: Upload Logic
    if(browseFilesButton) {
        browseFilesButton.addEventListener('click', () => fileInput.click());
    }
    if(fileInput) {
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                 uploadForm.dispatchEvent(new Event('submit', { cancelable: true }));
            }
        });
    }
    if (uploadForm) {
        uploadForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const file = fileInput.files[0];
            if (!file) return;

            // Update UI for upload process
            updateProcessingStage('upload');
            if (analysisStatus) analysisStatus.textContent = 'Uploading...';
            addMessageToAgent2Chat('ai', 'Starting upload process...');

            const user = auth.currentUser;
            if (user) {
                user.getIdToken().then(idToken => {
                    const formData = new FormData();
                    formData.append('document', file);
                    return fetch(`${BACKEND_URL}/upload-document`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${idToken}` },
                        body: formData
                    });
                })
                .then(response => {
                    if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`);
                    return response.json();
                })
                .then(data => {
                    // Update UI for analysis process
                    updateProcessingStage('analyzing');
                    if (analysisStatus) analysisStatus.textContent = 'Analyzing Documents';
                    addMessageToAgent2Chat('ai', `File uploaded successfully! Now analyzing "${file.name}"...`);
                    
                    // Simulate analysis process (replace with real AI analysis later)
                    setTimeout(() => {
                        updateProcessingStage('calculating');
                        if (analysisStatus) analysisStatus.textContent = 'Calculating Results';
                        addMessageToAgent2Chat('ai', 'Extracting financial data and identifying potential issues...');
                        
                        setTimeout(() => {
                            updateProcessingStage('complete');
                            if (analysisStatus) analysisStatus.textContent = 'Analysis Complete';
                            addMessageToAgent2Chat('ai', 'Analysis complete! I found some interesting insights in your document.');
                            
                            // Update category stats
                            updateCategoryStats();
                            
                        }, 2000);
                    }, 2000);
                    
                    uploadForm.reset();
                })
                .catch(error => {
                    if (analysisStatus) analysisStatus.textContent = 'Error';
                    addMessageToAgent2Chat('ai', `Error: ${error.message}`);
                });
            }
        });
    }
    
    // Helper function to update category stats
    function updateCategoryStats() {
        const categoryStats = document.querySelectorAll('.category-stats .stat');
        categoryStats.forEach(stat => {
            const currentText = stat.textContent;
            const match = currentText.match(/(\d+)/);
            if (match) {
                const currentCount = parseInt(match[1]);
                stat.textContent = `${currentCount + 1} documents`;
            } else {
                stat.textContent = '1 document';
            }
        });
    }
    
    // Modal functionality
    function showDocumentDetails(analysis) {
        if (!documentDetailsModal || !modalTitle || !modalContent) return;
        
        // Set modal title
        modalTitle.textContent = `Document Details: ${analysis.original_filename}`;
        
                    // Generate modal content
            const content = generateModalContent(analysis);
            modalContent.innerHTML = content;
            
            // Show modal
            documentDetailsModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        }
    
    function closeDocumentModal() {
        if (!documentDetailsModal) return;
        
        documentDetailsModal.classList.add('hidden');
        document.body.style.overflow = ''; // Restore scrolling
    }
    
    function generateModalContent(analysis) {
        let content = '';
        
        try {
            const results = JSON.parse(analysis.analysis_results);
            const financialData = analysis.financial_data || {};
            
            // Document Summary Section
            content += `
                <div class="modal-section">
                    <h4>📄 Document Summary</h4>
                    <p><strong>File:</strong> ${analysis.original_filename}</p>
                    <p><strong>Type:</strong> ${financialData.document_type === 'eob' ? 'EOB Statement' : 'Medical Bill'}</p>
                    <p><strong>Provider:</strong> ${financialData.provider || 'Not specified'}</p>
                    <p><strong>Date of Service:</strong> ${financialData.date_of_service || 'Not specified'}</p>
                    <p><strong>Account Number:</strong> ${financialData.account_number || 'Not specified'}</p>
                </div>
            `;
            
            // Analysis Summary Section
            if (results.concise_summary) {
                content += `
                    <div class="modal-section">
                        <h4>📋 Analysis Summary</h4>
                        <p>${results.concise_summary}</p>
                    </div>
                `;
            }
            
            // Financial Breakdown Section
            if (financialData.total_charged > 0 || financialData.insurance_paid > 0 || financialData.patient_owed > 0) {
                content += `
                    <div class="modal-section">
                        <h4>💰 Financial Breakdown</h4>
                        <table class="financial-table">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Total Charged</td>
                                    <td class="amount">$${financialData.total_charged?.toFixed(2) || '0.00'}</td>
                                </tr>
                                <tr>
                                    <td>Insurance Paid</td>
                                    <td class="amount">$${financialData.insurance_paid?.toFixed(2) || '0.00'}</td>
                                </tr>
                                <tr>
                                    <td>Your Responsibility</td>
                                    <td class="amount">$${financialData.patient_owed?.toFixed(2) || '0.00'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                `;
            }
            
            // Red Flags Section
            if (financialData.red_flags && financialData.red_flags.length > 0) {
                content += `
                    <div class="modal-section">
                        <h4>🚨 Red Flags Detected</h4>
                        <ul class="red-flags-list">
                `;
                
                financialData.red_flags.forEach(flag => {
                    content += `<li>${flag}</li>`;
                });
                
                content += `
                        </ul>
                    </div>
                `;
            }
            
            // Detailed Analysis Section
            if (results.initial_analysis) {
                content += `
                    <div class="modal-section">
                        <h4>🔍 Detailed Analysis</h4>
                        <p>${results.initial_analysis}</p>
                    </div>
                `;
            }
            
            // Recommendations Section
            if (results.recommendations && results.recommendations.length > 0) {
                content += `
                    <div class="modal-section">
                        <h4>💡 Recommendations</h4>
                        <ul class="recommendations-list">
                `;
                
                results.recommendations.forEach(rec => {
                    content += `<li>${rec}</li>`;
                });
                
                content += `
                        </ul>
                    </div>
                `;
            }
            
        } catch (e) {
            console.error("Error generating modal content:", e);
            content = `
                <div class="modal-section">
                    <h4>❌ Error</h4>
                    <p>Could not load document details. Please try again.</p>
                </div>
            `;
        }
        
        return content;
    }

    // New Agent 2: Category Upload Logic
    categoryUploads.forEach(uploadZone => {
        uploadZone.addEventListener('click', () => {
            fileInput.click();
        });
        
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.style.borderColor = 'var(--primary-blue)';
            uploadZone.style.backgroundColor = 'var(--background-card)';
        });
        
        uploadZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadZone.style.borderColor = 'var(--border-color)';
            uploadZone.style.backgroundColor = 'transparent';
        });
        
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.style.borderColor = 'var(--border-color)';
            uploadZone.style.backgroundColor = 'transparent';
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files;
                uploadForm.dispatchEvent(new Event('submit', { cancelable: true }));
            }
        });
    });

    browseCategoryButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.click();
        });
    });

    // Filter functionality - moved inside DOMContentLoaded
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            console.log('Filter button clicked:', button.getAttribute('data-filter'));
            
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            button.classList.add('active');
            
            const filter = button.getAttribute('data-filter');
            console.log('Filter selected:', filter);
            
            // Trigger re-filtering of current data
            if (auth.currentUser) {
                // Re-trigger the analysis listener to apply the new filter
                const analysesCollectionRef = collection(db, 'users', auth.currentUser.uid, 'analyses');
                const q = query(analysesCollectionRef, orderBy('created_at', 'desc'));
                
                // Get current data and re-filter
                getDocs(q).then(snapshot => {
                    const analyses = [];
                    snapshot.forEach(doc => {
                        const analysis = doc.data();
                        analysis.id = doc.id; // Add the document ID to the analysis object
                        analyses.push(analysis);
                    });
                    
                    console.log('Total analyses found:', analyses.length);
                    const filteredAnalyses = filterAnalyses(analyses, filter);
                    console.log('Filtered analyses:', filteredAnalyses.length);
                    displayAnalyses(filteredAnalyses);
                }).catch(error => {
                    console.error('Error fetching analyses:', error);
                });
            }
        });
    });

    // Date filter functionality
    if (dateFilter) {
        dateFilter.addEventListener('change', () => {
            const selectedRange = dateFilter.value;
            console.log('Date range selected:', selectedRange);
            // For now, just log the selection - we'll implement actual filtering when backend supports it
        });
    }

    // Agent 1: Clear History functionality
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to clear your question history? This action cannot be undone.')) {
                if (auth.currentUser) {
                    try {
                        // Show loading state
                        clearHistoryBtn.textContent = 'Clearing...';
                        clearHistoryBtn.disabled = true;
                        
                        // Get all chat history documents
                        const chatHistoryCollectionRef = collection(db, 'users', auth.currentUser.uid, 'chat_history');
                        const snapshot = await getDocs(chatHistoryCollectionRef);
                        
                        // Delete all documents
                        const deletePromises = snapshot.docs.map(doc => {
                            return deleteDoc(doc.ref);
                        });
                        
                        await Promise.all(deletePromises);
                        
                        // Clear local state
                        agent1ChatHistory = [];
                        
                        // Update UI
                        if (recentQuestionsList) {
                            recentQuestionsList.innerHTML = '<li style="justify-content: center; color: var(--text-secondary);">Your recent questions will appear here.</li>';
                        }
                        if (viewAllContainer) {
                            viewAllContainer.classList.add('hidden');
                        }
                        // Clear chat messages and show welcome message
                        if (chatMessages) {
                            chatMessages.innerHTML = `
                                <div class="message ai-message">
                                    <div class="message-bubble">
                                        <p>Hi there! 👋 I'm here to help you with your medical billing and insurance questions. Ask me anything about claims, denials, coverage, or billing disputes.</p>
                                    </div>
                                </div>
                            `;
                        }
                        
                        // Reset button
                        clearHistoryBtn.textContent = 'Clear History';
                        clearHistoryBtn.disabled = false;
                        
                        console.log('Chat history cleared successfully');
                        
                    } catch (error) {
                        console.error('Error clearing chat history:', error);
                        alert('Error clearing chat history. Please try again.');
                        
                        // Reset button on error
                        clearHistoryBtn.textContent = 'Clear History';
                        clearHistoryBtn.disabled = false;
                    }
                }
            }
        });
    }

    // Agent 1: View All Questions functionality
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', () => {
            // For now, just show a message. In a full implementation, this would show a modal with all questions
            alert('View All functionality would show all your questions in a modal or expanded view. This requires additional UI implementation.');
        });
    }

    // Agent 1: Question Chips functionality
    const questionChips = document.querySelectorAll('.question-chip');
    questionChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const question = chip.getAttribute('data-question');
            if (questionInput && question) {
                questionInput.value = question;
                questionInput.focus();
                
                // Optional: Auto-submit the question
                // qaForm.dispatchEvent(new Event('submit', { cancelable: true }));
            }
        });
    });

    // Agent 1: Copy Answer functionality
    if (copyAnswerBtn) {
        copyAnswerBtn.addEventListener('click', async () => {
            try {
                // Get the last AI message from chat
                const lastAiMessage = chatMessages ? chatMessages.querySelector('.ai-message:last-child .message-bubble p') : null;
                const answerText = lastAiMessage ? lastAiMessage.textContent : '';
                
                if (answerText && answerText !== 'Hi there! 👋 I\'m here to help you with your medical billing and insurance questions. Ask me anything about claims, denials, coverage, or billing disputes.') {
                    await navigator.clipboard.writeText(answerText);
                    
                    // Show success feedback
                    const originalText = copyAnswerBtn.textContent;
                    copyAnswerBtn.textContent = '✅ Copied!';
                    copyAnswerBtn.style.color = '#10B981';
                    
                    setTimeout(() => {
                        copyAnswerBtn.textContent = originalText;
                        copyAnswerBtn.style.color = '';
                    }, 2000);
                    
                    console.log('Answer copied to clipboard');
                }
            } catch (error) {
                console.error('Failed to copy answer:', error);
                alert('Failed to copy answer. Please try again.');
            }
        });
    }

    // Agent 1: Feedback functionality
    if (feedbackHelpful) {
        feedbackHelpful.addEventListener('click', () => {
            handleFeedback('helpful');
        });
    }

    if (feedbackNotHelpful) {
        feedbackNotHelpful.addEventListener('click', () => {
            handleFeedback('not-helpful');
        });
    }

    function handleFeedback(type) {
        // Hide feedback buttons
        feedbackHelpful.style.display = 'none';
        feedbackNotHelpful.style.display = 'none';
        
        // Show thank you message
        feedbackThanks.style.display = 'block';
        
        // Log feedback (in a real app, this would be sent to your backend)
        console.log(`Feedback received: ${type}`);
        
        // Store feedback in localStorage to prevent showing again for this answer
        const lastAiMessage = chatMessages ? chatMessages.querySelector('.ai-message:last-child .message-bubble p') : null;
        const currentAnswer = lastAiMessage ? lastAiMessage.textContent : '';
        if (currentAnswer) {
            const feedbackKey = `feedback_${btoa(currentAnswer.substring(0, 50))}`;
            localStorage.setItem(feedbackKey, type);
        }
        
        // Hide feedback section after 3 seconds
        setTimeout(() => {
            feedbackSection.style.display = 'none';
        }, 3000);
    }

    upgradeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const plan = button.getAttribute('data-plan');
            
            // Free plan - always show signup modal
            if (plan === 'free') {
                showModal('signup');
                return;
            }
            
            // Paid plans - check authentication first
            if (!auth.currentUser) {
                showModal('login');
                return;
            }

            // User is authenticated - proceed to Stripe checkout
            auth.currentUser.getIdToken().then(idToken => {
                fetch(`${BACKEND_URL}/create-checkout-session`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify({ plan: plan })
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(session => {
                    return stripe.redirectToCheckout({ sessionId: session.id });
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('There was an error creating your checkout session. Please try again.');
                });
            });
        });
    });

    // Placeholder for Agent 3 form
    const agent3Form = document.getElementById('agent3-challenge-form');
    
    // Q&A Modal Event Listeners
    if (closeQAModalBtn) {
        closeQAModalBtn.addEventListener('click', closeQAModal);
    }
    
    if (qaModal) {
        qaModal.addEventListener('click', (e) => {
            if (e.target === qaModal) {
                closeQAModal();
            }
        });
    }
    
    if (qaSubmit) {
        qaSubmit.addEventListener('click', () => {
            const question = qaQuestion ? qaQuestion.value.trim() : '';
            if (question) {
                askDocumentQuestion(question);
                qaQuestion.value = '';
            }
        });
    }
    
    if (qaQuestion) {
        qaQuestion.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const question = qaQuestion.value.trim();
                if (question) {
                    askDocumentQuestion(question);
                    qaQuestion.value = '';
                }
            }
        });
    }
    
    // Q&A Modal functionality
    function showQAModal(documentId, documentData) {
        console.log('--- DEBUG: showQAModal called with documentId:', documentId);
        console.log('--- DEBUG: documentData:', documentData);
        
        if (!qaModal || !qaMessages) return;
        
        // Clear previous messages
        qaMessages.innerHTML = '';
        
        // Add welcome message
        const welcomeMessage = `
            <div class="qa-message ai">
                <div class="qa-message-bubble">
                    <strong>Document Assistant</strong><br>
                    I can help you understand this ${documentData.type || 'document'}. Ask me anything about the charges, codes, or any confusing terms you see.
                </div>
            </div>
        `;
        qaMessages.innerHTML = welcomeMessage;
        
        // Store document context for Q&A
        qaModal.dataset.documentId = documentId;
        qaModal.dataset.documentData = JSON.stringify(documentData);
        
        console.log('--- DEBUG: Stored documentId in dataset:', qaModal.dataset.documentId);
        
        // Show modal
        qaModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
    
    function closeQAModal() {
        if (!qaModal) return;
        
        qaModal.classList.add('hidden');
        document.body.style.overflow = '';
        
        // Clear input
        if (qaQuestion) qaQuestion.value = '';
    }
    
    function addQAMessage(sender, message, isAgent3Handoff = false) {
        if (!qaMessages) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `qa-message ${sender}`;
        
        let bubbleContent = `<div class="qa-message-bubble">${message}</div>`;
        
        // Add Agent 3 handoff if needed
        if (isAgent3Handoff) {
            bubbleContent += `
                <div class="agent3-handoff">
                    <h4>🚨 Dispute Resolution Available</h4>
                    <p>I can help you dispute this bill! Our Dispute Resolution Agent can challenge incorrect charges and potentially save you money.</p>
                    <div class="agent3-handoff-buttons">
                        <button class="btn-primary" onclick="transferToAgent3()">Transfer to Dispute Agent</button>
                        <button class="btn-secondary" onclick="continueQASession()">Continue Q&A</button>
                    </div>
                </div>
            `;
        }
        
        messageDiv.innerHTML = bubbleContent;
        qaMessages.appendChild(messageDiv);
        qaMessages.scrollTop = qaMessages.scrollHeight;
    }
    
    async function askDocumentQuestion(question) {
        const documentId = qaModal.dataset.documentId;
        const documentData = JSON.parse(qaModal.dataset.documentData || '{}');
        
        console.log('--- DEBUG: askDocumentQuestion called with question:', question);
        console.log('--- DEBUG: Retrieved documentId from dataset:', documentId);
        console.log('--- DEBUG: Retrieved documentData from dataset:', documentData);
        
        if (!documentId || !question.trim()) return;
        
        // Add user question to chat
        addQAMessage('user', question);
        
        // Show thinking indicator
        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'qa-message ai';
        thinkingDiv.innerHTML = '<div class="qa-message-bubble">Thinking...</div>';
        qaMessages.appendChild(thinkingDiv);
        qaMessages.scrollTop = qaMessages.scrollHeight;
        
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');
            
            const idToken = await user.getIdToken();
            const response = await fetch(`${BACKEND_URL}/api/document-qa`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    documentId: documentId,
                    question: question
                })
            });
            
            if (!response.ok) throw new Error('Failed to get answer');
            
            const data = await response.json();
            
            // Remove thinking indicator
            qaMessages.removeChild(thinkingDiv);
            
            // Add AI response
            addQAMessage('ai', data.answer, data.dispute_intent);
            
        } catch (error) {
            // Remove thinking indicator
            qaMessages.removeChild(thinkingDiv);
            
            // Add error message
            addQAMessage('ai', `Sorry, I couldn't process your question. Please try again.`);
            console.error('Q&A Error:', error);
        }
    }
    
    function transferToAgent3() {
        // Store document context for Agent 3
        const documentId = qaModal.dataset.documentId;
        const documentData = JSON.parse(qaModal.dataset.documentData || '{}');
        
        // Store in session storage for Agent 3
        sessionStorage.setItem('agent3_document_context', JSON.stringify({
            documentId: documentId,
            documentData: documentData,
            source: 'agent2_qa'
        }));
        
        // Close Q&A modal
        closeQAModal();
        
        // Navigate to Agent 3
        showPage('agent-3-page');
        
        // Show success message
        setTimeout(() => {
            alert('Successfully transferred to Dispute Resolution Agent! Your document context has been preserved.');
        }, 100);
    }
    
    function continueQASession() {
        // Remove the handoff UI and continue with Q&A
        const handoffElement = qaMessages.querySelector('.agent3-handoff');
        if (handoffElement) {
            handoffElement.remove();
        }
    }
    if (agent3Form) {
        agent3Form.addEventListener('submit', (e) => {
            e.preventDefault();
            alert("Agent 3 functionality is coming soon!");
        });
    }

    // Make functions globally available for onclick handlers
    window.transferToAgent3 = transferToAgent3;
    window.continueQASession = continueQASession;
});