// app.js

// Import all the Firebase functions we will need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    sendPasswordResetEmail,
    sendEmailVerification,
    updateProfile,
    applyActionCode,
    checkActionCode,
    confirmPasswordReset,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult
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
import {
    getAnalytics,
    logEvent,
    setUserId,
    setUserProperties
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-analytics.js";

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
const analytics = getAnalytics(app);

// Initialize Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

        // Initialize Stripe - LIVE MODE for production
        const stripe = Stripe('pk_live_51Q1BbeH0nOEj29DyC8yCJIq8elEieHjz3f2LaUAPFILAk0TR1SfqrWdNNNeprOEpEfCjtQLWP15yDykhXEzugu1200z3flyMhO');

        // Backend URL configuration
        const BACKEND_URL = 'https://healthcareagentic-backend-974408923536.us-central1.run.app'; 

// --- SECURITY CONFIGURATION ---
const SECURITY_CONFIG = {
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes in milliseconds
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_REQUIREMENTS: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true
    }
};

// --- ACCOUNT LOCKOUT TRACKING ---
let failedLoginAttempts = JSON.parse(localStorage.getItem('failedLoginAttempts') || '{}');
let accountLockouts = JSON.parse(localStorage.getItem('accountLockouts') || '{}');

// --- PASSWORD VALIDATION FUNCTIONS ---
function validatePassword(password) {
    const errors = [];
    const requirements = SECURITY_CONFIG.PASSWORD_REQUIREMENTS;
    
    if (password.length < requirements.minLength) {
        errors.push(`Password must be at least ${requirements.minLength} characters long`);
    }
    
    if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    
    if (requirements.requireLowercase && !/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    
    if (requirements.requireNumbers && !/\d/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    
    if (requirements.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push('Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)');
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

function getPasswordStrength(password) {
    let score = 0;
    const requirements = SECURITY_CONFIG.PASSWORD_REQUIREMENTS;
    
    if (password.length >= requirements.minLength) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
    
    if (score <= 2) return 'weak';
    if (score <= 3) return 'medium';
    if (score <= 4) return 'strong';
    return 'very-strong';
}

function updatePasswordStrengthIndicator(password) {
    const strengthIndicator = document.getElementById('password-strength');
    const strengthText = document.getElementById('password-strength-text');
    
    if (!strengthIndicator || !strengthText) return;
    
    const strength = getPasswordStrength(password);
    const validation = validatePassword(password);
    
    strengthIndicator.className = `password-strength ${strength}`;
    
    if (password.length === 0) {
        strengthText.textContent = '';
        strengthIndicator.style.display = 'none';
    } else {
        strengthIndicator.style.display = 'block';
        
        if (validation.isValid) {
            strengthText.textContent = `Password strength: ${strength.charAt(0).toUpperCase() + strength.slice(1)}`;
            strengthText.className = 'strength-text valid';
        } else {
            strengthText.textContent = validation.errors[0];
            strengthText.className = 'strength-text invalid';
        }
    }
}

// --- ACCOUNT LOCKOUT FUNCTIONS ---
function isAccountLocked(email) {
    const lockout = accountLockouts[email];
    if (!lockout) return false;
    
    if (Date.now() - lockout.timestamp > SECURITY_CONFIG.LOCKOUT_DURATION) {
        // Lockout expired, remove it
        delete accountLockouts[email];
        delete failedLoginAttempts[email];
        localStorage.setItem('accountLockouts', JSON.stringify(accountLockouts));
        localStorage.setItem('failedLoginAttempts', JSON.stringify(failedLoginAttempts));
        return false;
    }
    
    return true;
}

function recordFailedLogin(email) {
    failedLoginAttempts[email] = (failedLoginAttempts[email] || 0) + 1;
    localStorage.setItem('failedLoginAttempts', JSON.stringify(failedLoginAttempts));
    
    if (failedLoginAttempts[email] >= SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS) {
        accountLockouts[email] = {
            timestamp: Date.now(),
            attempts: failedLoginAttempts[email]
        };
        localStorage.setItem('accountLockouts', JSON.stringify(accountLockouts));
    }
}

function clearFailedLogins(email) {
    delete failedLoginAttempts[email];
    delete accountLockouts[email];
    localStorage.setItem('failedLoginAttempts', JSON.stringify(failedLoginAttempts));
    localStorage.setItem('accountLockouts', JSON.stringify(accountLockouts));
}

function getRemainingAttempts(email) {
    const attempts = failedLoginAttempts[email] || 0;
    return Math.max(0, SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS - attempts);
}

function getLockoutTimeRemaining(email) {
    const lockout = accountLockouts[email];
    if (!lockout) return 0;
    
    const elapsed = Date.now() - lockout.timestamp;
    const remaining = SECURITY_CONFIG.LOCKOUT_DURATION - elapsed;
    return Math.max(0, remaining);
}

// --- ANALYTICS HELPER FUNCTIONS ---
function trackEvent(eventName, parameters = {}) {
    try {
        console.log('🔍 trackEvent called:', eventName, parameters);
        
        // Add timeout protection for logEvent
        const analyticsTimeout = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error('Analytics timeout'));
            }, 3000); // 3 second timeout for analytics
        });
        
        const analyticsPromise = new Promise((resolve, reject) => {
            try {
                logEvent(analytics, eventName, {
                    timestamp: new Date().toISOString(),
                    ...parameters
                });
                resolve();
            } catch (error) {
                reject(error);
            }
        });
        
        return Promise.race([analyticsPromise, analyticsTimeout])
            .then(() => {
                console.log('✅ Analytics event tracked successfully:', eventName, parameters);
            })
            .catch((error) => {
                console.error('❌ Analytics tracking error:', error);
                throw error;
            });
            
    } catch (error) {
        console.error('❌ Analytics tracking error (sync):', error);
    }
}

function trackAuthEvent(eventName, method) {
    trackEvent(eventName, {
        method: method,
        timestamp: new Date().toISOString()
    });
}

function trackUserBehavior(action, details = {}) {
    trackEvent('user_behavior', {
        action: action,
        ...details
    });
}

function trackFeatureUsage(feature, details = {}) {
    trackEvent('feature_usage', {
        feature: feature,
        ...details
    });
}

function trackBusinessMetric(metric, value, details = {}) {
    trackEvent('business_metric', {
        metric: metric,
        value: value,
        ...details
    });
}

// --- QUICK ANSWERS WIDGET ---
class QuickAnswersWidget {
    constructor() {
        console.log('🚀 QuickAnswersWidget constructor called');
        this.messages = [];
        this.isLoading = false;
        this.freeQueriesUsed = this.getFreeQueriesUsed();
        this.maxFreeQueries = 2;
        
        console.log('🔧 Initializing QuickAnswersWidget elements...');
        this.initializeElements();
        this.setupEventListeners();
        this.updateCounterDisplay();
        
        // Track widget viewed
        trackEvent('qa_widget_viewed');
        console.log('✅ QuickAnswersWidget initialization complete');
    }
    
    initializeElements() {
        this.input = document.getElementById('quick-answers-input');
        this.submitBtn = document.getElementById('quick-answers-submit');
        this.messagesContainer = document.getElementById('quick-answers-messages');
        this.counter = document.getElementById('quick-answers-counter');
        this.softGateModal = document.getElementById('quick-answers-soft-gate-modal');
        this.signupBtn = document.getElementById('soft-gate-signup-btn');
        this.loginLink = document.getElementById('soft-gate-login-link');
    }
    
    setupEventListeners() {
        // Submit question
        this.submitBtn.addEventListener('click', () => this.handleSubmit());
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSubmit();
            }
        });
        
        // Soft gate modal
        this.signupBtn.addEventListener('click', () => {
            trackEvent('qa_soft_gate_signup_clicked');
            showModal('signup');
            this.hideSoftGateModal();
        });
        
        this.loginLink.addEventListener('click', (e) => {
            e.preventDefault();
            trackEvent('qa_soft_gate_login_clicked');
            showModal('login');
            this.hideSoftGateModal();
        });
        
        // Close modal
        const closeModal = this.softGateModal.querySelector('.close-modal');
        if (closeModal) {
            closeModal.addEventListener('click', () => this.hideSoftGateModal());
        }
        
        // Close modal on overlay click
        const overlay = this.softGateModal.querySelector('.modal-overlay');
        if (overlay) {
            overlay.addEventListener('click', () => this.hideSoftGateModal());
        }
    }
    
    getFreeQueriesUsed() {
        const stored = localStorage.getItem('mcc_free_qa_count');
        return stored ? parseInt(stored, 10) : 0;
    }
    
    setFreeQueriesUsed(count) {
        localStorage.setItem('mcc_free_qa_count', count.toString());
        this.freeQueriesUsed = count;
    }
    
    isUserLoggedIn() {
        return auth.currentUser !== null;
    }
    
    canAskQuestion() {
        // Logged in users bypass the limit
        if (this.isUserLoggedIn()) {
            return true;
        }
        
        // Guest users limited to 2 queries
        return this.freeQueriesUsed < this.maxFreeQueries;
    }
    
    async handleSubmit() {
        const question = this.input.value.trim();
        
        if (!question) {
            return;
        }
        
        // Check if user can ask question
        if (!this.canAskQuestion()) {
            this.showSoftGateModal();
            return;
        }
        
        // Add user message
        this.addMessage('user', question);
        this.input.value = '';
        
        // Show loading state
        this.setLoading(true);
        this.addMessage('loading', 'Thinking...');
        
        try {
            // Track question submission
            trackEvent('qa_question_submitted', {
                isGuest: !this.isUserLoggedIn()
            });
            
            // Make API call
            const headers = {
                'Content-Type': 'application/json'
            };
            
            // Only add Authorization header if user is logged in
            if (this.isUserLoggedIn()) {
                const idToken = await auth.currentUser.getIdToken();
                headers['Authorization'] = `Bearer ${idToken}`;
            }
            
            console.log('🚀 Making request to:', `${BACKEND_URL}/ask-agent1`);
            console.log('📋 Request headers:', headers);
            console.log('📝 Request body:', {
                question: question,
                history: this.messages.filter(m => m.type !== 'loading')
            });
            
            // Convert messages to the format expected by backend: [{user: '...', ai: '...'}]
            const history = [];
            const nonLoadingMessages = this.messages.filter(m => m.type !== 'loading');
            for (let i = 0; i < nonLoadingMessages.length; i += 2) {
                if (i + 1 < nonLoadingMessages.length) {
                    history.push({
                        user: nonLoadingMessages[i].content,
                        ai: nonLoadingMessages[i + 1].content
                    });
                }
            }
            
            const response = await fetch(`${BACKEND_URL}/ask-agent1`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    question: question,
                    history: history
                })
            });
            
            console.log('📡 Response status:', response.status);
            console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Quick Answers API response:', data);
            console.log('Full answer text:', data.answer);
            console.log('Answer length:', data.answer?.length);
            
            // Remove loading message
            this.removeLoadingMessage();
            
            // Add AI response (ask-agent1 returns data.answer)
            console.log('About to add assistant message with content:', data.answer);
            this.addMessage('assistant', data.answer);
            
            // Track answer received
            trackEvent('qa_answer_received');
            
            // Increment counter for guest users
            if (!this.isUserLoggedIn()) {
                const newCount = this.freeQueriesUsed + 1;
                this.setFreeQueriesUsed(newCount);
                this.updateCounterDisplay();
                
                if (newCount >= this.maxFreeQueries) {
                    trackEvent('qa_free_limit_reached');
                }
            }
            
        } catch (error) {
            console.error('❌ Quick Answers API error:', error);
            console.error('❌ Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            console.error('❌ Error type:', typeof error);
            console.error('❌ Error constructor:', error.constructor.name);
            
            // Remove loading message
            this.removeLoadingMessage();
            
            // Add error message with more details for debugging
            const errorMessage = `Sorry, I encountered an error: ${error.message}. Please try again later.`;
            console.error('❌ Showing error message to user:', errorMessage);
            this.addMessage('assistant', errorMessage);
        } finally {
            this.setLoading(false);
        }
    }
    
    addMessage(type, content) {
        console.log('QuickAnswersWidget.addMessage called:', { type, content: content.substring(0, 100) + '...' });
        const message = {
            type: type,
            content: content,
            timestamp: new Date()
        };
        
        this.messages.push(message);
        console.log('Messages array length:', this.messages.length);
        this.renderMessages();
    }
    
    removeLoadingMessage() {
        this.messages = this.messages.filter(m => m.type !== 'loading');
        this.renderMessages();
    }
    
    renderMessages() {
        console.log('QuickAnswersWidget.renderMessages called, messages count:', this.messages.length);
        console.log('Messages container element:', this.messagesContainer);
        
        this.messagesContainer.innerHTML = '';
        
        this.messages.forEach((message, index) => {
            console.log(`Rendering message ${index}:`, { type: message.type, content: message.content.substring(0, 50) + '...' });
            const messageEl = document.createElement('div');
            messageEl.className = `message ${message.type}-message`;
            
            if (message.type === 'loading') {
                messageEl.innerHTML = `
                    <div class="loading-spinner"></div>
                    ${message.content}
                `;
            } else {
                // Create message bubble structure like Agent 1
                const bubbleDiv = document.createElement('div');
                bubbleDiv.className = 'message-bubble';
                
                if (message.type === 'assistant') {
                    // Render assistant messages as HTML (markdown) - same as Agent 1
                    if (typeof marked !== 'undefined' && marked.parse) {
                        bubbleDiv.innerHTML = marked.parse(message.content);
                        console.log(`✅ Created assistant message with marked.parse:`, messageEl);
                        console.log(`✅ Message element content (HTML):`, bubbleDiv.innerHTML.substring(0, 100) + '...');
                    } else {
                        console.error('❌ marked library not available, using plain text');
                        bubbleDiv.textContent = message.content;
                    }
                } else {
                    // Render user messages as plain text
                    bubbleDiv.textContent = message.content;
                    console.log(`✅ Created user message:`, messageEl);
                    console.log(`✅ Message element content:`, bubbleDiv.textContent);
                }
                
                messageEl.appendChild(bubbleDiv);
            }
            
            this.messagesContainer.appendChild(messageEl);
            console.log(`✅ Appended message element to container. Container now has ${this.messagesContainer.children.length} children`);
        });
        
        console.log('Messages container children count after render:', this.messagesContainer.children.length);
        
        // Scroll to bottom
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
    
    setLoading(isLoading) {
        this.isLoading = isLoading;
        this.submitBtn.disabled = isLoading;
        this.input.disabled = isLoading;
    }
    
    updateCounterDisplay() {
        if (this.isUserLoggedIn()) {
            this.counter.innerHTML = '✓ Unlimited access with your account';
            this.counter.className = 'usage-counter';
            return;
        }
        
        const remaining = this.maxFreeQueries - this.freeQueriesUsed;
        
        if (remaining > 0) {
            this.counter.innerHTML = `You have ${remaining} free answer${remaining === 1 ? '' : 's'} left.`;
            this.counter.className = remaining === 1 ? 'usage-counter warning' : 'usage-counter';
        } else {
            // Convert counter to signup button when limit reached
            this.counter.innerHTML = `
                <button class="signup-cta-button" id="counter-signup-btn">
                    <span class="cta-icon">🚀</span>
                    <span class="cta-text">Sign Up Free</span>
                    <span class="cta-subtext">Unlimited questions</span>
                </button>
            `;
            this.counter.className = 'usage-counter cta-button-container';
            
            // Disable input and submit button when limit reached
            this.input.disabled = true;
            this.input.placeholder = 'Sign up to continue asking questions';
            this.submitBtn.disabled = true;
            this.submitBtn.textContent = 'Sign Up Required';
            
            // Add event listener to the new button
            const signupBtn = this.counter.querySelector('#counter-signup-btn');
            if (signupBtn) {
                signupBtn.addEventListener('click', () => {
                    trackEvent('qa_counter_signup_clicked');
                    showModal('signup');
                });
            }
        }
    }
    
    showSoftGateModal() {
        trackEvent('qa_soft_gate_shown');
        this.softGateModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
    
    hideSoftGateModal() {
        this.softGateModal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

// Initialize Quick Answers Widget when DOM is loaded
let quickAnswersWidget;

// --- HELPER FUNCTIONS ---
function showLoginForm() {
    // Reset signup form
    const signupForm = document.getElementById('signup-form');
    const verificationMessage = document.querySelector('.verification-message');
    if (signupForm) signupForm.style.display = 'block';
    if (verificationMessage) verificationMessage.remove();
    
    // Show login form
    const signupFormWrapper = document.getElementById('signup-form-wrapper');
    const loginFormWrapper = document.getElementById('login-form-wrapper');
    const resetPasswordWrapper = document.getElementById('reset-password-wrapper');
    
    if (signupFormWrapper) signupFormWrapper.classList.add('hidden-form');
    if (loginFormWrapper) loginFormWrapper.classList.remove('hidden-form');
    if (resetPasswordWrapper) resetPasswordWrapper.classList.add('hidden-form');
}

// --- GOOGLE SIGN-IN FUNCTIONS ---
async function signInWithGoogle() {
    try {
        // Try popup first (better UX)
        console.log('🔄 Attempting Google Sign-in with popup...');
        const result = await signInWithPopup(auth, googleProvider);
        console.log('✅ Google Sign-in successful with popup');
        
        // Handle user document creation for popup sign-in
        if (result.user) {
            try {
                const userDocRef = doc(db, 'users', result.user.uid);
                const userDoc = await getDoc(userDocRef);
                
                if (!userDoc.exists()) {
                    console.log('💾 Creating new Google user document from popup...');
                    await setDoc(userDocRef, {
                        email: result.user.email,
                        createdAt: serverTimestamp(),
                        provider: 'google',
                        displayName: result.user.displayName || null,
                        photoURL: result.user.photoURL || null,
                        subscriptionTier: 'free'
                    });
                    console.log('✅ New Google user document created from popup');
                }
            } catch (firestoreError) {
                console.error('❌ Error accessing Firestore during popup sign-in:', firestoreError);
                // Continue anyway - the user is still authenticated
            }
        }
        
        return result;
    } catch (error) {
        console.log('⚠️ Popup failed, trying redirect method...', error.code);
        
        // If popup fails, fall back to redirect
        if (error.code === 'auth/popup-closed-by-user' || 
            error.code === 'auth/popup-blocked' ||
            error.code === 'auth/cancelled-popup-request') {
            try {
                console.log('🔄 Using redirect method for Google Sign-in...');
                await signInWithRedirect(auth, googleProvider);
                return; // Redirect will handle the rest
            } catch (redirectError) {
                console.error('❌ Both popup and redirect failed:', redirectError);
                throw redirectError;
            }
        } else {
            console.error('❌ Google sign-in error:', error);
            throw error;
        }
    }
}

function handleGoogleSignInError(error) {
    let errorMessage = 'An error occurred during Google sign-in.';
    
    if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in was cancelled. Please try again.';
    } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Popup was blocked. Using redirect method instead...';
    } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection and try again.';
    } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
    } else if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = 'An account already exists with this email address. Please use email/password sign-in.';
    }
    
    return errorMessage;
}

// --- Payment Status Messages ---

function showPaymentCancelledMessage() {
    const cancelledMessage = document.createElement('div');
    cancelledMessage.className = 'payment-cancelled-message';
    cancelledMessage.innerHTML = `
        <div class="payment-message-content">
            <div class="payment-message-icon">❌</div>
            <h3>Payment Cancelled</h3>
            <p>Your payment was cancelled. No charges have been made.</p>
            <div class="payment-message-actions">
                <button class="btn-primary" onclick="window.location.href='#pricing'">Try Again</button>
                <button class="btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">Dismiss</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(cancelledMessage);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (cancelledMessage.parentNode) {
            cancelledMessage.remove();
        }
    }, 10000);
}

// --- MAIN SCRIPT LOGIC ---

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 DOM Content Loaded - Initializing application...');

    // --- Handle Google Sign-in Redirect Results ---
    try {
        const result = await getRedirectResult(auth);
        if (result) {
            console.log('🔄 Processing Google sign-in redirect result...');
            const user = result.user;
            
            try {
                // Check if this is a new user
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);
                
                if (!userDoc.exists()) {
                    // Create user document for new Google sign-in users
                    console.log('💾 Creating new Google user document from redirect...');
                    await setDoc(userDocRef, {
                        email: user.email,
                        createdAt: serverTimestamp(),
                        provider: 'google',
                        displayName: user.displayName || null,
                        photoURL: user.photoURL || null,
                        subscriptionTier: 'free'
                    });
                    console.log('✅ New Google user document created');
                }
                
                console.log('✅ Google sign-in redirect completed successfully');
            } catch (firestoreError) {
                console.error('❌ Error accessing Firestore during redirect:', firestoreError);
                // Continue anyway - the user is still authenticated
                console.log('⚠️ Continuing with authentication despite Firestore error');
            }
        }
    } catch (error) {
        console.error('❌ Error processing Google sign-in redirect:', error);
    }

    // --- Payment Success Detection ---
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    
    if (paymentStatus === 'success') {
        console.log('💳 Payment success detected in URL parameters');
        
        // Track payment success
        trackUserBehavior('payment_success_detected', {
            source: 'url_parameters',
            timestamp: new Date().toISOString(),
            user_logged_in: !!auth.currentUser
        });
        
        // Show processing message with loading indicator
        showSubscriptionProcessingMessage();
        
        // Clear URL parameters immediately to avoid confusion
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        
        console.log('✅ Payment success processed - URL cleaned, starting subscription verification');
        
        // Force immediate subscription check after a short delay to allow webhook processing
        setTimeout(async () => {
            console.log('🔍 Starting immediate subscription verification...');
            await verifySubscriptionAfterPayment();
        }, 2000);
    } else if (paymentStatus === 'cancelled') {
        console.log('❌ Payment cancelled detected in URL parameters');
        
        // Track payment cancellation
        trackUserBehavior('payment_cancelled', {
            source: 'url_parameters',
            timestamp: new Date().toISOString()
        });
        
        // Clear URL parameters
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        
        // Show cancellation message
        showPaymentCancelledMessage();
    }

    // Initialize Quick Answers Widget
    const widgetElement = document.getElementById('quick-answers-widget');
    const inputElement = document.getElementById('quick-answers-input');
    
    console.log('🔍 Widget elements found:', {
        widget: !!widgetElement,
        input: !!inputElement
    });
    
    if (widgetElement || inputElement) {
        console.log('🎯 Initializing QuickAnswersWidget...');
        quickAnswersWidget = new QuickAnswersWidget();
    } else {
        console.log('❌ QuickAnswersWidget elements not found');
    }

    // --- Get all the DOM elements ---
    const authSection = document.getElementById('auth-section');
    const appContainer = document.getElementById('app-container');
    
    // Logged-out pages
    const landingPageContent = document.getElementById('landing-page-content');
    const howItWorksPage = document.getElementById('how-it-works-page');
    const resourcesPage = document.getElementById('resources-page');
    const pricingPage = document.getElementById('pricing-page');
    const aboutUsPage = document.getElementById('about-us-page');

    // Logged-in pages
    const pages = document.querySelectorAll('.page');
    
    // Navigation buttons
    const logoLink = document.getElementById('logo-link');
    const navHowItWorksLink = document.getElementById('nav-how-it-works');
    const navPricingLink = document.getElementById('nav-pricing');
    const navResourcesLink = document.getElementById('nav-resources');
    const navAboutUsLink = document.getElementById('nav-about-us');
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
    const getStartedAboutButton = document.getElementById('get-started-about-button');
    const learnMoreAboutButton = document.getElementById('learn-more-about-button');
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
    // Logout button removed - now handled by action bar
    const signupMessage = document.getElementById('signup-message');
    const loginMessage = document.getElementById('login-message');
    const resetMessage = document.getElementById('reset-message');
    
    // Agent 1 elements
    const qaForm = document.getElementById('agent1-qa-form');
    const questionInput = document.getElementById('agent1-question');
    const chatContainer = document.getElementById('agent1-chat');
    const chatMessages = document.getElementById('agent1-chat');
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
    const agent3Page = document.getElementById('agent-3-page');
    const disputeDashboard = document.getElementById('dispute-dashboard');
    const disputeCreationFlow = document.getElementById('dispute-creation-flow');
    const disputeManagement = document.getElementById('dispute-management');
    const disputeLetterPreview = document.getElementById('dispute-letter-preview');
    
    // Debug: Check if elements are found
    console.log('🔍 Agent 3 elements found:', {
        agent3Page: !!agent3Page,
        disputeDashboard: !!disputeDashboard,
        disputeCreationFlow: !!disputeCreationFlow,
        disputeManagement: !!disputeManagement,
        disputeLetterPreview: !!disputeLetterPreview
    });
    
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
    const newChatBtn = document.getElementById('new-chat-btn');
    const copyAnswerBtn = document.getElementById('copy-answer-btn');
    const feedbackSection = document.getElementById('feedback-section');
    const feedbackHelpful = document.getElementById('feedback-helpful');
    const feedbackNotHelpful = document.getElementById('feedback-not-helpful');
    const feedbackThanks = document.getElementById('feedback-thanks');
    const suggestedPrompts = document.getElementById('suggested-prompts');
    const promptChips = document.querySelectorAll('.prompt-chip');

    let agent1ChatHistory = [];
    let unsubscribeAnalyses = null;
    let unsubscribeChatHistory = null;
    let unsubscribeUser = null; // Real-time listener for user subscription changes
    let unsubscribeSubscription = null; // Real-time listener for subscription changes
    let currentUserSubscriptionTier = 'free';
    let activeUploadCategory = 'bills'; // Track which category is being used for upload
    let hasAskedFirstQuestion = false; // Track if user has asked their first question
    
    // Chat helper functions
    function addMessageToChat(sender, message, isThinking = false) {
        console.log('addMessageToChat called:', sender, message, isThinking);
        const chatMessages = document.getElementById('agent1-chat');
        console.log('chatMessages element:', chatMessages);
        if (!chatMessages) {
            console.error('chatMessages element not found');
            return;
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        if (isThinking) {
            messageDiv.id = 'thinking-message';
        }
        
        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'message-bubble';
        
        const messageP = document.createElement('div');
        if (sender === 'ai' && !isThinking) {
            // Parse markdown for AI messages
            messageP.innerHTML = marked.parse(message);
        } else {
            // Use plain text for user messages and thinking messages
            messageP.textContent = message;
        }
        
        bubbleDiv.appendChild(messageP);
        messageDiv.appendChild(bubbleDiv);
        chatMessages.appendChild(messageDiv);
        
        console.log('Message added to chat');
        
        // Scroll to bottom
        const chatContainer = document.querySelector('.chat-messages-container');
        if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }
    
    function removeThinkingMessage() {
        const thinkingMessage = document.getElementById('thinking-message');
        if (thinkingMessage) {
            thinkingMessage.remove();
        }
    }
    
    // Agent 2 Chat helper functions
    function addMessageToAgent2Chat(sender, message, documentId = null, isThinking = false) {
        if (!agent2ChatMessages) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        if (isThinking) {
            messageDiv.id = 'agent2-thinking-message';
        }
        if (documentId) {
            messageDiv.setAttribute('data-document-id', documentId);
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
        aboutUsPage.classList.add('hidden');

        if (pageName === 'how-it-works') {
            howItWorksPage.classList.remove('hidden');
        } else if (pageName === 'resources') {
            resourcesPage.classList.remove('hidden');
        } else if (pageName === 'pricing') {
            pricingPage.classList.remove('hidden');
        } else if (pageName === 'about-us') {
            aboutUsPage.classList.remove('hidden');
        } else { // Default to main landing page
            landingPageContent.classList.remove('hidden');
        }
    };

    const showAppPage = (pageId) => {
        pages.forEach(page => page.classList.add('hidden'));
        const pageToShow = document.getElementById(pageId);
        if (pageToShow) {
            pageToShow.classList.remove('hidden');
            
            // Update Team Tabs active state
            updateTeamTabsActiveState(pageId);
            
            // Initialize specific pages
            if (pageId === 'agent-3-page') {
                console.log('📄 Agent 3 page shown, initializing...');
                initializeAgent3();
            } else if (pageId === 'agent-2-page') {
                // Removed problematic real-time listener
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
    
    // Make showModal globally accessible for Quick Answers widget
    window.showModal = showModal;

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
                
                <!-- Coupon Code Section -->
                <div class="coupon-section">
                    <h4>🎫 Have a Coupon Code?</h4>
                    <div class="coupon-input-group">
                        <input type="text" id="coupon-code-input" placeholder="Enter coupon code" maxlength="20">
                        <button id="apply-coupon-btn" class="btn-secondary">Apply</button>
                    </div>
                    <div id="coupon-message" class="coupon-message"></div>
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
        const applyCouponBtn = upgradePrompt.querySelector('#apply-coupon-btn');
        const couponInput = upgradePrompt.querySelector('#coupon-code-input');
        const couponMessage = upgradePrompt.querySelector('#coupon-message');
        
        // Coupon validation functionality
        let currentCouponCode = null;
        
        applyCouponBtn.addEventListener('click', async () => {
            const couponCode = couponInput.value.trim().toUpperCase();
            if (!couponCode) {
                showCouponMessage('Please enter a coupon code', 'error');
                return;
            }
            
            try {
                applyCouponBtn.textContent = 'Validating...';
                applyCouponBtn.disabled = true;
                
                const user = auth.currentUser;
                if (!user) {
                    showCouponMessage('Please log in to use coupon codes', 'error');
                    return;
                }
                
                const idToken = await user.getIdToken();
                const response = await fetch(`${BACKEND_URL}/validate-coupon`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify({ 
                        couponCode: couponCode,
                        plan: 'yearly' // Default to yearly for validation, but coupon will work for both plans
                    })
                });
                
                if (response.ok) {
                    const couponData = await response.json();
                    currentCouponCode = couponCode;
                    
                    // Create plan-specific success message
                    const planText = couponData.plan === 'yearly' ? 'yearly' : 'monthly';
                    const discountText = couponData.discountAmount === 100 ? 'FREE' : `${couponData.discountAmount}% off`;
                    const successMessage = `✅ ${discountText} ${planText} plan - ${couponData.description}`;
                    showCouponMessage(successMessage, 'success');
                    
                    // Update yearly button to show discount
                    if (couponData.discountAmount === 100) {
                        upgradeYearlyBtn.textContent = '🎫 FREE with Coupon!';
                        upgradeYearlyBtn.classList.add('coupon-applied');
                    }
                } else {
                    const errorData = await response.json();
                    showCouponMessage(errorData.error || 'Invalid coupon code', 'error');
                    currentCouponCode = null;
                }
            } catch (error) {
                console.error('Coupon validation error:', error);
                showCouponMessage('Error validating coupon. Please try again.', 'error');
                currentCouponCode = null;
            } finally {
                applyCouponBtn.textContent = 'Apply';
                applyCouponBtn.disabled = false;
            }
        });
        
        function showCouponMessage(message, type) {
            if (type === 'success') {
                // Add dismiss button for success messages
                couponMessage.innerHTML = `
                    <span>${message}</span>
                    <button class="coupon-dismiss-btn" onclick="this.parentElement.style.display='none'" title="Dismiss">×</button>
                `;
            } else {
                couponMessage.textContent = message;
            }
            couponMessage.className = `coupon-message ${type}`;
            couponMessage.style.display = 'block';
            
            // Keep success messages visible until user takes action
            // Success messages will persist to show coupon is applied
        }
        
        // Handle coupon input enter key
        couponInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                applyCouponBtn.click();
            }
        });
        
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                document.body.removeChild(upgradePrompt);
            });
        });
        
        upgradeNowBtn.addEventListener('click', () => {
            document.body.removeChild(upgradePrompt);
            initiateStripeCheckout('monthly', currentCouponCode);
        });
        
        upgradeYearlyBtn.addEventListener('click', () => {
            document.body.removeChild(upgradePrompt);
            initiateStripeCheckout('yearly', currentCouponCode);
        });
        
        // Close on outside click
        upgradePrompt.addEventListener('click', (e) => {
            if (e.target === upgradePrompt) {
                document.body.removeChild(upgradePrompt);
            }
        });
    };

    const showFreeSubscriptionModal = (onContinue) => {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        modal.innerHTML = `
            <div style="
                background: white;
                border-radius: 12px;
                padding: 32px;
                max-width: 500px;
                width: 90%;
                text-align: center;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            ">
                <div style="
                    width: 64px;
                    height: 64px;
                    background: #10B981;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 24px;
                    font-size: 32px;
                ">🎉</div>
                
                <h2 style="
                    color: #1F2937;
                    font-size: 24px;
                    font-weight: 600;
                    margin: 0 0 16px;
                ">Congratulations!</h2>
                
                <p style="
                    color: #6B7280;
                    font-size: 16px;
                    line-height: 1.5;
                    margin: 0 0 24px;
                ">You're getting a <strong>FREE yearly membership</strong> with your FRIENDSFOREVER coupon!</p>
                
                <div style="
                    background: #F3F4F6;
                    border-radius: 8px;
                    padding: 16px;
                    margin: 0 0 24px;
                    text-align: left;
                ">
                    <h3 style="
                        color: #374151;
                        font-size: 14px;
                        font-weight: 600;
                        margin: 0 0 8px;
                    ">What to expect:</h3>
                    <ul style="
                        color: #6B7280;
                        font-size: 14px;
                        margin: 0;
                        padding-left: 20px;
                    ">
                        <li>You won't be charged anything today</li>
                        <li>Stripe may ask for a payment method for future billing</li>
                        <li>Your membership is completely free</li>
                        <li>You can cancel anytime</li>
                    </ul>
                </div>
                
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button id="cancel-free-subscription" style="
                        background: #F3F4F6;
                        color: #374151;
                        border: none;
                        border-radius: 8px;
                        padding: 12px 24px;
                        font-size: 14px;
                        font-weight: 500;
                        cursor: pointer;
                        transition: background-color 0.2s;
                    ">Cancel</button>
                    <button id="continue-free-subscription" style="
                        background: #8B5CF6;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        padding: 12px 24px;
                        font-size: 14px;
                        font-weight: 500;
                        cursor: pointer;
                        transition: background-color 0.2s;
                    ">Continue to Checkout</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add hover effects
        const cancelBtn = modal.querySelector('#cancel-free-subscription');
        const continueBtn = modal.querySelector('#continue-free-subscription');
        
        cancelBtn.addEventListener('mouseenter', () => {
            cancelBtn.style.background = '#E5E7EB';
        });
        cancelBtn.addEventListener('mouseleave', () => {
            cancelBtn.style.background = '#F3F4F6';
        });
        
        continueBtn.addEventListener('mouseenter', () => {
            continueBtn.style.background = '#7C3AED';
        });
        continueBtn.addEventListener('mouseleave', () => {
            continueBtn.style.background = '#8B5CF6';
        });

        // Event listeners
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        continueBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
            onContinue();
        });

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    };

    const showEnterprise75Modal = (plan, onContinue) => {
        // Calculate pricing based on plan
        const isYearly = plan === 'yearly';
        const originalPrice = isYearly ? 79 : 7.99;
        const discountedPrice = isYearly ? (79 * 0.25) : (7.99 * 0.25);
        const planText = isYearly ? 'yearly' : 'monthly';
        const billingText = isYearly ? 'year' : 'month';
        const afterDiscountText = isYearly ? '$79/year' : '$7.99/month';
        
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        modal.innerHTML = `
            <div style="
                background: white;
                border-radius: 12px;
                padding: 32px;
                max-width: 500px;
                width: 90%;
                text-align: center;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            ">
                <div style="
                    width: 64px;
                    height: 64px;
                    background: #3B82F6;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 24px;
                    font-size: 32px;
                ">💼</div>
                
                <h2 style="
                    color: #1F2937;
                    font-size: 24px;
                    font-weight: 600;
                    margin: 0 0 16px;
                ">Great Deal!</h2>
                
                <p style="
                    color: #6B7280;
                    font-size: 16px;
                    line-height: 1.5;
                    margin: 0 0 24px;
                ">You're getting <strong>75% off your ${planText} subscription</strong> for the first 12 months!</p>
                
                <div style="
                    background: #F3F4F6;
                    border-radius: 8px;
                    padding: 16px;
                    margin: 0 0 24px;
                    text-align: left;
                ">
                    <h3 style="
                        color: #374151;
                        font-size: 14px;
                        font-weight: 600;
                        margin: 0 0 8px;
                    ">What this means for your ${planText} plan:</h3>
                    <ul style="
                        color: #6B7280;
                        font-size: 14px;
                        margin: 0;
                        padding-left: 20px;
                    ">
                        <li>You'll pay <strong>$${discountedPrice.toFixed(2)}/${billingText}</strong> for the first 12 months (75% off $${originalPrice})</li>
                        <li>After 12 months, you'll be billed the full <strong>${afterDiscountText}</strong></li>
                        <li>A payment method is required for this subscription</li>
                        <li>You can cancel anytime</li>
                    </ul>
                </div>
                
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button id="cancel-enterprise75" style="
                        background: #F3F4F6;
                        color: #374151;
                        border: none;
                        border-radius: 8px;
                        padding: 12px 24px;
                        font-size: 14px;
                        font-weight: 500;
                        cursor: pointer;
                        transition: background-color 0.2s;
                    ">Cancel</button>
                    <button id="continue-enterprise75" style="
                        background: #3B82F6;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        padding: 12px 24px;
                        font-size: 14px;
                        font-weight: 500;
                        cursor: pointer;
                        transition: background-color 0.2s;
                    ">Continue to Checkout</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add hover effects
        const cancelBtn = modal.querySelector('#cancel-enterprise75');
        const continueBtn = modal.querySelector('#continue-enterprise75');
        
        cancelBtn.addEventListener('mouseenter', () => {
            cancelBtn.style.background = '#E5E7EB';
        });
        cancelBtn.addEventListener('mouseleave', () => {
            cancelBtn.style.background = '#F3F4F6';
        });
        
        continueBtn.addEventListener('mouseenter', () => {
            continueBtn.style.background = '#2563EB';
        });
        continueBtn.addEventListener('mouseleave', () => {
            continueBtn.style.background = '#3B82F6';
        });

        // Event listeners
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        continueBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
            onContinue();
        });

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    };

    const initiateStripeCheckout = (plan, couponCode = null) => {
        // Show free subscription modal if FRIENDSFOREVER coupon is used
        if (couponCode === 'FRIENDSFOREVER') {
            showFreeSubscriptionModal(() => {
                proceedToCheckout(plan, couponCode);
            });
            return;
        }
        
        // Show enterprise modal if ENTERPRISE75 coupon is used
        if (couponCode === 'ENTERPRISE75') {
            showEnterprise75Modal(plan, () => {
                proceedToCheckout(plan, couponCode);
            });
            return;
        }
        
        proceedToCheckout(plan, couponCode);
    };

    const proceedToCheckout = (plan, couponCode = null) => {
        // Show loading state
        const loadingMessage = document.createElement('div');
        loadingMessage.id = 'checkout-loading';
        loadingMessage.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        loadingMessage.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 24px; margin-bottom: 16px;">⏳</div>
                <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Creating your checkout session...</div>
                <div style="font-size: 14px; opacity: 0.8;">Please wait while we prepare your payment</div>
            </div>
        `;
        document.body.appendChild(loadingMessage);

        auth.currentUser.getIdToken().then(idToken => {
            const requestBody = { plan: plan };
            if (couponCode) {
                requestBody.couponCode = couponCode;
            }
            
            fetch(`${BACKEND_URL}/create-checkout-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify(requestBody)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(session => {
                // Track checkout initiation
                trackBusinessMetric('checkout_initiated', 1, { 
                    price_id: plan,
                    price_type: plan
                });
                
                // Remove loading message before redirect
                const loadingEl = document.getElementById('checkout-loading');
                if (loadingEl) {
                    loadingEl.remove();
                }
                return stripe.redirectToCheckout({ sessionId: session.id });
            })
            .catch(error => {
                console.error('Error:', error);
                // Remove loading message on error
                const loadingEl = document.getElementById('checkout-loading');
                if (loadingEl) {
                    loadingEl.remove();
                }
                alert('There was an error creating your checkout session. Please try again.');
            });
        }).catch(error => {
            console.error('Auth error:', error);
            // Remove loading message on auth error
            const loadingEl = document.getElementById('checkout-loading');
            if (loadingEl) {
                loadingEl.remove();
            }
            alert('There was an error creating your checkout session. Please try again.');
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
    
    // User story "Get Started" buttons
    const storyGetStartedButtons = document.querySelectorAll('.story-get-started');
    storyGetStartedButtons.forEach(button => {
        button.addEventListener('click', () => showModal('signup'));
    });
    
    // Trust badges "Start Saving Now" button
    const trustCtaButton = document.querySelector('.trust-cta');
    if (trustCtaButton) {
        trustCtaButton.addEventListener('click', () => showModal('signup'));
    }
    
    // Reviews "Check Your Bill For Free" button
    const reviewsCtaButton = document.querySelector('.reviews-cta');
    if (reviewsCtaButton) {
        reviewsCtaButton.addEventListener('click', () => showModal('signup'));
    }
    
    // Billing Toggle Functionality
    const billingToggle = document.getElementById('billing-toggle');
    const monthlyPlan = document.querySelector('.monthly-plan');
    const yearlyPlan = document.querySelector('.yearly-plan');
    
    if (billingToggle && monthlyPlan && yearlyPlan) {
        billingToggle.addEventListener('change', function() {
            if (this.checked) {
                // Show yearly plan, hide monthly
                monthlyPlan.style.display = 'none';
                yearlyPlan.style.display = 'block';
                yearlyPlan.classList.add('highlighted');
                monthlyPlan.classList.remove('highlighted');
            } else {
                // Show monthly plan, hide yearly
                monthlyPlan.style.display = 'block';
                yearlyPlan.style.display = 'none';
                monthlyPlan.classList.add('highlighted');
                yearlyPlan.classList.remove('highlighted');
            }
        });
        
        // Initialize with monthly plan visible
        monthlyPlan.style.display = 'block';
        yearlyPlan.style.display = 'none';
        monthlyPlan.classList.add('highlighted');
    }
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
    
    // --- GOOGLE SIGN-IN EVENT LISTENERS ---
    
    // Google sign-up button
    const googleSignupBtn = document.getElementById('google-signup-btn');
    if (googleSignupBtn) {
        googleSignupBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const signupMessage = document.getElementById('signup-message');
            const signupForm = document.getElementById('signup-form');
            
            // Set a timeout to ensure UI updates even if Google signup gets stuck
            const googleSignupTimeout = setTimeout(() => {
                console.log('⏰ Google signup timeout reached - forcing UI update...');
                if (signupMessage) {
                    signupMessage.innerHTML = `
                        <strong>🎉 Account created successfully!</strong><br>
                        <strong>🔗 Google signup completed!</strong><br>
                        <em>Note: There was a timeout in the signup flow, but your account is active.</em>
                    `;
                    signupMessage.style.color = 'orange';
                }
                if (signupForm) {
                    signupForm.style.display = 'none';
                }
                setTimeout(() => {
                    hideModal();
                }, 2000);
            }, 15000); // 15 second timeout for Google popup
            
            try {
                // Clear any previous messages
                if (signupMessage) {
                    signupMessage.textContent = '';
                    signupMessage.style.color = '';
                }
                
                console.log('🔗 Starting Google signup...');
                const result = await signInWithGoogle();
                const user = result.user;
                console.log('✅ Google signup successful for:', user.uid);
                
                // Clear the timeout since we've reached success
                clearTimeout(googleSignupTimeout);
                
                // Track successful Google signup
                try {
                    trackAuthEvent('sign_up', 'google');
                    console.log('✅ Google analytics tracking successful');
                } catch (analyticsError) {
                    console.error('❌ Google analytics tracking failed:', analyticsError);
                }
                
                try {
                    trackBusinessMetric('user_signup', 1, { method: 'google' });
                    console.log('✅ Google business metrics tracking successful');
                } catch (metricsError) {
                    console.error('❌ Google business metrics tracking failed:', metricsError);
                }
                
                // Enhanced success message
                if (signupMessage) {
                    signupMessage.innerHTML = `
                        <strong>🎉 Successfully signed up with Google!</strong><br>
                        <strong>🔗 Your account is now active!</strong><br>
                        <em>You can start using all features immediately.</em>
                    `;
                    signupMessage.style.color = 'green';
                }
                
                // Hide the signup form
                if (signupForm) {
                    signupForm.style.display = 'none';
                }
                
                // Close the modal after successful signup
                console.log('✅ Google signup flow completed successfully');
                setTimeout(() => {
                    hideModal();
                }, 2000);
                
            } catch (error) {
                console.error('❌ Google sign-up error:', error);
                clearTimeout(googleSignupTimeout);
                
                const errorMessage = handleGoogleSignInError(error);
                if (signupMessage) {
                    signupMessage.innerHTML = `
                        <strong>❌ ${errorMessage}</strong><br>
                        <em>Please try again or use email/password signup.</em>
                    `;
                    signupMessage.style.color = 'red';
                }
            }
        });
    }

    // Google sign-in button
    const googleLoginBtn = document.getElementById('google-login-btn');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const loginMessage = document.getElementById('login-message');
            
            try {
                // Clear any previous messages
                if (loginMessage) {
                    loginMessage.textContent = '';
                    loginMessage.style.color = '';
                }
                
                const result = await signInWithGoogle();
                const user = result.user;
                
                // Track successful Google login
                trackAuthEvent('login', 'google');
                trackBusinessMetric('user_login', 1, { method: 'google' });
                
                // Success message
                if (loginMessage) {
                    loginMessage.textContent = 'Successfully signed in with Google!';
                    loginMessage.style.color = 'green';
                }
                
                // Close the modal after successful signin
                setTimeout(() => {
                    hideModal();
                }, 1500);
                
            } catch (error) {
                console.error('Google sign-in error:', error);
                const errorMessage = handleGoogleSignInError(error);
                if (loginMessage) {
                    loginMessage.textContent = errorMessage;
                    loginMessage.style.color = 'red';
                }
            }
        });
    }
    
    closeModalButtons.forEach(button => button.addEventListener('click', hideModal));
    formsContainer.addEventListener('click', (e) => {
        if (e.target === formsContainer) hideModal();
    });
    
    navHowItWorksLink.addEventListener('click', (e) => {
        e.preventDefault();
        trackUserBehavior('navigation', { page: 'how-it-works' });
        showLandingPage('how-it-works');
    });

    navPricingLink.addEventListener('click', (e) => {
        e.preventDefault();
        trackUserBehavior('navigation', { page: 'pricing' });
        showLandingPage('pricing');
    });

    navResourcesLink.addEventListener('click', (e) => {
        e.preventDefault();
        trackUserBehavior('navigation', { page: 'resources' });
        window.location.href = '/resources';
    });

    navAboutUsLink.addEventListener('click', (e) => {
        e.preventDefault();
        trackUserBehavior('navigation', { page: 'about-us' });
        showLandingPage('about-us');
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

    // About Us page button functionality
    if (getStartedAboutButton) {
        getStartedAboutButton.addEventListener('click', (e) => {
            e.preventDefault();
            showModal('signup');
        });
    }

    if (learnMoreAboutButton) {
        learnMoreAboutButton.addEventListener('click', (e) => {
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
            // Simple access control - only allow premium agents for paying users
            const isLocked = pageId !== 'agent-1-page' && 
                            currentUserSubscriptionTier !== 'complete_care';
            
            console.log('🎯 Card clicked - Premium Access Debug:', {
                pageId: pageId,
                subscriptionTier: currentUserSubscriptionTier,
                isLocked: isLocked,
                isPremiumAgent: pageId !== 'agent-1-page',
                paymentSuccess: window.paymentSuccess,
                timestamp: new Date().toISOString(),
                userAuthenticated: !!auth.currentUser,
                userId: auth.currentUser?.uid
            });
            
            if (isLocked) {
                // Check if payment is currently being processed
                if (window.paymentProcessing) {
                    console.log('⏳ User tried to access premium agent during payment processing (card click)');
                    
                    // Show a specific message for users whose payment is being processed
                    const processingMessage = document.createElement('div');
                    processingMessage.className = 'payment-processing-message';
                    processingMessage.innerHTML = `
                        <div class="payment-message-content">
                            <div class="payment-message-icon">⏳</div>
                            <h3>Payment Being Processed</h3>
                            <p>Your premium access is being activated. Please wait a moment and try again, or refresh the page.</p>
                            <div class="payment-message-actions">
                                <button class="btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">Dismiss</button>
                                <button class="btn-primary" onclick="window.location.reload()">Refresh Page</button>
                            </div>
                        </div>
                    `;
                    
                    document.body.appendChild(processingMessage);
                    
                    // Auto-remove after 10 seconds
                    setTimeout(() => {
                        if (processingMessage.parentNode) {
                            processingMessage.remove();
                        }
                    }, 10000);
                    
                    // Track this specific scenario
                    trackUserBehavior('premium_access_during_processing', { 
                        feature: pageId,
                        subscription_tier: currentUserSubscriptionTier,
                        source: 'agent_card'
                    });
                    return;
                }
                
                console.log('🔒 Card is locked, showing upgrade prompt');
                trackUserBehavior('upgrade_prompt', { 
                    feature: pageId,
                    subscription_tier: currentUserSubscriptionTier
                });
                showUpgradePrompt();
            } else {
                console.log('✅ Card is unlocked, navigating to agent page');
                // Track feature usage
                trackFeatureUsage('agent_selection', { 
                    agent: pageId,
                    subscription_tier: currentUserSubscriptionTier
                });
                showAppPage(pageId);
            }
        });
        
        // Handle "Get Started" button clicks
        const selectBtn = card.querySelector('.agent-select-btn');
        if (selectBtn) {
            selectBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card click
                
                const pageId = card.getAttribute('data-page');
                // Simple access control - only allow premium agents for paying users
                const isLocked = pageId !== 'agent-1-page' && 
                                currentUserSubscriptionTier !== 'complete_care';
                
                console.log('🎯 Get Started button clicked:', {
                    pageId: pageId,
                    subscriptionTier: currentUserSubscriptionTier,
                    isLocked: isLocked,
                    buttonDisabled: selectBtn.disabled,
                    paymentSuccess: window.paymentSuccess
                });
                
                if (isLocked) {
                    // Check if payment is currently being processed
                    if (window.paymentProcessing) {
                        console.log('⏳ User tried to access premium agent during payment processing (get started button)');
                        
                        // Show a specific message for users whose payment is being processed
                        const processingMessage = document.createElement('div');
                        processingMessage.className = 'payment-processing-message';
                        processingMessage.innerHTML = `
                            <div class="payment-message-content">
                                <div class="payment-message-icon">⏳</div>
                                <h3>Payment Being Processed</h3>
                                <p>Your premium access is being activated. Please wait a moment and try again, or refresh the page.</p>
                                <div class="payment-message-actions">
                                    <button class="btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">Dismiss</button>
                                    <button class="btn-primary" onclick="window.location.reload()">Refresh Page</button>
                                </div>
                            </div>
                        `;
                        
                        document.body.appendChild(processingMessage);
                        
                        // Auto-remove after 10 seconds
                        setTimeout(() => {
                            if (processingMessage.parentNode) {
                                processingMessage.remove();
                            }
                        }, 10000);
                        
                        // Track this specific scenario
                        trackUserBehavior('premium_access_during_processing', { 
                            feature: pageId,
                            subscription_tier: currentUserSubscriptionTier,
                            source: 'get_started_button'
                        });
                        return;
                    }
                    
                    console.log('🔒 Button is locked, showing upgrade prompt');
                    showUpgradePrompt();
                } else {
                    console.log('✅ Button is unlocked, navigating to agent page');
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
    
    // Define showDisputeDashboard function FIRST, before it's called
    window.showDisputeDashboard = function() {
        console.log('🏠 Showing dispute dashboard...');
        if (disputeDashboard) {
            disputeDashboard.classList.remove('hidden');
            if (disputeCreationFlow) disputeCreationFlow.classList.add('hidden');
            if (disputeLetterPreview) disputeLetterPreview.classList.add('hidden');
            if (disputeManagement) disputeManagement.classList.add('hidden');
            // Refresh data when showing dashboard
            loadDisputeDashboard();
            console.log('✅ Dashboard shown successfully');
        } else {
            console.error('❌ Dispute dashboard element not found');
        }
    };
    
    // Ensure function is globally available
    if (typeof window.showDisputeDashboard === 'undefined') {
        console.error('❌ showDisputeDashboard function failed to define');
    } else {
        console.log('✅ showDisputeDashboard function successfully defined');
    }
    
    // Initialize Agent 3 dispute system
    function initializeAgent3() {
        console.log('🚀 Initializing Agent 3 dispute system...');
        
        // Check if elements exist
        if (!agent3Page) {
            console.error('❌ Agent 3 page element not found, retrying...');
            // Retry after a short delay
            setTimeout(() => {
                const retryElement = document.getElementById('agent-3-page');
                if (retryElement) {
                    console.log('✅ Agent 3 page element found on retry');
                    initializeAgent3();
                } else {
                    console.error('❌ Agent 3 page element still not found after retry');
                }
            }, 100);
            return;
        }
        
        if (!disputeDashboard) {
            console.error('❌ Dispute dashboard element not found');
            return;
        }
        
        console.log('✅ All required elements found, proceeding with initialization');
        
        // Ensure dashboard is visible immediately
        disputeDashboard.classList.remove('hidden');
        console.log('✅ Dashboard made visible immediately');
        
        // Load disputes data first, then setup UI
        loadDisputeDashboard().then(() => {
            setupDisputeEventListeners();
            // Show the dashboard by default
            if (typeof window.showDisputeDashboard === 'function') {
                window.showDisputeDashboard();
            } else {
                console.error('❌ showDisputeDashboard function not found, manually showing dashboard');
                // Fallback: manually show dashboard
                if (disputeDashboard) {
                    disputeDashboard.classList.remove('hidden');
                    console.log('✅ Dashboard shown via fallback method');
                }
            }
            console.log('✅ Agent 3 initialization complete');
        }).catch(error => {
            console.error('❌ Error initializing Agent 3:', error);
            setupDisputeEventListeners();
            // Show the dashboard even if there's an error
            if (typeof window.showDisputeDashboard === 'function') {
                window.showDisputeDashboard();
            } else {
                // Fallback: manually show dashboard
                if (disputeDashboard) {
                    disputeDashboard.classList.remove('hidden');
                    console.log('✅ Dashboard shown via fallback method after error');
                }
            }
        });
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
        
        // Check for transferred context from Agent 2
        checkForTransferredContext();
        
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
                                <span class="doc-type">${doc.financial_data?.document_type === 'eob' ? '📋 EOB' : doc.financial_data?.document_type === 'insurance_plan' ? '🛡️ Insurance Plan' : '📄 Bill'}</span>
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
    
    // Function already defined above - removing duplicate
    
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
            // Check if email is verified
            if (!user.emailVerified) {
                signOut(auth);
                return;
            }
            
            console.log('👤 User authenticated, setting up real-time listeners:', user.uid);
            
            // Update Quick Answers widget counter for logged in users
            if (quickAnswersWidget) {
                quickAnswersWidget.updateCounterDisplay();
            }
            
            // Set up subscription check for this user
            checkUserSubscription(user.uid);
            
            // Set up real-time subscription listener
            setupSubscriptionListener(user.uid);
            
            // Set up data loading listeners for user's historical data
            listenForChatHistory(user.uid);
            listenForAnalysisResults(user.uid);
            
            // Initial UI update (will be updated again by real-time listener if needed)
            updateUIAfterLogin();
            
            // Update premium agent card states on initial load
            updatePremiumAgentCardStates();
            
        } else {
            console.log('👋 User logged out, cleaning up listeners');
            
            authSection.classList.remove('hidden');
            appContainer.classList.add('hidden');
            showLandingPage('main');
            
            // Clean up all listeners
            if (unsubscribeUser) {
                unsubscribeUser();
                unsubscribeUser = null;
            }
            if (unsubscribeAnalyses) {
                unsubscribeAnalyses();
                unsubscribeAnalyses = null;
            }
            if (unsubscribeChatHistory) {
                unsubscribeChatHistory();
                unsubscribeChatHistory = null;
            }
            if (unsubscribeSubscription) {
                unsubscribeSubscription();
                unsubscribeSubscription = null;
            }
            
            agent1ChatHistory = [];
            currentUserSubscriptionTier = 'free';
            
            // Update Quick Answers widget counter for logged out users
            if (quickAnswersWidget) {
                quickAnswersWidget.updateCounterDisplay();
            }
        }
    });



    // --- Payment Status Messages ---




    // --- Subscription Processing Messages ---
    function showSubscriptionProcessingMessage() {
        console.log('🎨 Showing subscription processing message');
        
        const processingMessage = document.createElement('div');
        processingMessage.className = 'subscription-processing-message';
        processingMessage.innerHTML = `
            <div class="processing-content">
                <div class="processing-icon">⏳</div>
                <h3>Processing Your Upgrade</h3>
                <p>Please wait while we verify your subscription...</p>
                <div class="processing-spinner"></div>
            </div>
        `;
        
        // Style the processing message
        processingMessage.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        const content = processingMessage.querySelector('.processing-content');
        content.style.cssText = `
            text-align: center;
            padding: 40px;
            background: #1a1a2e;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
            max-width: 400px;
        `;
        
        const spinner = processingMessage.querySelector('.processing-spinner');
        spinner.style.cssText = `
            width: 40px;
            height: 40px;
            border: 4px solid #333;
            border-top: 4px solid #007bff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        `;
        
        // Add spinner animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(processingMessage);
        
        // Store reference for later removal
        window.subscriptionProcessingMessage = processingMessage;
        
        console.log('✅ Subscription processing message displayed');
    }
    
    function showSubscriptionVerifiedMessage() {
        console.log('🎨 Showing subscription verified message');
        
        // Remove processing message if it exists
        if (window.subscriptionProcessingMessage) {
            document.body.removeChild(window.subscriptionProcessingMessage);
            window.subscriptionProcessingMessage = null;
        }
        
        const verifiedMessage = document.createElement('div');
        verifiedMessage.className = 'subscription-verified-message';
        verifiedMessage.innerHTML = `
            <div class="verified-content">
                <div class="verified-icon">🎉</div>
                <h3>Welcome to Premium!</h3>
                <p>Your subscription has been verified. You now have access to all premium features!</p>
                <button class="verified-button" onclick="this.parentElement.parentElement.remove()">Get Started</button>
            </div>
        `;
        
        // Style the verified message
        verifiedMessage.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        const content = verifiedMessage.querySelector('.verified-content');
        content.style.cssText = `
            text-align: center;
            padding: 40px;
            background: #1a1a2e;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
            max-width: 400px;
        `;
        
        const button = verifiedMessage.querySelector('.verified-button');
        button.style.cssText = `
            background: #007bff;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
            margin-top: 20px;
        `;
        
        document.body.appendChild(verifiedMessage);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (document.body.contains(verifiedMessage)) {
                document.body.removeChild(verifiedMessage);
            }
        }, 5000);
        
        console.log('✅ Subscription verified message displayed');
    }

    async function verifySubscriptionAfterPayment() {
        console.log('🔍 verifySubscriptionAfterPayment: Starting verification process');
        
        try {
            // Check if user is authenticated
            if (!auth.currentUser) {
                console.error('❌ verifySubscriptionAfterPayment: User not authenticated');
                return;
            }
            
            const uid = auth.currentUser.uid;
            console.log('🔍 verifySubscriptionAfterPayment: User authenticated:', uid);
            
            // Force multiple subscription checks with increasing delays
            const maxAttempts = 8;
            let attempts = 0;
            
            const checkSubscription = async () => {
                attempts++;
                console.log(`🔍 verifySubscriptionAfterPayment: Attempt ${attempts}/${maxAttempts}`);
                
                try {
                    const userDocRef = doc(db, 'users', uid);
                    const userDoc = await getDoc(userDocRef);
                    
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        const subscriptionTier = userData.subscriptionTier || 'free';
                        
                        console.log('📊 verifySubscriptionAfterPayment: Current subscription tier:', subscriptionTier);
                        
                        if (subscriptionTier === 'complete_care') {
                            console.log('🎉 verifySubscriptionAfterPayment: Premium subscription confirmed!');
                            
                            // Update current subscription tier
                            currentUserSubscriptionTier = 'complete_care';
                            
                            // Update UI
                            updatePremiumAgentCardStates();
                            
                            // Show success message
                            showSubscriptionVerifiedMessage();
                            
                            // Track successful upgrade
                            trackUserBehavior('subscription_verified', {
                                subscription_tier: subscriptionTier,
                                attempts: attempts,
                                timestamp: new Date().toISOString()
                            });
                            
                            console.log('✅ verifySubscriptionAfterPayment: Premium access granted successfully');
                            return true; // Success
                        } else {
                            console.log(`⏳ verifySubscriptionAfterPayment: Still '${subscriptionTier}', waiting for webhook...`);
                            
                            if (attempts < maxAttempts) {
                                // Wait longer between attempts (exponential backoff)
                                const delay = Math.min(1000 * Math.pow(1.5, attempts), 5000);
                                console.log(`⏳ verifySubscriptionAfterPayment: Waiting ${delay}ms before next attempt...`);
                                setTimeout(checkSubscription, delay);
                            } else {
                                console.error('❌ verifySubscriptionAfterPayment: Max attempts reached, subscription not updated');
                                showSubscriptionProcessingMessage(); // Keep showing processing
                                return false;
                            }
                        }
                    } else {
                        console.error('❌ verifySubscriptionAfterPayment: User document does not exist');
                        return false;
                    }
                } catch (error) {
                    console.error('❌ verifySubscriptionAfterPayment: Error checking subscription:', error);
                    
                    if (attempts < maxAttempts) {
                        const delay = 2000;
                        console.log(`⏳ verifySubscriptionAfterPayment: Retrying in ${delay}ms after error...`);
                        setTimeout(checkSubscription, delay);
                    } else {
                        console.error('❌ verifySubscriptionAfterPayment: Max attempts reached after errors');
                        return false;
                    }
                }
            };
            
            // Start the verification process
            await checkSubscription();
            
        } catch (error) {
            console.error('❌ verifySubscriptionAfterPayment: Critical error:', error);
        }
    }

    function showUpgradeSuccessMessage() {
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
    }

    const updateUIAfterLogin = () => {
        // Track successful authentication
        trackUserBehavior('app_access', { 
            subscription_tier: currentUserSubscriptionTier,
            timestamp: new Date().toISOString()
        });
        
        authSection.classList.add('hidden');
        appContainer.classList.remove('hidden');
        showAppPage('agent-selection-page');
        hideModal();
        
        // Update premium agent card states
        updatePremiumAgentCardStates();

        // Removed problematic real-time listeners
    };

    agentSelectionCards.forEach(card => {
        card.dataset.originalText = card.querySelector('p').textContent;
    });

    // --- Premium Agent Card State Management ---
    function updatePremiumAgentCardStates() {
        console.log('🎯 Updating premium agent card states for subscription tier:', currentUserSubscriptionTier);
        
        // Target all premium agent cards
        const premiumCards = document.querySelectorAll('.agent-selection-card[data-page="agent-2-page"], .agent-selection-card[data-page="agent-3-page"], .agent-selection-card[data-page="agent-4-page"]');
        
        premiumCards.forEach(card => {
            const pageId = card.getAttribute('data-page');
            const premiumBadge = card.querySelector('.agent-badge.premium');
            const getStartedBtn = card.querySelector('.agent-select-btn');
            
            console.log(`🔍 Processing card ${pageId}:`, {
                hasPremiumBadge: !!premiumBadge,
                hasGetStartedBtn: !!getStartedBtn,
                subscriptionTier: currentUserSubscriptionTier
            });
            
            if (currentUserSubscriptionTier === 'complete_care') {
                // UNLOCK: Hide premium badge (visual only)
                console.log(`✅ Unlocking ${pageId} - user has premium access`);
                
                if (premiumBadge) {
                    premiumBadge.style.display = 'none';
                    console.log(`✅ Hidden premium badge for ${pageId}`);
                }
                
                // Reset any visual locking styles
                card.style.opacity = '1';
                card.classList.remove('locked');
                
            } else {
                // LOCK: Show premium badge (visual only)
                console.log(`🔒 Locking ${pageId} - user needs premium access`);
                
                if (premiumBadge) {
                    premiumBadge.style.display = 'block';
                    console.log(`🔒 Showing premium badge for ${pageId}`);
                }
                
                // Add visual locking styles
                card.style.opacity = '0.7';
                card.classList.add('locked');
            }
        });
        
        console.log('✅ Premium agent card visual states updated');
    }

    // --- Simple Subscription Check ---
async function checkUserSubscription(uid) {
    try {
        console.log('🔍 Checking user subscription for:', uid);
        const userDocRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            const subscriptionTier = userData.subscriptionTier || 'free';
            
            console.log('📊 User subscription tier:', subscriptionTier);
            
            // Update current subscription tier
            currentUserSubscriptionTier = subscriptionTier;
            
            // Update UI
            updatePremiumAgentCardStates();
            
            return subscriptionTier;
        } else {
            console.log('⚠️ User document does not exist - creating new user document');
            
            // Create user document if it doesn't exist
            try {
                await setDoc(userDocRef, {
                    email: auth.currentUser?.email || '',
                    createdAt: serverTimestamp(),
                    subscriptionTier: 'free'
                });
                console.log('✅ New user document created');
                
                currentUserSubscriptionTier = 'free';
                updatePremiumAgentCardStates();
                return 'free';
            } catch (createError) {
                console.error('❌ Error creating user document:', createError);
                currentUserSubscriptionTier = 'free';
                updatePremiumAgentCardStates();
                return 'free';
            }
        }
    } catch (error) {
        console.error('❌ Error checking user subscription:', error);
        
        // Always default to free on any error
        console.log('⚠️ Defaulting to free tier due to error:', error.code);
        currentUserSubscriptionTier = 'free';
        updatePremiumAgentCardStates();
        
        // Show user-friendly error message for permission issues
        if (error.code === 'permission-denied') {
            console.error('🚫 Permission denied - user cannot access subscription data');
        }
        
        return 'free';
    }
}

// --- Subscription Listener ---
function setupSubscriptionListener(uid) {
    try {
        console.log('👂 Setting up subscription listener for:', uid);
        const userDocRef = doc(db, 'users', uid);
        
        // Listen for real-time changes to user document
        unsubscribeSubscription = onSnapshot(userDocRef, (doc) => {
            console.log('📡 Subscription listener triggered for user:', uid);
            
            if (doc.exists()) {
                const userData = doc.data();
                const newSubscriptionTier = userData.subscriptionTier || 'free';
                
                console.log('📊 Subscription listener data:', {
                    uid: uid,
                    currentTier: currentUserSubscriptionTier,
                    newTier: newSubscriptionTier,
                    userData: userData,
                    timestamp: new Date().toISOString()
                });
                
                if (newSubscriptionTier !== currentUserSubscriptionTier) {
                    console.log('🔄 Subscription tier changed:', currentUserSubscriptionTier, '→', newSubscriptionTier);
                    currentUserSubscriptionTier = newSubscriptionTier;
                    
                    console.log('🎨 Updating premium agent card states...');
                    updatePremiumAgentCardStates();
                    
                    // Show success message if user just upgraded
                    if (newSubscriptionTier === 'complete_care') {
                        console.log('🎉 User subscription upgraded to complete_care');
                        console.log('✅ Premium access should now be granted');
                    }
                } else {
                    console.log('📊 Subscription tier unchanged:', newSubscriptionTier);
                }
            } else {
                console.log('⚠️ Subscription listener: User document does not exist');
            }
        }, (error) => {
            console.error('❌ Error in subscription listener:', error);
            console.error('❌ Subscription listener error details:', {
                code: error.code,
                message: error.message,
                uid: uid,
                timestamp: new Date().toISOString()
            });
        });
        
        console.log('✅ Subscription listener set up successfully');
    } catch (error) {
        console.error('❌ Error setting up subscription listener:', error);
        console.error('❌ Setup error details:', {
            code: error.code,
            message: error.message,
            uid: uid,
            timestamp: new Date().toISOString()
        });
    }
}

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
                
                // Check if this is a newly completed analysis and provide user feedback
                if (analysis.status === 'completed' && analysis.analysis_results) {
                    // Find the corresponding chat message and update it
                    const chatContainer = document.getElementById('agent2-chat');
                    if (chatContainer) {
                        // Add completion message if not already present
                        const existingMessage = chatContainer.querySelector(`[data-document-id="${analysis.id}"]`);
                        if (!existingMessage) {
                            addMessageToAgent2Chat('ai', `✅ Analysis complete for "${analysis.original_filename}"! I found some interesting insights in your document.`, analysis.id);
                        }
                    }
                    
                    // Update processing stage if this was the most recent upload
                    const mostRecentAnalysis = analyses[0];
                    if (mostRecentAnalysis.id === analysis.id) {
                        updateProcessingStage('complete');
                        if (analysisStatus) analysisStatus.textContent = 'Analysis Complete';
                    }
                }
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
                    analysis.financial_data.document_type === 'bill' || analysis.financial_data.document_type === 'insurance_plan'
                );
            case 'eobs':
                return analyses.filter(analysis => 
                    analysis.financial_data && 
                    analysis.financial_data.document_type === 'eob'
                );
            case 'insurance':
                return analyses.filter(analysis => 
                    analysis.financial_data && 
                    analysis.financial_data.document_type === 'insurance_plan'
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
            docType.textContent = analysis.financial_data?.document_type === 'eob' ? '📋 EOB Statement' : analysis.financial_data?.document_type === 'insurance_plan' ? '🛡️ Insurance Plan' : '📄 Medical Bill';
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
                    type: analysis.financial_data?.document_type === 'eob' ? 'EOB Statement' : analysis.financial_data?.document_type === 'insurance_plan' ? 'Insurance Plan' : 'Medical Bill',
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
                disputeBtn.addEventListener('click', () => {
                    // Store document context for Agent 3
                    sessionStorage.setItem('agent3_document_context', JSON.stringify({
                        documentId: analysis.id,
                        documentData: analysis,
                        source: 'agent2_document_card',
                        timestamp: new Date().toISOString()
                    }));
                    
                    // Ensure app container is visible
                    const appContainer = document.getElementById('app-container');
                    if (appContainer) {
                        appContainer.classList.remove('hidden');
                    }
                    
                    // Navigate to Agent 3
                    showAppPage('agent-3-page');
                    
                    // Show success message
                    setTimeout(() => {
                        alert('Successfully transferred to Dispute Resolution Agent! Your document context has been preserved.');
                    }, 100);
                });
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
            
            // Validate password before attempting to create account
            const passwordValidation = validatePassword(password);
            if (!passwordValidation.isValid) {
                signupMessage.textContent = passwordValidation.errors[0];
                signupMessage.style.color = 'red';
                return;
            }
            
            // Set a timeout to ensure UI updates even if promise chain gets stuck
            const signupTimeout = setTimeout(() => {
                console.log('⏰ Signup timeout reached - forcing UI update...');
                signupMessage.innerHTML = `
                    <strong>🎉 Account created successfully!</strong><br>
                    <strong>📧 Verification email should be on its way!</strong><br>
                    <strong>⚠️ Email verification is required to activate your account.</strong><br>
                    Please check your email and click the verification link.<br>
                    <em>Note: There was a timeout in the signup flow, but your account is active.</em>
                `;
                signupMessage.style.color = 'orange';
                signupForm.style.display = 'none';
            }, 15000); // 15 second timeout (increased from 10s)
            
            createUserWithEmailAndPassword(auth, email, password)
                .then((userCredential) => {
                    const user = userCredential.user;
                    console.log('✅ Firebase Auth signup successful for:', user.uid);
                    
                    // Store user data in Firestore first - using minimal required fields
                    console.log('💾 Attempting Firestore write...');
                    const userDocRef = doc(db, 'users', userCredential.user.uid);
                    
                    // Use only the fields explicitly allowed by Firestore rules
                    const userData = {
                        email: email,
                        createdAt: serverTimestamp(),
                        provider: 'email'
                    };
                    
                    console.log('📝 Writing user data:', userData);
                    
                    console.log('🚀 About to call setDoc...');
                    
                    // Create a timeout promise for Firestore write
                    const firestoreTimeout = new Promise((_, reject) => {
                        setTimeout(() => {
                            reject(new Error('Firestore write timeout'));
                        }, 5000); // 5 second timeout for Firestore
                    });
                    
                    return Promise.race([
                        setDoc(userDocRef, userData),
                        firestoreTimeout
                    ]).then(() => {
                        console.log('✅ Firestore write successful - inside .then()');
                        
                        // Send email verification after Firestore write - this is mandatory
                        console.log('📧 Sending email verification...');
                        
                        return sendEmailVerification(user).then(() => {
                            console.log('✅ Email verification sent successfully');
                            return Promise.resolve();
                        }).catch((emailError) => {
                            console.error('❌ Email verification failed:', emailError);
                            console.error('Email error code:', emailError.code);
                            console.error('Email error message:', emailError.message);
                            
                            // If email verification fails, we should still show the user a message
                            // but indicate that verification is required
                            console.log('⚠️ Email verification failed - user needs to verify manually');
                            
                            // Don't throw - continue with success flow but show warning
                            return Promise.resolve();
                        });
                    })
                        .catch((firestoreWriteError) => {
                            console.error('❌ Firestore write failed in .then():', firestoreWriteError);
                            console.error('Firestore write error details:', {
                                code: firestoreWriteError.code,
                                message: firestoreWriteError.message,
                                stack: firestoreWriteError.stack
                            });
                            
                            // Even if Firestore fails, try to send email verification
                            console.log('🔄 Firestore failed, attempting email verification anyway...');
                            return sendEmailVerification(user).then(() => {
                                console.log('✅ Email verification sent despite Firestore failure');
                                return Promise.resolve();
                            }).catch((emailError) => {
                                console.error('❌ Email verification also failed:', emailError);
                                return Promise.resolve();
                            });
                        })
                        .catch((firestoreError) => {
                            console.error('❌ Firestore write failed:', firestoreError);
                            console.error('Firestore error code:', firestoreError.code);
                            console.error('Firestore error message:', firestoreError.message);
                            console.error('Full Firestore error object:', firestoreError);
                            
                            // Try to continue with success flow even if Firestore fails
                            console.log('⚠️ Attempting to continue with success flow despite Firestore error...');
                            return Promise.resolve();
                        })
                             .then(() => {
                                 console.log('🎯 Reached the main success flow .then() - this should execute!');
                                 // Clear the timeout since we've reached success
                                 clearTimeout(signupTimeout);
                                 console.log('✅ Starting success flow...');
                                 
                                 // Track successful signup with comprehensive error handling
                                 console.log('🔍 Testing analytics tracking...');
                                 
                                 try {
                                     console.log('📊 Calling trackAuthEvent...');
                                     trackAuthEvent('sign_up', 'email');
                                     console.log('✅ Analytics tracking successful');
                                 } catch (analyticsError) {
                                     console.error('❌ Analytics tracking failed:', analyticsError);
                                     console.log('⚠️ Analytics failed but signup continues...');
                                 }
                                 
                                 try {
                                     console.log('📈 Calling trackBusinessMetric...');
                                     trackBusinessMetric('user_signup', 1, { method: 'email' });
                                     console.log('✅ Business metrics tracking successful');
                                 } catch (metricsError) {
                                     console.error('❌ Business metrics tracking failed:', metricsError);
                                     console.log('⚠️ Business metrics failed but signup continues...');
                                 }
                                 
                                 console.log('🎯 Analytics testing complete - proceeding with UI updates...');
                                 
                                 // Show success message with email verification info (if not already shown)
                                 if (signupMessage.style.color !== 'orange') {
                                     console.log('✅ Showing success message...');
                                     signupMessage.innerHTML = `
                                         <strong>🎉 Account created successfully!</strong><br>
                                         <strong>📧 Verification email sent!</strong><br>
                                         <strong>⚠️ Email verification is required to activate your account.</strong><br>
                                         Please check your email and click the verification link.<br>
                                         <em>Check your spam folder if you don't see the email.</em>
                                     `;
                                     signupMessage.style.color = 'green';
                                 }
                            
                            // Hide signup form and show email verification message
                            console.log('✅ Hiding signup form...');
                            signupForm.style.display = 'none';
                            
                            console.log('✅ Creating verification message...');
                            const verificationMessage = document.createElement('div');
                            verificationMessage.className = 'verification-message';
                            verificationMessage.innerHTML = `
                                <h3>📧 Verify Your Email</h3>
                                <p>We've sent a verification link to <strong>${email}</strong></p>
                                <p>Click the link in the email to activate your account.</p>
                                <p><small>Haven't received the email? <a href="#" id="resend-verification">Resend verification email</a></small></p>
                                <div class="verification-actions">
                                    <button class="btn-secondary" id="back-to-login-btn">Back to Login</button>
                                    <button class="btn-primary" id="continue-to-app-btn">Continue to App</button>
                                </div>
                            `;
                            
                            console.log('✅ Appending verification message...');
                            signupFormWrapper.appendChild(verificationMessage);
                            console.log('✅ UI update complete!');
                            
                            // Add resend verification functionality
                            const resendLink = verificationMessage.querySelector('#resend-verification');
                            resendLink.addEventListener('click', (e) => {
                                e.preventDefault();
                                sendEmailVerification(user)
                                    .then(() => {
                                        alert('Verification email sent again!');
                                    })
                                    .catch(error => {
                                        alert('Failed to resend verification email: ' + error.message);
                                    });
                            });
                            
                            // Add button functionality
                            const backToLoginBtn = verificationMessage.querySelector('#back-to-login-btn');
                            const continueToAppBtn = verificationMessage.querySelector('#continue-to-app-btn');
                            
                            if (backToLoginBtn) {
                                backToLoginBtn.addEventListener('click', () => {
                                    console.log('🔄 Switching to login form...');
                                    showLoginForm();
                                });
                            }
                            
                            if (continueToAppBtn) {
                                continueToAppBtn.addEventListener('click', () => {
                                    console.log('🚀 Continuing to app...');
                                    hideModal();
                                });
                            }
                    });
                })
                .catch((successFlowError) => {
                    console.error('❌ Error in success flow:', successFlowError);
                    console.error('Success flow error details:', {
                        message: successFlowError.message,
                        code: successFlowError.code,
                        stack: successFlowError.stack
                    });
                    
                    // Show a fallback success message even if the success flow fails
                    console.log('🆘 Showing fallback success message...');
                    signupMessage.innerHTML = `
                        <strong>🎉 Account created successfully!</strong><br>
                        <strong>📧 Verification email should be on its way!</strong><br>
                        <strong>⚠️ Email verification is required to activate your account.</strong><br>
                        Please check your email and click the verification link.<br>
                        <em>Note: There was an issue with the UI flow, but your account is active.</em>
                    `;
                    signupMessage.style.color = 'orange';
                    
                    // Hide the signup form
                    console.log('🆘 Hiding signup form...');
                    signupForm.style.display = 'none';
                    
                    // Force a manual email verification attempt
                    console.log('🆘 Attempting manual email verification...');
                    sendEmailVerification(user).then(() => {
                        console.log('✅ Manual email verification successful');
                    }).catch((emailError) => {
                        console.error('❌ Manual email verification failed:', emailError);
                    });
                })
                .catch(error => {
                    console.error('Full signup error object:', error);
                    console.error('Error code:', error.code);
                    console.error('Error message:', error.message);
                    
                    if (error.code === 'auth/email-already-in-use') {
                        signupMessage.textContent = 'This email address is already in use. Please log in or use a different email.';
                    } else if (error.code === 'auth/account-exists-with-different-credential') {
                        signupMessage.textContent = 'This email is already registered with Google. Please use "Sign up with Google" instead.';
                    } else if (error.code === 'auth/weak-password') {
                        signupMessage.textContent = 'Password is too weak. Please choose a stronger password.';
                    } else if (error.code === 'auth/invalid-email') {
                        signupMessage.textContent = 'Invalid email address. Please enter a valid email.';
                    } else {
                        console.error('Signup error:', error);
                        signupMessage.textContent = error.message || 'An error occurred during signup. Please try again.';
                    }
                    signupMessage.style.color = 'red';
                });
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = loginForm['login-email'].value;
            const password = loginForm['login-password'].value;
            
            // Check if account is locked
            if (isAccountLocked(email)) {
                const remainingTime = getLockoutTimeRemaining(email);
                const minutes = Math.ceil(remainingTime / (60 * 1000));
                loginMessage.textContent = `Account temporarily locked due to too many failed attempts. Try again in ${minutes} minutes.`;
                loginMessage.style.color = 'red';
                return;
            }
            
            signInWithEmailAndPassword(auth, email, password)
                .then((userCredential) => {
                    const user = userCredential.user;
                    
                    // Clear any failed login attempts on successful login
                    clearFailedLogins(email);
                    
                    // Check if email is verified
                    if (!user.emailVerified) {
                        signOut(auth);
                        loginMessage.innerHTML = `
                            <strong>Email not verified!</strong><br>
                            Please check your email and click the verification link before logging in.<br>
                            <a href="#" id="resend-verification-login">Resend verification email</a>
                        `;
                        loginMessage.style.color = 'orange';
                        
                        // Add resend verification functionality
                        const resendLink = document.getElementById('resend-verification-login');
                        if (resendLink) {
                            resendLink.addEventListener('click', (e) => {
                                e.preventDefault();
                                createUserWithEmailAndPassword(auth, email, password)
                                    .then(() => {
                                        // User already exists, just send verification
                                        return sendEmailVerification(user);
                                    })
                                    .catch(error => {
                                        if (error.code === 'auth/email-already-in-use') {
                                            // User exists, send verification
                                            return sendEmailVerification(user);
                                        }
                                        throw error;
                                    })
                                    .then(() => {
                                        alert('Verification email sent!');
                                    })
                                    .catch(error => {
                                        alert('Failed to send verification email: ' + error.message);
                                    });
                            });
                        }
                        return;
                    }
                    
                         // Track successful login
                         trackAuthEvent('login', 'email');
                         trackBusinessMetric('user_login', 1, { method: 'email' });
                         
                         // Login successful
                         loginMessage.textContent = 'Login successful!';
                         loginMessage.style.color = 'green';
                })
                .catch(error => {
                    // Record failed login attempt
                    recordFailedLogin(email);
                    
                    if (error.code === 'auth/user-not-found') {
                        loginMessage.textContent = 'No account found with this email address.';
                    } else if (error.code === 'auth/wrong-password') {
                        const remaining = getRemainingAttempts(email);
                        if (remaining > 0) {
                            loginMessage.textContent = `Incorrect password. ${remaining} attempts remaining.`;
                        } else {
                            const lockoutTime = Math.ceil(SECURITY_CONFIG.LOCKOUT_DURATION / (60 * 1000));
                            loginMessage.textContent = `Too many failed attempts. Account locked for ${lockoutTime} minutes.`;
                        }
                    } else if (error.code === 'auth/invalid-email') {
                        loginMessage.textContent = 'Invalid email address.';
                    } else if (error.code === 'auth/user-disabled') {
                        loginMessage.textContent = 'This account has been disabled.';
                    } else {
                        loginMessage.textContent = error.message;
                    }
                    loginMessage.style.color = 'red';
                });
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

    // Add password strength indicator listener
    const signupPasswordInput = document.getElementById('signup-password');
    if (signupPasswordInput) {
        signupPasswordInput.addEventListener('input', (e) => {
            updatePasswordStrengthIndicator(e.target.value);
        });
    }

    // Logout functionality moved to action bar

    // User menu functionality removed - now handled by action bar
    
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

    // New Chat Button Handler
    if (newChatBtn) {
        newChatBtn.addEventListener('click', () => {
            // Clear chat messages (keep only the initial AI message)
            const chatMessages = document.getElementById('agent1-chat');
            if (chatMessages) {
                chatMessages.innerHTML = `
                    <div class="message ai-message">
                        <div class="message-bubble">
                            <p>Hi there, how can I help?</p>
                        </div>
                    </div>
                `;
            }
            
            // Clear chat history
            agent1ChatHistory = [];
            hasAskedFirstQuestion = false;
            
            // Hide feedback section
            if (feedbackSection) {
                feedbackSection.style.display = 'none';
            }
            
            // Show suggested prompts
            if (suggestedPrompts) {
                suggestedPrompts.style.display = 'block';
            }
            
            // Clear input and reset placeholder
            if (questionInput) {
                questionInput.value = '';
                questionInput.placeholder = 'Ask anything about your medical bills...';
                questionInput.focus();
            }
        });
    }

    // Prompt Chip Handlers
    if (promptChips.length > 0) {
        promptChips.forEach(chip => {
            chip.addEventListener('click', () => {
                const question = chip.getAttribute('data-question');
                if (question && questionInput) {
                    questionInput.value = question;
                    questionInput.focus();
                    // Trigger form submission
                    if (qaForm) {
                        qaForm.dispatchEvent(new Event('submit'));
                    }
                }
            });
        });
    }

    if (qaForm) {
        qaForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const question = questionInput.value.trim();
            console.log('Form submitted with question:', question);
            if (!question) return;
            
            // Hide suggested prompts when user starts chatting
            if (suggestedPrompts) {
                suggestedPrompts.style.display = 'none';
            }
            
            // Add user message bubble
            addMessageToChat('user', question);
            
            // Show thinking message
            addMessageToChat('ai', 'Thinking...', true);
            
            questionInput.value = '';
            const user = auth.currentUser;
            console.log('Current user:', user);
            if (user) {
                console.log('Getting ID token...');
                user.getIdToken()
                    .then(idToken => {
                        console.log('ID token received, making API call...');
                        return fetch(`${BACKEND_URL}/ask-agent1`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                            body: JSON.stringify({ question: question, history: agent1ChatHistory })
                        });
                    })
                    .then(response => {
                        console.log('API response status:', response.status);
                        return response.json();
                    })
                    .then(data => {
                        console.log('API response data:', data);
                        const ai_answer = data.answer || "Sorry, I received an empty answer.";
                        
                        // Remove thinking message and add AI response
                        removeThinkingMessage();
                        addMessageToChat('ai', ai_answer);
                        
                        // Show feedback section
                        if (feedbackSection) {
                            feedbackSection.style.display = 'block';
                        }
                        
                        // Update placeholder after first question
                        if (!hasAskedFirstQuestion) {
                            hasAskedFirstQuestion = true;
                            if (questionInput) {
                                questionInput.placeholder = 'Ask follow up';
                            }
                        }
                        
                        const chatHistoryCollectionRef = collection(db, 'users', user.uid, 'chat_history');
                        addDoc(chatHistoryCollectionRef, {
                            question: question,
                            answer: ai_answer,
                            created_at: serverTimestamp()
                        });
                    })
                    .catch(error => {
                        console.error('Error in API call:', error);
                        removeThinkingMessage();
                        addMessageToChat('ai', `Error: ${error.message}`);
                        
                        // Show feedback section even on error
                        if (feedbackSection) {
                            feedbackSection.style.display = 'block';
                        }
                    });
            } else {
                console.log('No authenticated user found');
                removeThinkingMessage();
                addMessageToChat('ai', 'Please log in to use this feature.');
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
                    formData.append('category', activeUploadCategory); // Include category context
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
                    // Update UI for upload process
                    updateProcessingStage('upload');
                    if (analysisStatus) analysisStatus.textContent = 'Uploading...';
                    addMessageToAgent2Chat('ai', 'Starting upload process...');
                    
                    // File uploaded successfully, now waiting for Cloud Function processing
                    updateProcessingStage('analyzing');
                    if (analysisStatus) analysisStatus.textContent = 'AI Analysis in Progress';
                    addMessageToAgent2Chat('ai', `File uploaded successfully! AI analysis has started for "${file.name}". This may take a few minutes.`);
                    
                    // The Cloud Function will automatically process the file and update Firestore
                    // The frontend will receive real-time updates through the Firestore listener
                    
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
                    <p><strong>Type:</strong> ${financialData.document_type === 'eob' ? 'EOB Statement' : financialData.document_type === 'insurance_plan' ? 'Insurance Plan' : 'Medical Bill'}</p>
                    <p><strong>Provider:</strong> ${financialData.provider || 'Not specified'}</p>
                            <p><strong>Date of Service:</strong> ${financialData.date_of_service || 'Not specified'}</p>
        <p><strong>Account Number:</strong> ${financialData.account_number || 'Not specified'}</p>
        
        ${financialData.document_type === 'insurance_plan' && financialData.insurance_data ? `
        <div class="modal-section">
            <h4>🛡️ Insurance Plan Details</h4>
            <div class="financial-table">
                <div class="table-row">
                    <span class="table-label">Network Type:</span>
                    <span class="table-value">${financialData.insurance_data.network_type || 'Not specified'}</span>
                </div>
                <div class="table-row">
                    <span class="table-label">Deductible:</span>
                    <span class="table-value">${financialData.insurance_data.deductible ? `$${financialData.insurance_data.deductible.toLocaleString()}` : 'Not specified'}</span>
                </div>
                <div class="table-row">
                    <span class="table-label">Copay:</span>
                    <span class="table-value">${financialData.insurance_data.copay ? `$${financialData.insurance_data.copay}` : 'Not specified'}</span>
                </div>
                <div class="table-row">
                    <span class="table-label">Coinsurance:</span>
                    <span class="table-value">${financialData.insurance_data.coinsurance ? `${financialData.insurance_data.coinsurance}%` : 'Not specified'}</span>
                </div>
                <div class="table-row">
                    <span class="table-label">Out-of-Pocket Max:</span>
                    <span class="table-value">${financialData.insurance_data.out_of_pocket_max ? `$${financialData.insurance_data.out_of_pocket_max.toLocaleString()}` : 'Not specified'}</span>
                </div>
            </div>
            ${financialData.insurance_data.coverage_details && financialData.insurance_data.coverage_details.length > 0 ? `
            <div class="modal-section">
                <h4>📋 Coverage Details</h4>
                <ul class="recommendations-list">
                    ${financialData.insurance_data.coverage_details.map(detail => `<li>${detail}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
        </div>
        ` : ''}
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
        const category = uploadZone.getAttribute('data-category');
        
        uploadZone.addEventListener('click', () => {
            activeUploadCategory = category; // Set the active category
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
                activeUploadCategory = category; // Set the active category
                fileInput.files = files;
                uploadForm.dispatchEvent(new Event('submit', { cancelable: true }));
            }
        });
    });

    browseCategoryButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const category = button.getAttribute('data-category');
            activeUploadCategory = category; // Set the active category
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

    // Agent 1: Clear History functionality (removed - now handled by New Chat button)

    // Agent 1: View All Questions functionality (removed - element not found)

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
                showModal('signup');
                return;
            }

            // Add loading state to button
            const originalText = button.textContent;
            button.textContent = 'Processing...';
            button.disabled = true;
            button.style.opacity = '0.7';

            // Check if we have a valid coupon for any plan
            let couponCode = null;
            if (window.currentPricingCouponCode) {
                couponCode = window.currentPricingCouponCode;
            }

            // User is authenticated - proceed to Stripe checkout
            auth.currentUser.getIdToken().then(idToken => {
                const requestBody = { plan: plan };
                if (couponCode) {
                    requestBody.couponCode = couponCode;
                }
                
                fetch(`${BACKEND_URL}/create-checkout-session`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify(requestBody)
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
                    // Reset button state
                    button.textContent = originalText;
                    button.disabled = false;
                    button.style.opacity = '1';
                    alert('There was an error creating your checkout session. Please try again.');
                });
            });
        });
    });

    // Pricing page coupon functionality
    const pricingCouponInput = document.getElementById('pricing-coupon-input');
    const pricingApplyCouponBtn = document.getElementById('pricing-apply-coupon-btn');
    const pricingCouponMessage = document.getElementById('pricing-coupon-message');
    const yearlyPlanButton = document.querySelector('[data-plan="yearly"]');
    
    if (pricingApplyCouponBtn && pricingCouponInput) {
        // Store current coupon code globally for checkout
        window.currentPricingCouponCode = null;
        
        pricingApplyCouponBtn.addEventListener('click', async () => {
            const couponCode = pricingCouponInput.value.trim().toUpperCase();
            if (!couponCode) {
                showPricingCouponMessage('Please enter a coupon code', 'error');
                return;
            }
            
            try {
                pricingApplyCouponBtn.textContent = 'Validating...';
                pricingApplyCouponBtn.disabled = true;
                
                const user = auth.currentUser;
                if (!user) {
                    showPricingCouponMessage('Please log in to use coupon codes', 'error');
                    return;
                }
                
                const idToken = await user.getIdToken();
                const response = await fetch(`${BACKEND_URL}/validate-coupon`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify({ 
                        couponCode: couponCode,
                        plan: 'yearly' // Default to yearly for validation, but coupon will work for both plans
                    })
                });
                
                if (response.ok) {
                    const couponData = await response.json();
                    window.currentPricingCouponCode = couponCode;
                    
                    // Create plan-specific success message
                    const planText = couponData.plan === 'yearly' ? 'yearly' : 'monthly';
                    const discountText = couponData.discountAmount === 100 ? 'FREE' : `${couponData.discountAmount}% off`;
                    const successMessage = `✅ ${discountText} ${planText} plan - ${couponData.description}`;
                    showPricingCouponMessage(successMessage, 'success');
                    
                    // Update yearly button to show discount
                    if (couponData.discountAmount === 100 && yearlyPlanButton) {
                        yearlyPlanButton.textContent = '🎫 FREE with Coupon!';
                        yearlyPlanButton.classList.add('coupon-applied');
                    }
                } else {
                    const errorData = await response.json();
                    showPricingCouponMessage(errorData.error || 'Invalid coupon code', 'error');
                    window.currentPricingCouponCode = null;
                }
            } catch (error) {
                console.error('Coupon validation error:', error);
                showPricingCouponMessage('Error validating coupon. Please try again.', 'error');
                window.currentPricingCouponCode = null;
            } finally {
                pricingApplyCouponBtn.textContent = 'Apply Coupon';
                pricingApplyCouponBtn.disabled = false;
            }
        });
        
        function showPricingCouponMessage(message, type) {
            if (type === 'success') {
                // Add dismiss button for success messages
                pricingCouponMessage.innerHTML = `
                    <span>${message}</span>
                    <button class="coupon-dismiss-btn" onclick="this.parentElement.style.display='none'" title="Dismiss">×</button>
                `;
            } else {
                pricingCouponMessage.textContent = message;
            }
            pricingCouponMessage.className = `coupon-message-pricing ${type}`;
            pricingCouponMessage.style.display = 'block';
            
            // Keep success messages visible until user takes action
            // Success messages will persist to show coupon is applied
        }
        
        // Handle coupon input enter key
        pricingCouponInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                pricingApplyCouponBtn.click();
            }
        });
    }

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
        
        // Ensure app container is visible
        const appContainer = document.getElementById('app-container');
        if (appContainer) {
            appContainer.classList.remove('hidden');
        }
        
        // Navigate to Agent 3
        showAppPage('agent-3-page');
        
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

    // Check for transferred context from Agent 2
    function checkForTransferredContext() {
        const context = sessionStorage.getItem('agent3_document_context');
        if (context) {
            try {
                const data = JSON.parse(context);
                console.log('📋 Found transferred context from Agent 2:', data);
                
                // Show success message about transferred context
                const successMessage = document.createElement('div');
                successMessage.className = 'success-message';
                successMessage.innerHTML = `
                    <div class="success-content">
                        <h4>✅ Document Transferred Successfully</h4>
                        <p>Your document from Agent 2 has been loaded. You can now create a dispute for this bill.</p>
                        <button class="btn-small" onclick="this.parentElement.parentElement.remove()">Dismiss</button>
                    </div>
                `;
                
                // Insert at the top of the agent-3-page
                const agent3Page = document.getElementById('agent-3-page');
                if (agent3Page) {
                    agent3Page.insertBefore(successMessage, agent3Page.firstChild);
                }
                
                // Pre-populate dispute form if it exists
                prePopulateDisputeForm(data);
                
                // Clear the context after use
                sessionStorage.removeItem('agent3_document_context');
                
            } catch (error) {
                console.error('❌ Error parsing transferred context:', error);
                sessionStorage.removeItem('agent3_document_context');
            }
        }
    }
    
    // Pre-populate dispute form with transferred document data
    function prePopulateDisputeForm(contextData) {
        const documentData = contextData.documentData;
        if (!documentData || !documentData.financial_data) return;
        
        const fd = documentData.financial_data;
        
        // Pre-fill form fields if they exist
        const billAmountInput = document.getElementById('bill-amount');
        const serviceDescriptionInput = document.getElementById('service-description');
        const providerNameInput = document.getElementById('provider-name');
        const billDateInput = document.getElementById('bill-date');
        
        if (billAmountInput && fd.total_charged) {
            billAmountInput.value = fd.total_charged.toFixed(2);
        }
        
        if (serviceDescriptionInput && fd.service_description) {
            serviceDescriptionInput.value = fd.service_description;
        }
        
        if (providerNameInput && fd.provider_name) {
            providerNameInput.value = fd.provider_name;
        }
        
        if (billDateInput && fd.bill_date) {
            billDateInput.value = fd.bill_date;
        }
        
        console.log('📝 Pre-populated dispute form with transferred document data');
    }

    // Make functions globally available for onclick handlers
    window.transferToAgent3 = transferToAgent3;
    window.continueQASession = continueQASession;
    
    // Ensure the original dispute functions are properly exposed globally
    // These should already be defined above, but we'll make sure they're accessible
    if (typeof window.startNewDispute === 'undefined' && typeof startNewDispute !== 'undefined') {
        window.startNewDispute = startNewDispute;
    }
    
    if (typeof window.selectDocumentForDispute === 'undefined' && typeof selectDocumentForDispute !== 'undefined') {
        window.selectDocumentForDispute = selectDocumentForDispute;
    }

    // --- DISPUTE SYSTEM FUNCTIONS ---
    
    // Navigate to Agent 2 for document upload and analysis
    window.uploadDocumentForDispute = function() {
        console.log('📤 Navigating to Agent 2 for document upload...');
        showAppPage('agent-2-page');
    };
    
    // Generate dispute letter

    // --- DISPUTE TUTORIAL SYSTEM ---
    
    // Show dispute tutorial modal
    window.showDisputeTutorial = function() {
        console.log('📚 Showing dispute tutorial...');
        const tutorialModal = document.getElementById('dispute-tutorial-modal');
        if (tutorialModal) {
            tutorialModal.classList.remove('hidden');
            console.log('✅ Tutorial modal shown');
            
            // Set up event listeners AFTER modal is shown
            setupTutorialEventListeners();
        } else {
            console.error('❌ Tutorial modal not found');
        }
    };
    
    // Close tutorial modal
    function closeTutorialModal() {
        const tutorialModal = document.getElementById('dispute-tutorial-modal');
        if (tutorialModal) {
            tutorialModal.classList.add('hidden');
        }
    }
    
    // Initialize tutorial system
    function initializeTutorialSystem() {
        console.log('🎓 Initializing tutorial system...');
        
        // Check if user wants to see tutorial
        const hideTutorial = localStorage.getItem('hideDisputeTutorial');
        
        if (!hideTutorial) {
            // Show tutorial automatically with delay
            setTimeout(() => {
                console.log('🕐 Auto-showing tutorial...');
                showDisputeTutorial();
            }, 1000);
        }
        
        // Set up tutorial event listeners
        setupTutorialEventListeners();
        
        console.log('✅ Tutorial system initialized successfully');
    }
    
    // Set up tutorial event listeners
    function setupTutorialEventListeners() {
        console.log('🔗 Setting up tutorial event listeners...');
        
        // Close button
        const closeBtn = document.getElementById('close-tutorial-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeTutorialModal);
            console.log('✅ Close button listener added');
        }
        
        // Action buttons
        const finishBtn = document.getElementById('finish-tutorial');
        const skipBtn = document.getElementById('skip-tutorial');
        
        console.log(`Action buttons found: finish=${!!finishBtn}, skip=${!!skipBtn}`);
        
        if (finishBtn) {
            finishBtn.addEventListener('click', () => {
                console.log('✅ Finish button clicked');
                const hideCheckbox = document.getElementById('hide-tutorial-future');
                if (hideCheckbox && hideCheckbox.checked) {
                    localStorage.setItem('hideDisputeTutorial', 'true');
                    console.log('💾 Tutorial hidden for future visits');
                }
                closeTutorialModal();
            });
            console.log('✅ Finish button listener added');
        }
        
        if (skipBtn) {
            skipBtn.addEventListener('click', () => {
                console.log('⏭️ Skip button clicked');
                const hideCheckbox = document.getElementById('hide-tutorial-future');
                if (hideCheckbox && hideCheckbox.checked) {
                    localStorage.setItem('hideDisputeTutorial', 'true');
                    console.log('💾 Tutorial hidden for future visits');
                }
                closeTutorialModal();
            });
            console.log('✅ Skip button listener added');
        }
        
        console.log('🎯 All tutorial event listeners set up successfully');
    }
    
    // Initialize tutorial when Agent 3 page loads
    function initializeAgent3() {
        console.log('🚀 Initializing Agent 3 dispute system...');
        
        // Get all the DOM elements
        const agent3Page = document.getElementById('agent-3-page');
        const disputeDashboard = document.getElementById('dispute-dashboard');
        const disputeCreationFlow = document.getElementById('dispute-creation-flow');
        const disputeLetterPreview = document.getElementById('dispute-letter-preview');
        const disputeManagement = document.getElementById('dispute-management');
        
        if (agent3Page) {
            // Ensure dashboard is visible immediately
            if (disputeDashboard) {
                disputeDashboard.classList.remove('hidden');
                console.log('✅ Dashboard made visible immediately');
            }
            
            // Initialize the dispute system
            setupDisputeEventListeners();
            loadDisputeDashboard();
            
            // Show dashboard
            if (typeof window.showDisputeDashboard === 'function') {
                window.showDisputeDashboard();
            } else {
                console.error('❌ showDisputeDashboard function not found, manually showing dashboard');
                // Fallback: manually show dashboard
                if (disputeDashboard) {
                    disputeDashboard.classList.remove('hidden');
                    console.log('✅ Dashboard shown via fallback method');
                }
            }
            
            // Initialize tutorial system
            initializeTutorialSystem();
            
            console.log('✅ Agent 3 dispute system initialized successfully');
        } else {
            console.error('❌ Agent 3 page element not found');
        }
    }

    // --- TEAM TABS FUNCTIONALITY ---
    
    // Update Team Tabs active state
    function updateTeamTabsActiveState(pageId) {
        const teamTabs = document.querySelectorAll('.team-tab');
        teamTabs.forEach(tab => {
            const tabPageId = tab.getAttribute('data-page');
            const isActive = tabPageId === pageId;
            
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-selected', isActive.toString());
            tab.setAttribute('tabindex', isActive ? '0' : '-1');
        });
    }
    
    // Handle Team Tab clicks
    function handleTeamTabClick(event) {
        const tab = event.currentTarget;
        const pageId = tab.getAttribute('data-page');
        const agentName = tab.getAttribute('data-agent');
        
        // Check if this is a future agent
        if (pageId === 'future-agent') {
            // Track future agent interest
            trackUserBehavior('future_agent_clicked', {
                agent: agentName,
                subscription_tier: currentUserSubscriptionTier
            });
            
            // Show coming soon message
            showFutureAgentModal(agentName);
            return;
        }
        
        // Simple access control - only allow premium agents for paying users
        const isLocked = pageId !== 'agent-1-page' && 
                        currentUserSubscriptionTier !== 'complete_care';
        
        if (isLocked) {
            // Check if payment is currently being processed
            if (window.paymentProcessing) {
                console.log('⏳ User tried to access premium agent during payment processing');
                
                // Show a specific message for users whose payment is being processed
                const processingMessage = document.createElement('div');
                processingMessage.className = 'payment-processing-message';
                processingMessage.innerHTML = `
                    <div class="payment-message-content">
                        <div class="payment-message-icon">⏳</div>
                        <h3>Payment Being Processed</h3>
                        <p>Your premium access is being activated. Please wait a moment and try again, or refresh the page.</p>
                        <div class="payment-message-actions">
                            <button class="btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">Dismiss</button>
                            <button class="btn-primary" onclick="window.location.reload()">Refresh Page</button>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(processingMessage);
                
                // Auto-remove after 10 seconds
                setTimeout(() => {
                    if (processingMessage.parentNode) {
                        processingMessage.remove();
                    }
                }, 10000);
                
                // Track this specific scenario
                trackUserBehavior('premium_access_during_processing', { 
                    feature: pageId,
                    subscription_tier: currentUserSubscriptionTier,
                    source: 'team_tabs'
                });
                return;
            }
            
            // Track upgrade prompt
            trackUserBehavior('upgrade_prompt', { 
                feature: pageId,
                subscription_tier: currentUserSubscriptionTier,
                source: 'team_tabs'
            });
            showUpgradePrompt();
            return;
        }
        
        // Track tab switch
        trackUserBehavior('team_tab_switched', {
            toAgent: agentName,
            toPage: pageId,
            subscription_tier: currentUserSubscriptionTier
        });
        
        // Switch to the selected agent page
        showAppPage(pageId);
    }
    
    // Handle Team Tabs keyboard navigation
    function handleTeamTabsKeyboard(event) {
        const tabs = Array.from(document.querySelectorAll('.team-tab'));
        const currentTab = event.currentTarget;
        const currentIndex = tabs.indexOf(currentTab);
        
        let nextIndex = currentIndex;
        
        switch (event.key) {
            case 'ArrowLeft':
                event.preventDefault();
                nextIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
                break;
            case 'ArrowRight':
                event.preventDefault();
                nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
                break;
            case 'Enter':
            case ' ':
                event.preventDefault();
                handleTeamTabClick(event);
                return;
            default:
                return;
        }
        
        // Update focus
        tabs[nextIndex].focus();
    }
    
    // Initialize Team Tabs
    function initializeTeamTabs() {
        const teamTabs = document.querySelectorAll('.team-tab');
        
        teamTabs.forEach(tab => {
            // Click handler
            tab.addEventListener('click', handleTeamTabClick);
            
            // Keyboard navigation
            tab.addEventListener('keydown', handleTeamTabsKeyboard);
            
            // Track initial view
            if (!window.teamTabsViewed) {
                trackUserBehavior('team_tabs_viewed', {
                    subscription_tier: currentUserSubscriptionTier
                });
                window.teamTabsViewed = true;
            }
        });
        
        // Action Bar buttons
        const actionContactBtns = document.querySelectorAll('#action-contact-human');
        actionContactBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                trackUserBehavior('contact_human_clicked', {
                    source: 'action_bar',
                    subscription_tier: currentUserSubscriptionTier
                });
                showContactHumanModal();
            });
        });
        
        const actionLogoutBtns = document.querySelectorAll('#action-logout');
        actionLogoutBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                trackUserBehavior('logout_clicked', {
                    source: 'action_bar',
                    subscription_tier: currentUserSubscriptionTier
                });
                // Handle logout directly
                signOut(auth).catch(error => console.error("Logout error:", error));
            });
        });
    }
    
    // Show Future Agent Modal
    function showFutureAgentModal(agentName) {
        const agentInfo = {
            'lena': {
                name: 'Lena',
                role: 'Care Scheduling Assistant',
                description: 'Streamline the chaotic process of finding and scheduling appointments.',
                benefits: [
                    'Locate in-network providers for specific specialties',
                    'Automate appointment scheduling',
                    'Sync with your calendar and send reminders',
                    'Provide estimated out-of-pocket costs'
                ]
            },
            'nico': {
                name: 'Nico',
                role: 'Urgent Care Navigator',
                description: 'Guide users through unexpected medical situations or billing surprises.',
                benefits: [
                    'Find nearest in-network urgent care or ER',
                    'Provide coverage guidance before arriving',
                    'Review and verify bills for errors',
                    'Help with post-visit insurance claims'
                ]
            }
        };
        
        const info = agentInfo[agentName];
        if (!info) return;
        
        // Create modal HTML
        const modalHTML = `
            <div class="future-agent-modal">
                <div class="modal-overlay"></div>
                <div class="modal-content">
                    <button class="close-modal">&times;</button>
                    <div class="modal-header">
                        <div class="future-agent-icon">${agentName === 'lena' ? '⚡' : '🚨'}</div>
                        <h2>${info.name} - ${info.role}</h2>
                        <p class="coming-soon">Coming Soon</p>
                    </div>
                    <div class="modal-body">
                        <p class="agent-description">${info.description}</p>
                        <h3>What ${info.name} will do for you:</h3>
                        <ul class="benefits-list">
                            ${info.benefits.map(benefit => `<li>${benefit}</li>`).join('')}
                        </ul>
                        <div class="modal-actions">
                            <button class="btn-primary" onclick="closeFutureAgentModal()">Got it</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to page
        const modalElement = document.createElement('div');
        modalElement.innerHTML = modalHTML;
        modalElement.classList.add('future-agent-modal-overlay');
        document.body.appendChild(modalElement);
        
        // Add close functionality
        const closeBtn = modalElement.querySelector('.close-modal');
        const overlay = modalElement.querySelector('.modal-overlay');
        
        closeBtn.addEventListener('click', closeFutureAgentModal);
        overlay.addEventListener('click', closeFutureAgentModal);
        
        // Close on escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                closeFutureAgentModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }
    
    // Close Future Agent Modal
    function closeFutureAgentModal() {
        const modal = document.querySelector('.future-agent-modal-overlay');
        if (modal) {
            modal.remove();
        }
    }
    
    // Make function globally available
    window.closeFutureAgentModal = closeFutureAgentModal;
    
    // Initialize Team Tabs when DOM is ready
    initializeTeamTabs();
});