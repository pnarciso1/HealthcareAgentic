// app.js

// Import all the Firebase functions we will need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import {
    getFirestore,
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc, // To add new chat messages
    serverTimestamp // To timestamp messages
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
    const dashboardSection = document.getElementById('dashboard-section');
    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login-form');
    const logoutButton = document.getElementById('logout-button');
    const signupMessage = document.getElementById('signup-message');
    const loginMessage = document.getElementById('login-message');
    const qaForm = document.getElementById('agent1-qa-form');
    const questionInput = document.getElementById('agent1-question');
    const answerBox = document.getElementById('agent1-answer');
    const uploadForm = document.getElementById('agent2-upload-form');
    const fileInput = document.getElementById('document-upload');
    const agent2StatusMessage = document.getElementById('agent2-status-message');
    const agent2ResultsList = document.getElementById('agent2-results-list');

    let agent1ChatHistory = [];
    let unsubscribeAnalyses = null;
    let unsubscribeChatHistory = null; // Listener for chat history

    // --- AUTH STATE LISTENER ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("Auth state changed: User is LOGGED IN.", user);
            if(authSection) authSection.classList.add('hidden');
            if(dashboardSection) dashboardSection.classList.remove('hidden');

            // Start listening for both analysis results and chat history
            listenForAnalysisResults(user.uid);
            listenForChatHistory(user.uid);

        } else {
            console.log("Auth state changed: User is LOGGED OUT.");
            if(authSection) authSection.classList.remove('hidden');
            if(dashboardSection) dashboardSection.classList.add('hidden');

            // Stop all Firestore listeners on logout
            if (unsubscribeAnalyses) unsubscribeAnalyses();
            if (unsubscribeChatHistory) unsubscribeChatHistory();

            // Clear local data
            agent1ChatHistory = [];
            if (agent2ResultsList) agent2ResultsList.innerHTML = '<p class="no-results-message">No documents have been analyzed yet.</p>';
            if (answerBox) answerBox.innerHTML = '';
        }
    });

    // --- Function to listen for Agent 1 Chat History from Firestore ---
    function listenForChatHistory(uid) {
        const chatHistoryCollectionRef = collection(db, 'users', uid, 'chat_history');
        const q = query(chatHistoryCollectionRef, orderBy('created_at', 'asc')); // Order by oldest first

        unsubscribeChatHistory = onSnapshot(q, (snapshot) => {
            agent1ChatHistory = []; // Clear local history
            let fullChatHtml = '';
            snapshot.forEach(doc => {
                const message = doc.data();
                // Rebuild the local history array for sending to the backend
                agent1ChatHistory.push({ "user": message.question, "ai": message.answer });
                // Build HTML to display the conversation
                fullChatHtml += `<p><strong>You:</strong> ${message.question}</p><p><strong>Agent:</strong> ${message.answer}</p><hr>`;
            });
            if (answerBox) answerBox.innerHTML = fullChatHtml;
        });
    }


    // --- Function to listen for analysis results from Firestore ---
    function listenForAnalysisResults(uid) {
        const analysesCollectionRef = collection(db, 'users', uid, 'analyses');
        const q = query(analysesCollectionRef, orderBy('created_at', 'desc'));

        unsubscribeAnalyses = onSnapshot(q, (snapshot) => {
            if (!agent2ResultsList) return;
            if (snapshot.empty) {
                agent2ResultsList.innerHTML = '<p class="no-results-message">No documents have been analyzed yet.</p>';
                return;
            }
            agent2ResultsList.innerHTML = '';
            snapshot.forEach(doc => {
                const analysis = doc.data();
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('analysis-item');
                
                // --- NEW: Display the original filename ---
                const filenameP = document.createElement('p');
                filenameP.innerHTML = `<strong>File:</strong> ${analysis.original_filename || 'Unknown File'}`;
                itemDiv.appendChild(filenameP);

                if (analysis.status === 'failed') {
                    const statusP = document.createElement('p');
                    statusP.innerHTML = `<strong>Status:</strong> <span style="color: red;">Failed</span>`;
                    itemDiv.appendChild(statusP);
                    const errorP = document.createElement('p');
                    errorP.innerHTML = `<strong>Error:</strong> ${analysis.error_message || 'An unknown error occurred.'}`;
                    itemDiv.appendChild(errorP);
                } else if (analysis.status === 'completed') {
                    try {
                        const results = JSON.parse(analysis.analysis_results);
                        const summaryP = document.createElement('p');
                        summaryP.innerHTML = `<strong>Summary:</strong> ${results.concise_summary || 'Not available.'}`;
                        itemDiv.appendChild(summaryP);

                        if (results.key_information) {
                            const providerP = document.createElement('p');
                            providerP.innerHTML = `<strong>Provider:</strong> ${results.key_information.provider_name || 'Not Found'}`;
                            itemDiv.appendChild(providerP);

                            const amountP = document.createElement('p');
                            amountP.innerHTML = `<strong>Amount Due:</strong> ${results.key_information.total_amount_due || 'Not Found'}`;
                            itemDiv.appendChild(amountP);
                        }

                        const findingsHeader = document.createElement('p');
                        findingsHeader.innerHTML = `<strong>Initial Analysis:</strong>`;
                        itemDiv.appendChild(findingsHeader);
                        
                        const findingsPre = document.createElement('pre');
                        findingsPre.textContent = results.initial_analysis || 'No analysis available.';
                        itemDiv.appendChild(findingsPre);

                    } catch (e) {
                        console.error("Error parsing analysis JSON:", e);
                        const errorP = document.createElement('p');
                        errorP.innerHTML = `<strong>Error:</strong> Could not display analysis results due to a formatting issue.`;
                        itemDiv.appendChild(errorP);
                    }
                } else {
                    const statusP = document.createElement('p');
                    statusP.innerHTML = `<strong>Status:</strong> Processing...`;
                    itemDiv.appendChild(statusP);
                }
                agent2ResultsList.appendChild(itemDiv);
            });
        }, (error) => {
            console.error("Error listening to Firestore:", error);
            agent2ResultsList.innerHTML = '<p class="no-results-message" style="color: red;">Could not load analysis results.</p>';
        });
    }

    // --- EVENT LISTENERS ---

    // Handle Agent 1 Q&A Form Submission
    if (qaForm) {
        qaForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const question = questionInput.value;
            if (!question) return;

            answerBox.innerHTML += '<p>Thinking...</p>';
            questionInput.value = '';

            const user = auth.currentUser;
            if (user) {
                user.getIdToken()
                    .then(idToken => {
                        return fetch('http://127.0.0.1:5000/ask-agent1', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${idToken}`
                            },
                            body: JSON.stringify({
                                question: question,
                                history: agent1ChatHistory
                            })
                        });
                    })
                    .then(response => {
                        if (!response.ok) throw new Error(`Backend error: ${response.status}`);
                        return response.json();
                    })
                    .then(data => {
                        const ai_answer = data.answer || "Sorry, I received an empty answer.";
                        // Save the conversation to Firestore
                        const chatHistoryCollectionRef = collection(db, 'users', user.uid, 'chat_history');
                        addDoc(chatHistoryCollectionRef, {
                            question: question,
                            answer: ai_answer,
                            created_at: serverTimestamp()
                        }).catch(err => console.error("Error saving chat message:", err));
                        // The onSnapshot listener will automatically update the UI
                    })
                    .catch(error => {
                        console.error('Error asking Agent 1:', error);
                        answerBox.innerHTML += `<p style="color: red;">Error: ${error.message}</p>`;
                    });
            } else {
                answerBox.innerHTML += '<p style="color: red;">You must be logged in to ask a question.</p>';
            }
        });
    }

    // Handle Signup Form
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = signupForm['signup-email'].value;
            const password = signupForm['signup-password'].value;

            createUserWithEmailAndPassword(auth, email, password)
                .then(userCredential => userCredential.user.getIdToken())
                .then(idToken => fetch('http://127.0.0.1:5000/create-checkout-session', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${idToken}` }
                }))
                .then(response => {
                    if (!response.ok) throw new Error('Backend setup failed.');
                    return response.json();
                })
                .then(data => console.log('Backend profile creation successful:', data))
                .catch(error => {
                    console.error("Signup process error:", error);
                    signupMessage.textContent = error.message;
                    signupMessage.style.color = 'red';
                });
        });
    }

    // Handle Login Form
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = loginForm['login-email'].value;
            const password = loginForm['login-password'].value;

            signInWithEmailAndPassword(auth, email, password)
                .then(userCredential => {
                    console.log('Login successful:', userCredential.user);
                    loginMessage.textContent = '';
                })
                .catch(error => {
                    console.error("Login error:", error);
                    loginMessage.textContent = error.message;
                    loginMessage.style.color = 'red';
                });
        });
    }

    // Handle Logout Button
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            signOut(auth).catch(error => console.error("Logout error:", error));
        });
    }

    // Handle Document Upload Form
    if (uploadForm) {
        uploadForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const file = fileInput.files[0];
            // Find the button inside the form
            const uploadButton = uploadForm.querySelector('button[type="submit"]');
    
            if (!file) {
                agent2StatusMessage.textContent = 'Please select a file to upload.';
                agent2StatusMessage.style.color = 'red';
                return;
            }
    
            // --- FIX: Disable the button and update status ---
            agent2StatusMessage.textContent = 'Uploading...';
            agent2StatusMessage.style.color = 'blue';
            if (uploadButton) uploadButton.disabled = true;
    
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
                    if (!response.ok) throw new Error(`Upload failed with status: ${response.status}`);
                    return response.json();
                })
                .then(data => {
                    console.log('Upload successful:', data);
                    agent2StatusMessage.textContent = 'File uploaded! Agent is analyzing it now.';
                    agent2StatusMessage.style.color = 'green';
                    uploadForm.reset();
                    // --- FIX: Re-enable button on success ---
                    if (uploadButton) uploadButton.disabled = false;
                })
                .catch(error => {
                    console.error('Error uploading document:', error);
                    agent2StatusMessage.textContent = `Error: ${error.message}`;
                    agent2StatusMessage.style.color = 'red';
                    // --- FIX: Re-enable button on failure ---
                    if (uploadButton) uploadButton.disabled = false;
                });
            } else {
                agent2StatusMessage.textContent = 'You must be logged in to upload a document.';
                agent2StatusMessage.style.color = 'red';
                // --- FIX: Re-enable button on failure ---
                if (uploadButton) uploadButton.disabled = false;
            }
        });
    }
});