document.addEventListener('DOMContentLoaded', () => {
    // This script controls all the interactivity for your quiz website.
    // If buttons don't work, check the Browser's Developer Console (F12) for errors.
    console.log("app.js loaded successfully. Initializing quiz application...");

    // API base URL - Make sure your backend server is running on this address
    const API_URL = 'http://localhost:3000/api';

    // --- DOM Elements ---
    // Views
    const views = {
        auth: document.getElementById('auth-view'),
        home: document.getElementById('home-view'),
        level: document.getElementById('level-view'),
        quiz: document.getElementById('quiz-view'),
        results: document.getElementById('results-view'),
        answers: document.getElementById('answers-view'),
    };

    // Auth
    const authButtons = document.getElementById('auth-buttons');
    const userInfo = document.getElementById('user-info');
    const showLoginBtn = document.getElementById('show-login-btn');
    const showRegisterBtn = document.getElementById('show-register-btn');
    const loginFormContainer = document.getElementById('login-form-container');
    const registerFormContainer = document.getElementById('register-form-container');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const logoutButton = document.getElementById('logout-button');
    const usernameDisplay = document.getElementById('username-display');
    const authError = document.getElementById('auth-error');
    
    // Home & Levels
    const getStartedBtn = document.getElementById('get-started-btn');
    const levelCardsContainer = document.querySelector('#level-view .grid');
    const pastResultsContainer = document.getElementById('past-results-container');

    // Quiz
    const levelIndicator = document.getElementById('level-indicator');
    const timerDisplay = document.getElementById('timer');
    const progressText = document.getElementById('progress-text');
    const progressBar = document.getElementById('progress-bar');
    const questionText = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    const submitQuizButton = document.getElementById('submit-quiz-button');

    // Results & Answers
    const levelCompletedText = document.getElementById('level-completed-text');
    const scoreText = document.getElementById('score-text');
    const remarkText = document.getElementById('remark-text');
    const nextLevelButton = document.getElementById('next-level-button');
    const viewAnswersButton = document.getElementById('view-answers-button');
    const answersList = document.getElementById('answers-list');
    const backToResultsButton = document.getElementById('back-to-results-button');

    // Chatbot
    const chatbotToggle = document.getElementById('chatbot-toggle');
    const chatWindow = document.getElementById('chat-window');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    
    // --- State ---
    let currentUser = null;
    let quizTimer;
    let currentLevelData = {};
    let lastLevelResult = {};
    const levels = [
        { name: 'Easy', time: 30, color: 'green' },
        { name: 'Medium', time: 45, color: 'yellow' },
        { name: 'Hard', time: 60, color: 'red' }
    ];

    // --- View Management ---
    function showView(viewName) {
        Object.values(views).forEach(v => v.classList.remove('active-view'));
        if (views[viewName]) {
            views[viewName].classList.add('active-view');
        }
    }

    // --- Authentication ---
    showLoginBtn.addEventListener('click', () => {
        registerFormContainer.classList.add('hidden');
        loginFormContainer.classList.remove('hidden');
        authError.textContent = '';
        showView('auth');
    });
    
    showRegisterBtn.addEventListener('click', () => {
        loginFormContainer.classList.add('hidden');
        registerFormContainer.classList.remove('hidden');
        authError.textContent = '';
        showView('auth');
    });

    loginForm.addEventListener('submit', e => { e.preventDefault(); handleAuth('login'); });
    registerForm.addEventListener('submit', e => { e.preventDefault(); handleAuth('register'); });
    logoutButton.addEventListener('click', logout);
    getStartedBtn.addEventListener('click', () => {
        currentUser ? showView('level') : showView('auth');
    });

    async function handleAuth(endpoint) {
        const form = (endpoint === 'login') ? loginForm : registerForm;
        const credentials = {
            username: form.querySelector('input[type="text"]').value,
            password: form.querySelector('input[type="password"]').value,
        };
        authError.textContent = '';
        try {
            const response = await fetch(`${API_URL}/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            if (endpoint === 'register') {
                alert('Registration successful! Please log in.');
                form.reset();
                showLoginBtn.click();
            } else {
                localStorage.setItem('token', data.token);
                localStorage.setItem('username', data.username);
                checkLoggedInUser();
            }
        } catch (error) {
            console.error(`Auth Error (${endpoint}):`, error); // LOGGING
            authError.textContent = error.message;
        }
    }
    
    function logout() {
        localStorage.clear();
        currentUser = null;
        updateUIForAuthState();
        showView('home');
        addBotMessage("You've been logged out. See you next time!");
    }

    function updateUIForAuthState() {
        if (currentUser) {
            authButtons.classList.add('hidden');
            userInfo.classList.remove('hidden');
            userInfo.classList.add('flex');
            usernameDisplay.textContent = currentUser.username;
            initializeDashboard();
        } else {
            authButtons.classList.remove('hidden');
            userInfo.classList.add('hidden');
            userInfo.classList.remove('flex');
            pastResultsContainer.innerHTML = '<p class="text-gray-500">Login to see your results.</p>';
            levelCardsContainer.innerHTML = '';
        }
    }

    // --- Dashboard & Levels ---
    async function initializeDashboard() {
        showView('level');
        const results = await fetchPastResults();
        populateLevelCards(results);
        populatePastResults(results);
        addBotMessage(`Hi, ${currentUser.username}! Ready for a challenge? Select a level to start.`);
    }
    
    async function fetchPastResults() {
        try {
            const response = await fetch(`${API_URL}/results`, {
                headers: { 'Authorization': `Bearer ${currentUser.token}` }
            });
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error('Failed to load past results:', error);
            return [];
        }
    }

    function populateLevelCards(pastResults) {
        levelCardsContainer.innerHTML = '';
        let unlocked = true;
        levels.forEach(level => {
            const result = pastResults.find(r => r.level === level.name);
            const isCompleted = !!result;
            
            const card = document.createElement('div');
            card.className = `level-card border rounded-xl p-6 text-center ${unlocked ? 'opacity-100 cursor-pointer' : 'opacity-50 bg-gray-100'}`;
            card.innerHTML = `
                <h3 class="text-xl font-semibold text-${level.color}-800 mb-2">${level.name} Level</h3>
                <p class="text-${level.color}-600 mb-4">${level.time} seconds per quiz</p>
                ${isCompleted ? 
                    `<div class="bg-blue-500 text-white px-3 py-1 rounded-full text-xs inline-block mb-4">Completed: ${result.score}/${result.total}</div>` : 
                    `<div class="badge bg-gray-400 text-white px-3 py-1 rounded-full text-xs inline-block mb-4">5 Questions</div>`
                }
                <button class="start-quiz-btn w-full bg-${level.color}-500 text-white py-2 rounded-lg font-medium hover:bg-${level.color}-600 transition" data-level="${level.name}" ${!unlocked ? 'disabled' : ''}>
                    ${isCompleted ? 'Play Again' : 'Start Quiz'}
                </button>
            `;
            levelCardsContainer.appendChild(card);
            
            if (!isCompleted) unlocked = false; // Lock subsequent levels
        });
        
        document.querySelectorAll('.start-quiz-btn:not([disabled])').forEach(btn => {
            btn.addEventListener('click', () => startQuiz(btn.dataset.level));
        });
    }

    function populatePastResults(results) {
        pastResultsContainer.innerHTML = '<h2 class="text-xl font-bold text-gray-800 mb-4">Recent Results</h2>';
        if (results.length === 0) {
            pastResultsContainer.innerHTML += '<p class="text-gray-500">No quizzes taken yet.</p>';
            return;
        }
        results.slice(0, 5).forEach(res => {
            pastResultsContainer.innerHTML += `
                <div class="p-3 rounded-lg bg-blue-50">
                    <div class="flex justify-between">
                        <span class="font-medium">${res.level} Level</span>
                        <span class="font-bold text-blue-600">${res.score}/${res.total}</span>
                    </div>
                    <div class="text-sm text-gray-600">${new Date(res.timestamp).toLocaleDateString()}</div>
                </div>`;
        });
    }

    // --- Quiz Logic ---
    async function startQuiz(levelName) {
        const level = levels.find(l => l.name === levelName);
        if (!level) return;

        try {
            const response = await fetch(`${API_URL}/questions/${levelName}`, {
                headers: { 'Authorization': `Bearer ${currentUser.token}` }
            });
            const questions = await response.json();
            
            currentLevelData = {
                level,
                questions,
                userAnswers: {},
                currentQuestionIndex: 0
            };
            
            setupQuizUI();
            displayCurrentQuestion();
            startTimer();
            showView('quiz');

        } catch (error) {
            alert('Failed to load questions. Please try again.');
            console.error("Quiz start error:", error);
        }
    }
    
    function setupQuizUI() {
        const { color, name } = currentLevelData.level;
        levelIndicator.className = `px-3 py-1 rounded-full text-white text-sm font-medium bg-${color}-500`;
        levelIndicator.textContent = `${name} Level`;
    }

    function displayCurrentQuestion() {
        const { questions, currentQuestionIndex } = currentLevelData;
        const q = questions[currentQuestionIndex];
        
        progressText.textContent = `Question ${currentQuestionIndex + 1} / ${questions.length}`;
        progressBar.style.width = `${((currentQuestionIndex + 1) / questions.length) * 100}%`;
        questionText.textContent = q.question;
        
        optionsContainer.innerHTML = '';
        ['A', 'B', 'C', 'D'].forEach(opt => {
            const optionEl = document.createElement('div');
            optionEl.className = 'option bg-gray-50 p-4 rounded-lg cursor-pointer border-2 border-transparent hover:border-blue-300';
            optionEl.innerHTML = `
                <div class="flex items-center">
                    <div class="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center mr-3 font-semibold">${opt}</div>
                    <span>${q['option'+opt]}</span>
                </div>`;
            optionEl.addEventListener('click', () => handleOptionSelect(q.id, q['option'+opt], optionEl));
            optionsContainer.appendChild(optionEl);
        });
    }

    function handleOptionSelect(questionId, answer, element) {
        currentLevelData.userAnswers[questionId] = answer;
        document.querySelectorAll('.option').forEach(el => el.classList.remove('selected'));
        element.classList.add('selected');

        setTimeout(() => {
            if (currentLevelData.currentQuestionIndex < currentLevelData.questions.length - 1) {
                currentLevelData.currentQuestionIndex++;
                displayCurrentQuestion();
            }
        }, 300);
    }
    
    function startTimer() {
        let timeLeft = currentLevelData.level.time;
        timerDisplay.textContent = `${timeLeft}s`;
        clearInterval(quizTimer);
        
        quizTimer = setInterval(() => {
            timeLeft--;
            timerDisplay.textContent = `${timeLeft}s`;
            timerDisplay.classList.toggle('text-red-500', timeLeft <= 10);
            if (timeLeft <= 0) {
                clearInterval(quizTimer);
                submitQuiz();
            }
        }, 1000);
    }

    submitQuizButton.addEventListener('click', () => {
        clearInterval(quizTimer);
        submitQuiz();
    });

    async function submitQuiz() {
        try {
            const response = await fetch(`${API_URL}/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentUser.token}`
                },
                body: JSON.stringify({ level: currentLevelData.level.name, userAnswers: currentLevelData.userAnswers })
            });
            if (!response.ok) throw new Error('Server responded with an error.');
            lastLevelResult = await response.json();
            showResults();
        } catch (error) {
            console.error('Error submitting answers:', error);
            alert('There was an error submitting your answers.');
        }
    }

    // --- Results & Answers Logic ---
    function showResults() {
        const { level } = currentLevelData;
        const { score, total, remarks } = lastLevelResult;

        levelCompletedText.textContent = `You've completed the ${level.name} level!`;
        scoreText.textContent = `${score} / ${total}`;
        remarkText.textContent = remarks;
        remarkText.className = `text-xl font-semibold text-${score >= total * 0.8 ? 'green' : (score >= total * 0.5 ? 'yellow' : 'red')}-500`;

        const currentIndex = levels.findIndex(l => l.name === level.name);
        if (currentIndex < levels.length - 1) {
            nextLevelButton.textContent = `Continue to ${levels[currentIndex + 1].name} Level`;
            nextLevelButton.onclick = () => startQuiz(levels[currentIndex + 1].name);
        } else {
            nextLevelButton.textContent = 'Back to Levels';
            nextLevelButton.onclick = initializeDashboard;
        }
        
        showView('results');
        initializeDashboard();
    }

    viewAnswersButton.addEventListener('click', () => {
        answersList.innerHTML = '';
        lastLevelResult.detailedResults.forEach(res => {
            const answerEl = document.createElement('div');
            const isCorrect = res.isCorrect;
            answerEl.className = `bg-gray-50 p-4 rounded-lg border-l-4 ${isCorrect ? 'border-green-500' : 'border-red-500'}`;
            answerEl.innerHTML = `
                <h3 class="font-semibold text-gray-800 mb-2">${res.question}</h3>
                <div class="text-sm">Your answer: <span class="font-medium ${isCorrect ? 'text-green-700' : 'text-red-700'}">${res.userAnswer || 'Not answered'}</span></div>
                ${!isCorrect ? `<div class="text-sm">Correct answer: <span class="font-medium text-green-700">${res.correctAnswer}</span></div>` : ''}
            `;
            answersList.appendChild(answerEl);
        });
        showView('answers');
    });

    backToResultsButton.addEventListener('click', () => showView('results'));

    // --- Chatbot Logic ---
    chatbotToggle.addEventListener('click', () => chatWindow.classList.toggle('hidden'));
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && chatInput.value.trim()) {
            const msg = chatInput.value.trim();
            addUserMessage(msg);
            handleChatbotCommand(msg.toLowerCase());
            chatInput.value = '';
        }
    });

    function addBotMessage(message) {
        const msgEl = Object.assign(document.createElement('div'), {
            className: 'chat-bubble bot p-3 rounded-lg',
            textContent: message
        });
        chatMessages.appendChild(msgEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function addUserMessage(message) {
         const msgEl = Object.assign(document.createElement('div'), {
            className: 'chat-bubble user p-3 rounded-lg',
            textContent: message
        });
        chatMessages.appendChild(msgEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function handleChatbotCommand(command) {
        if (!currentUser) {
            if (command.includes('login') || command.includes('register')) {
                addBotMessage("Great! Please use the forms to login or register.");
                showView('auth');
            } else {
                addBotMessage("Please 'login' or 'register' first to use the quiz.");
            }
        } else {
            if (command.includes('start')) {
                addBotMessage("Okay! Please select a level from the main screen to start the quiz.");
                showView('level');
            } else if (command.includes('logout')) {
                addBotMessage("Logging you out. See you soon!");
                logout();
            } else {
                addBotMessage("You can ask me to 'start quiz' or 'logout'.");
            }
        }
    }

    // --- Initial Load ---
    function checkLoggedInUser() {
        const token = localStorage.getItem('token');
        const username = localStorage.getItem('username');
        if (token && username) {
            currentUser = { username, token };
            updateUIForAuthState();
        } else {
            showView('home');
            addBotMessage("Hello! Please 'login' or 'register' to start a quiz.");
        }
    }

    checkLoggedInUser();
});

