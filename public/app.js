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
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('analysis-item');
            
            const filenameP = document.createElement('p');
            filenameP.innerHTML = `<strong>File:</strong> ${analysis.original_filename || 'Unknown File'}`;
            itemDiv.appendChild(filenameP);

            if (analysis.status === 'completed') {
                try {
                    const results = JSON.parse(analysis.analysis_results);
                    
                    const summaryP = document.createElement('p');
                    summaryP.innerHTML = `<strong>Summary:</strong> ${results.concise_summary || 'Not available.'}`;
                    itemDiv.appendChild(summaryP);

                    const analysisHeader = document.createElement('p');
                    analysisHeader.innerHTML = `<strong>Initial Analysis:</strong>`;
                    itemDiv.appendChild(analysisHeader);

                    const analysisP = document.createElement('p');
                    analysisP.textContent = results.initial_analysis || 'No analysis provided.';
                    itemDiv.appendChild(analysisP);

                    // Add financial data display if available
                    if (analysis.financial_data) {
                        const financialDiv = document.createElement('div');
                        financialDiv.classList.add('financial-summary');
                        financialDiv.innerHTML = `
                            <p><strong>Financial Summary:</strong></p>
                            <ul>
                                <li>Total Charged: $${analysis.financial_data.total_charged?.toFixed(2) || '0.00'}</li>
                                <li>Insurance Paid: $${analysis.financial_data.insurance_paid?.toFixed(2) || '0.00'}</li>
                                <li>Patient Owed: $${analysis.financial_data.patient_owed?.toFixed(2) || '0.00'}</li>
                                ${analysis.financial_data.red_flags?.length > 0 ? 
                                    `<li>Red Flags: ${analysis.financial_data.red_flags.join(', ')}</li>` : ''}
                            </ul>
                        `;
                        itemDiv.appendChild(financialDiv);
                    }

                } catch (e) {
                    console.error("Error parsing analysis JSON:", e);
                    const errorP = document.createElement('p');
                    errorP.innerHTML = `<strong>Error:</strong> Could not display analysis results due to a formatting issue.`;
                    itemDiv.appendChild(errorP);
                }
            } else if (analysis.status === 'failed') {
                const errorP = document.createElement('p');
                errorP.innerHTML = `<strong>Status:</strong> <span style="color: red;">Failed</span> - ${analysis.error_message || 'Unknown error'}`;
                itemDiv.appendChild(errorP);
            }

            agent2ResultsList.appendChild(itemDiv);
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

            agent2ProgressContainer.classList.remove('hidden');
            agent2StatusMessage.textContent = 'Uploading...';
    
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
                    agent2StatusMessage.textContent = 'File uploaded! Agent is analyzing it now. Results will appear below when ready.';
                    uploadForm.reset();
                    setTimeout(() => agent2ProgressContainer.classList.add('hidden'), 5000);
                })
                .catch(error => {
                    agent2StatusMessage.textContent = `Error: ${error.message}`;
                    setTimeout(() => agent2ProgressContainer.classList.add('hidden'), 5000);
                });
            }
        });
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
                        analyses.push(doc.data());
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
    if (agent3Form) {
        agent3Form.addEventListener('submit', (e) => {
            e.preventDefault();
            alert("Agent 3 functionality is coming soon!");
        });
    }
});