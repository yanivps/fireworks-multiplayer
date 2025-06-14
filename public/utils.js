// Utility functions and helpers

// Clue visualization functions
function showClueConfirmationOverlay() {
    if (!currentClueVisualization) return;
    
    const overlay = document.getElementById('clueConfirmationOverlay');
    const textElement = document.getElementById('clueConfirmationText');
    const buttonElement = document.querySelector('.clue-confirmation-button');
    
    const clueDescription = currentClueVisualization.clueType === 'color'
        ? `a ${currentClueVisualization.clueValue} color clue`
        : `a number ${currentClueVisualization.clueValue} clue`;
    
    // Show different text based on whether this is the target player or not
    let baseText;
    if (currentClueVisualization.targetPlayerId === currentPlayerId) {
        baseText = `${currentClueVisualization.giverName} gave you ${clueDescription}. Check your cards to see which ones match!`;
    } else {
        baseText = `${currentClueVisualization.giverName} gave ${currentClueVisualization.targetName} ${clueDescription}. Look at the highlighted cards!`;
    }
    buttonElement.textContent = 'Got it! Continue Game';
    
    // Add queue information if there are more clues pending
    if (clueQueue.length > 0) {
        baseText += ` (${clueQueue.length} more clue${clueQueue.length > 1 ? 's' : ''} pending)`;
    }
    
    textElement.textContent = baseText;
    
    // Always disable all game buttons while modal is active
    disableGameButtons();
    
    overlay.classList.add('show');
}

function confirmClueVisualization() {
    // Hide the overlay
    const overlay = document.getElementById('clueConfirmationOverlay');
    overlay.classList.remove('show');
    
    // Clear the current clue visualization
    currentClueVisualization = null;
    
    // Update display to remove clue highlights
    updateGameDisplay();
    
    // Mark as no longer processing
    isProcessingClue = false;
    
    // Process next clue in queue if any
    if (clueQueue.length > 0) {
        // Small delay to let the display update before showing next clue
        setTimeout(() => {
            processClueQueue();
        }, 200);
    } else {
        // Re-enable all game buttons only when queue is empty
        enableGameButtons();
    }
}

function processClueQueue() {
    // If already processing a clue or queue is empty, return
    if (isProcessingClue || clueQueue.length === 0) {
        return;
    }
    
    // Mark as processing
    isProcessingClue = true;
    
    // Get the next clue from queue
    currentClueVisualization = clueQueue.shift();
    
    // Update display with clue visualization
    updateGameDisplay();
    
    // Show confirmation overlay
    showClueConfirmationOverlay();
}

function disableGameButtons() {
    // Disable action buttons
    const actionButtons = document.querySelectorAll('.action-button, .clue-type-button');
    actionButtons.forEach(button => {
        button.disabled = true;
        // button.style.opacity = '0.5';
        button.style.cursor = 'not-allowed';
    });
    
    // Disable cards interaction
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.style.pointerEvents = 'none';
        // card.style.opacity = '0.7';
    });
}

function enableGameButtons() {
    // Re-enable action buttons
    const actionButtons = document.querySelectorAll('.action-button, .clue-type-button');
    actionButtons.forEach(button => {
        button.disabled = false;
        // button.style.opacity = '';
        button.style.cursor = '';
    });
    
    // Re-enable cards interaction
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.style.pointerEvents = '';
        // card.style.opacity = '';
    });
}

// Game end functions
function showGameEndSection(endData) {
    // Hide game section, show end section
    document.getElementById('gameSection').style.display = 'none';
    document.getElementById('gameEndSection').style.display = 'block';
    
    // Clear any pending clue visualizations
    currentClueVisualization = null;
    clueQueue = [];
    isProcessingClue = false;
    const overlay = document.getElementById('clueConfirmationOverlay');
    overlay.classList.remove('show');
    enableGameButtons();
    
    // Update score display
    document.getElementById('finalScore').textContent = `Score: ${endData.summary.score}/${endData.summary.maxScore}`;
    document.getElementById('scoreRating').textContent = endData.summary.rating.rating;
    document.getElementById('scoreDescription').textContent = endData.summary.rating.description;
    document.getElementById('endReason').textContent = endData.endReason;
    
    // Update game statistics
    document.getElementById('totalTurns').textContent = endData.summary.gameStats.totalTurns;
    document.getElementById('clueTokensUsed').textContent = endData.summary.gameStats.clueTokensUsed;
    document.getElementById('fuseTokensLost').textContent = endData.summary.gameStats.fuseTokensLost;
    document.getElementById('cardsDiscarded').textContent = endData.summary.gameStats.cardsDiscarded;
    
    // Update fireworks summary
    const fireworksSummary = document.getElementById('fireworksSummary');
    fireworksSummary.innerHTML = '';
    
    ['red', 'yellow', 'green', 'blue', 'white'].forEach(color => {
        const fireworkDiv = document.createElement('div');
        fireworkDiv.className = `firework-final ${color}`;
        
        const progress = endData.summary.fireworksProgress[color] || [];
        const maxCard = progress.length > 0 ? Math.max(...progress) : 0;
        
        if (maxCard > 0) {
            // Show only the highest card
            const colorMap = {
                'red': 'R',
                'yellow': 'Y',
                'green': 'G',
                'blue': 'B',
                'white': 'W'
            };
            
            const colorSuffix = colorMap[color];
            const cardImg = document.createElement('img');
            cardImg.src = `assets/Cards/${maxCard}${colorSuffix}.png`;
            cardImg.alt = `${color} ${maxCard}`;
            cardImg.style.width = '45px';
            cardImg.style.height = '65px';
            cardImg.style.objectFit = 'cover';
            cardImg.style.borderRadius = '4px';
            cardImg.style.border = 'none';
            
            // Fallback if image fails to load
            cardImg.onerror = function() {
                fireworkDiv.textContent = maxCard;
                fireworkDiv.style.fontSize = '18px';
                fireworkDiv.style.fontWeight = 'bold';
                fireworkDiv.style.display = 'flex';
                fireworkDiv.style.alignItems = 'center';
                fireworkDiv.style.justifyContent = 'center';
            };
            
            fireworkDiv.appendChild(cardImg);
        }
        // For empty piles, leave the element empty
        
        fireworksSummary.appendChild(fireworkDiv);
    });
    
    // Show play again button if host
    const playAgainBtn = document.getElementById('playAgainBtn');
    if (isHost) {
        playAgainBtn.style.display = 'inline-block';
    } else {
        playAgainBtn.style.display = 'none';
    }
}

function playAgain() {
    socket.emit('playAgain');
}

function backToLobby() {
    // Reset UI state
    document.getElementById('gameSection').style.display = 'none';
    document.getElementById('gameEndSection').style.display = 'none';
    document.getElementById('lobbySection').style.display = 'block';
    document.getElementById('roomSection').style.display = 'block';
    
    gameState = null;
    
    // Reset interaction state
    cancelAction();
    
    // Clear clue visualization and queue
    currentClueVisualization = null;
    clueQueue = [];
    isProcessingClue = false;
    const overlay = document.getElementById('clueConfirmationOverlay');
    overlay.classList.remove('show');
    
    // Re-enable buttons in case they were disabled
    enableGameButtons();
    
    // Reload saved form data to auto-fill if available
    loadSavedFormData();
}

// Logging and utility functions
function log(message, type = 'info') {
    const logDiv = document.getElementById('log');
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.textContent = `[${timestamp}] ${message}`;
    if (type === 'error') {
        logEntry.style.color = 'red';
    }
    logDiv.appendChild(logEntry);
    logDiv.scrollTop = logDiv.scrollHeight;
}

function clearLog() {
    document.getElementById('log').innerHTML = '';
}

// Form data management
function loadSavedFormData() {
    // Load saved room code and nickname from localStorage
    const savedRoomCode = localStorage.getItem('hanabiLastRoomCode');
    const savedNickname = localStorage.getItem('hanabiLastNickname');
    
    if (savedRoomCode) {
        document.getElementById('joinRoomCode').value = savedRoomCode;
        log(`Auto-filled room code: ${savedRoomCode}`);
    }
    
    if (savedNickname) {
        document.getElementById('createNickname').value = savedNickname;
        document.getElementById('joinNickname').value = savedNickname;
        log(`Auto-filled nickname: ${savedNickname}`);
    }
    
    // Show auto-fill notification if both are available
    if (savedRoomCode && savedNickname) {
        document.getElementById('autoFillInfo').style.display = 'block';
        log('Form auto-filled with saved data');
    }
}

function saveFormData(roomCode, nickname) {
    // Save to localStorage for future sessions
    localStorage.setItem('hanabiLastRoomCode', roomCode);
    localStorage.setItem('hanabiLastNickname', nickname);
}

function clearSavedData() {
    localStorage.removeItem('hanabiLastRoomCode');
    localStorage.removeItem('hanabiLastNickname');
    
    // Hide auto-fill notification
    document.getElementById('autoFillInfo').style.display = 'none';
    
    // Clear form fields
    document.getElementById('joinRoomCode').value = '';
    document.getElementById('createNickname').value = '';
    document.getElementById('joinNickname').value = '';
    
    log('Saved reconnection data cleared');
    showValidationMessage('Saved data cleared', 'success');
}

// Enhanced error handling
function handleSocketError(data) {
    log(`Error: ${data.message}`, 'error');
    console.error('Socket error:', data);
    showValidationMessage(data.message, 'error');
    
    // Re-enable buttons that might be disabled
    const createBtn = document.getElementById('createRoomBtn');
    const joinBtn = document.getElementById('joinRoomBtn');
    const startBtn = document.getElementById('startGameBtn');
    
    if (createBtn.disabled) {
        createBtn.disabled = false;
        createBtn.textContent = 'Create Room';
    }
    
    if (joinBtn.disabled) {
        joinBtn.disabled = false;
        joinBtn.textContent = 'Join Room';
    }
    
    if (startBtn.disabled && startBtn.textContent === 'Starting Game...') {
        startBtn.disabled = false;
        startBtn.textContent = 'Start Game';
    }
}

function requestRoomState() {
    if (currentRoom) {
        socket.emit('getRoomState', { roomCode: currentRoom });
    }
}

// Input handlers
function setupInputHandlers() {
    // Room code input formatting
    const roomCodeInput = document.getElementById('joinRoomCode');
    roomCodeInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });
    
    // Enter key support
    document.getElementById('createNickname').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') createRoom();
    });
    
    document.getElementById('joinRoomCode').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const nickname = document.getElementById('joinNickname');
            if (nickname.value.trim()) {
                joinRoom();
            } else {
                nickname.focus();
            }
        }
    });
    
    document.getElementById('joinNickname').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinRoom();
    });
}

// Keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Check if clue confirmation modal is active
        const clueModal = document.getElementById('clueConfirmationOverlay');
        if (clueModal && clueModal.classList.contains('show')) {
            if (e.key === 'Enter') {
                e.preventDefault();
                confirmClueVisualization();
                return;
            }
            return; // Don't handle other shortcuts while modal is active
        }
        
        // Only handle shortcuts during game and when it's player's turn
        if (!gameState || !isMyTurn()) return;
        
        // Ignore if user is typing in an input field
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        switch (e.key.toLowerCase()) {
            case 'p':
                e.preventDefault();
                enterPlayState();
                break;
            case 'd':
                e.preventDefault();
                enterDiscardState();
                break;
            case 'n':
                e.preventDefault();
                enterNumberClueState();
                break;
            case 'c':
                e.preventDefault();
                enterColorClueState();
                break;
            case 'escape':
                e.preventDefault();
                cancelAction();
                break;
        }
    });
}

// Initialization function
function initializeApp() {
    initSocket();
    setupInputHandlers();
    setupKeyboardShortcuts();
    loadSavedFormData();
    
    // Try to restore session if page was refreshed
    const savedRoom = sessionStorage.getItem('hanabiRoom');
    const savedPlayerId = sessionStorage.getItem('hanabiPlayerId');
    if (savedRoom && savedPlayerId) {
        currentRoom = savedRoom;
        currentPlayerId = savedPlayerId;
        log('Attempting to restore session...');
        // The socket connection will handle reconnection automatically
    }
}

// Prevent accidental page navigation
window.addEventListener('beforeunload', (e) => {
    if (currentRoom) {
        e.preventDefault();
        e.returnValue = 'Are you sure you want to leave the game?';
        return 'Are you sure you want to leave the game?';
    }
});

// Export functions that need to be called from HTML or other modules
window.confirmClueVisualization = confirmClueVisualization;
window.playAgain = playAgain;
window.backToLobby = backToLobby;
window.clearLog = clearLog;
window.clearSavedData = clearSavedData;
window.initializeApp = initializeApp; 