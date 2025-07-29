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
    getDoc
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

        // Initialize Stripe - TEST MODE for local development
        const stripe = Stripe('pk_test_51Q1BbeH0nOEj29DyC8yCJIq8elEieHjz3f2LaUAPFILAk0TR1SfqrWdNNNeprOEpEfCjtQLWP15yDykhXEzugu1200z3flyMhO');

        // Backend URL configuration
        const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
            ? 'http://127.0.0.1:5000' 
            : 'https://healthcareagentic-backend-skqlaykqgq-uc.a.run.app'; 

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
    const answerBox = document.getElementById('agent1-answer');
    const recentQuestionsList = document.getElementById('recent-questions-list');
    
    // Agent 2 elements
    const uploadForm = document.getElementById('agent2-upload-form');
    const fileInput = document.getElementById('document-upload');
    const browseFilesButton = document.getElementById('browse-files-button');
    const agent2ProgressContainer = document.getElementById('agent2-progress-container');
    const agent2StatusMessage = document.getElementById('agent2-status-message');
    const agent2ResultsList = document.getElementById('agent2-results-list');

    let agent1ChatHistory = [];
    let unsubscribeAnalyses = null;
    let unsubscribeChatHistory = null;
    let currentUserSubscriptionTier = 'free';
    
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
                    <h2>🔒 Unlock Premium Agents</h2>
                    <p>This agent requires a Complete Care subscription to access.</p>
                </div>
                <div class="upgrade-prompt-features">
                    <h3>What you'll get with Complete Care:</h3>
                    <ul>
                        <li>✅ Bill & Claim Analysis Agent</li>
                        <li>✅ Challenge Bills Agent (Coming Soon)</li>
                        <li>✅ Fight Denials Agent (Coming Soon)</li>
                        <li>✅ Unlimited Document Uploads</li>
                        <li>✅ Priority Email Support</li>
                    </ul>
                </div>
                <div class="upgrade-prompt-actions">
                    <button class="btn-primary upgrade-now-btn">Upgrade Now - $7.99/month</button>
                    <button class="btn-secondary upgrade-yearly-btn">Save 17% - $79/year</button>
                    <button class="btn-text close-upgrade-prompt-btn">Maybe Later</button>
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
        showLandingPage('resources');
    });

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
        card.addEventListener('click', () => {
            const pageId = card.getAttribute('data-page');
            const isLocked = pageId !== 'agent-1-page' && currentUserSubscriptionTier === 'free';
            
            if (isLocked) {
                showUpgradePrompt();
            } else {
                showAppPage(pageId);
            }
        });
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
                        recentQuestions.push(message.question);
                    }
                });
            }

            if (answerBox) answerBox.innerHTML = fullChatHtml;

            if (recentQuestionsList) {
                recentQuestionsList.innerHTML = ''; 
                const questionsToDisplay = recentQuestions.slice(-3).reverse();
                
                if (questionsToDisplay.length === 0) {
                    const li = document.createElement('li');
                    li.textContent = "Your recent questions will appear here.";
                    li.style.justifyContent = 'center';
                    li.style.color = 'var(--text-secondary)';
                    recentQuestionsList.appendChild(li);
                } else {
                    questionsToDisplay.forEach(question => {
                        const li = document.createElement('li');
                        li.textContent = question;
                        const arrowSpan = document.createElement('span');
                        arrowSpan.classList.add('arrow');
                        arrowSpan.innerHTML = '&rarr;';
                        li.appendChild(arrowSpan);

                        li.addEventListener('click', () => {
                            questionInput.value = question;
                            qaForm.dispatchEvent(new Event('submit', { cancelable: true }));
                        });
                        recentQuestionsList.appendChild(li);
                    });
                }
            }
        });
    }
    function listenForAnalysisResults(uid) {
        const analysesCollectionRef = collection(db, 'users', uid, 'analyses');
        const q = query(analysesCollectionRef, orderBy('created_at', 'desc'));
        unsubscribeAnalyses = onSnapshot(q, (snapshot) => {
            if (!agent2ResultsList) return;
            if (snapshot.empty) {
                agent2ResultsList.innerHTML = '<p class="placeholder">Once the analysis is complete, you\'ll see a detailed report here.</p>';
                return;
            }
            agent2ResultsList.innerHTML = '';
            snapshot.forEach(doc => {
                const analysis = doc.data();
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

    if (qaForm) {
        qaForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const question = questionInput.value;
            if (!question) return;
            answerBox.innerHTML = '<p class="placeholder">Thinking...</p>';
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
                        const chatHistoryCollectionRef = collection(db, 'users', user.uid, 'chat_history');
                        addDoc(chatHistoryCollectionRef, {
                            question: question,
                            answer: ai_answer,
                            created_at: serverTimestamp()
                        });
                    })
                    .catch(error => {
                        answerBox.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
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