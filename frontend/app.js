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
    serverTimestamp
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


// --- MAIN SCRIPT LOGIC ---

document.addEventListener('DOMContentLoaded', () => {

    // --- Get all the DOM elements ---
    const authSection = document.getElementById('auth-section');
    const appContainer = document.getElementById('app-container');
    
    // Logged-out pages
    const landingPageContent = document.getElementById('landing-page-content');
    const howItWorksPage = document.getElementById('how-it-works-page');

    // Logged-in pages
    const pages = document.querySelectorAll('.page');
    
    // Navigation buttons
    const logoLink = document.getElementById('logo-link');
    const navHowItWorksLink = document.getElementById('nav-how-it-works');
    const navAgentsLink = document.getElementById('nav-agents');
    const agentSelectionCards = document.querySelectorAll('.agent-selection-card');
    
    // Modal elements
    const loginNavButton = document.getElementById('login-nav-button');
    const getStartedButton = document.getElementById('get-started-button');
    const getStartedMainButton = document.getElementById('get-started-main-button');
    const getStartedCtaButton = document.getElementById('get-started-cta-button');
    const loginCtaButton = document.getElementById('login-cta-button');
    const formsContainer = document.getElementById('forms-container');
    const loginFormWrapper = document.getElementById('login-form-wrapper');
    const signupFormWrapper = document.getElementById('signup-form-wrapper');
    const resetPasswordWrapper = document.getElementById('reset-password-wrapper');
    const closeModalButtons = document.querySelectorAll('.close-modal');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const backToLoginLink = document.getElementById('back-to-login-link');

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
    
    // --- PAGE NAVIGATION LOGIC ---
    const showLandingPage = (pageName) => {
        if (pageName === 'how-it-works') {
            landingPageContent.classList.add('hidden');
            howItWorksPage.classList.remove('hidden');
        } else { // Default to main landing page
            landingPageContent.classList.remove('hidden');
            howItWorksPage.classList.add('hidden');
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

    // Event listeners for modals and navigation
    loginNavButton.addEventListener('click', () => showModal('login'));
    getStartedButton.addEventListener('click', () => showModal('signup'));
    getStartedMainButton.addEventListener('click', () => showModal('signup'));
    getStartedCtaButton.addEventListener('click', () => showModal('signup'));
    loginCtaButton.addEventListener('click', () => showModal('login'));
    
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
            showAppPage(pageId);
        });
    });


    // --- AUTH STATE LISTENER ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            authSection.classList.add('hidden');
            appContainer.classList.remove('hidden');
            showAppPage('agent-selection-page');
            hideModal();
            listenForAnalysisResults(user.uid);
            listenForChatHistory(user.uid);
        } else {
            authSection.classList.remove('hidden');
            appContainer.classList.add('hidden');
            showLandingPage('main');
            if (unsubscribeAnalyses) unsubscribeAnalyses();
            if (unsubscribeChatHistory) unsubscribeChatHistory();
            agent1ChatHistory = [];
        }
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
                    .then(idToken => fetch('http://127.0.0.1:5000/ask-agent1', {
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
                    return fetch('http://127.0.0.1:5000/upload-document', {
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

    // Placeholder for Agent 3 form
    const agent3Form = document.getElementById('agent3-challenge-form');
    if (agent3Form) {
        agent3Form.addEventListener('submit', (e) => {
            e.preventDefault();
            alert("Agent 3 functionality is coming soon!");
        });
    }
});