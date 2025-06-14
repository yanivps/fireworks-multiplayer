// War Card Game Client

let socket;
let currentRoom = null;
let currentPlayerId = null;
let isHost = false;
let gameState = null;
let playerNicknames = {};

// Initialize the game
function initializeGame() {
    socket = io();
    setupSocketListeners();
    setupUIEventListeners();
    updateConnectionStatus('Connecting...');
}

// Setup Socket.IO event listeners
function setupSocketListeners() {
    socket.on('connect', () => {
        updateConnectionStatus('Connected');
        console.log('Connected to server');
    });

    socket.on('disconnect', () => {
        updateConnectionStatus('Disconnected');
        console.log('Disconnected from server');
    });

    socket.on('roomCreated', (data) => {
        console.log('Room created:', data);
        currentRoom = data.roomCode;
        currentPlayerId = data.playerId;
        isHost = true;
        updatePlayerNicknames(data.players);
        showRoomSection(data);
    });

    socket.on('roomJoined', (data) => {
        console.log('Room joined:', data);
        currentRoom = data.roomCode;
        currentPlayerId = data.playerId;
        isHost = false;
        updatePlayerNicknames(data.players);
        showRoomSection(data);
    });

    socket.on('playerJoined', (data) => {
        console.log('Player joined:', data);
        updatePlayerNicknames(data.room.players);
        updatePlayersList(data.room.players);
        showMessage(`${data.player.nickname} joined the room`);
        
        // Update start button visibility when player count changes
        const startBtn = document.getElementById('startGameBtn');
        const shouldShowButton = isHost && data.room.players && data.room.players.length === 2;
        startBtn.style.display = shouldShowButton ? 'block' : 'none';
    });

    socket.on('playerLeft', (data) => {
        console.log('Player left:', data);
        showMessage(`${data.nickname} left the room`);
        // Room data will be updated in next event
    });

    socket.on('gameStateUpdate', (data) => {
        console.log('Game state update:', data);
        gameState = data.gameState;
        
        // Convert waitingForAction array back to Set (lost during JSON serialization)
        ensureWaitingForActionIsSet(gameState);
        
        updateGameDisplay(data);
        
        if (gameState.status === 'playing') {
            showGameSection();
        } else if (gameState.status === 'ended') {
            showGameOverScreen();
        }
    });

    socket.on('actionResult', (data) => {
        console.log('Action result:', data);
        handleActionResult(data);
    });

    socket.on('error', (data) => {
        console.error('Server error:', data);
        showMessage(data.message, 'error');
    });

    socket.on('actionError', (data) => {
        console.error('Action error:', data);
        showMessage(data.message, 'error');
    });
}

// Setup UI event listeners
function setupUIEventListeners() {
    document.getElementById('createRoomBtn').addEventListener('click', createRoom);
    document.getElementById('joinRoomBtn').addEventListener('click', joinRoom);
    document.getElementById('startGameBtn').addEventListener('click', startGame);
    document.getElementById('leaveRoomBtn').addEventListener('click', leaveRoom);
    document.getElementById('playCardBtn').addEventListener('click', playCard);
    document.getElementById('backToLobbyBtn').addEventListener('click', backToLobby);

    // Enter key support for inputs
    document.getElementById('createNickname').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') createRoom();
    });

    document.getElementById('joinNickname').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinRoom();
    });

    document.getElementById('joinRoomCode').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinRoom();
    });
}

// Room management functions
function createRoom() {
    const nickname = document.getElementById('createNickname').value.trim();
    if (!nickname) {
        showMessage('Please enter a nickname', 'error');
        return;
    }

    socket.emit('createRoom', { nickname });
}

function joinRoom() {
    const roomCode = document.getElementById('joinRoomCode').value.trim().toUpperCase();
    const nickname = document.getElementById('joinNickname').value.trim();
    
    if (!roomCode || !nickname) {
        showMessage('Please enter both room code and nickname', 'error');
        return;
    }

    socket.emit('joinRoom', { roomCode, nickname });
}

function startGame() {
    if (!isHost) {
        showMessage('Only the host can start the game', 'error');
        return;
    }

    socket.emit('startGame', {});
}

function leaveRoom() {
    socket.emit('leaveRoom');
    resetGameState();
    showLobbySection();
}

function backToLobby() {
    leaveRoom();
}

// Game actions
function playCard() {
    if (!gameState || gameState.status !== 'playing') {
        showMessage('Game is not active', 'error');
        return;
    }

    // Ensure waitingForAction is a Set
    ensureWaitingForActionIsSet(gameState);

    if (!gameState.currentRound.waitingForAction.has(currentPlayerId)) {
        showMessage('Not your turn to play a card', 'error');
        return;
    }

    socket.emit('gameAction', {
        type: 'playCard'
    });

    // Disable button to prevent double-clicking
    document.getElementById('playCardBtn').disabled = true;
}

// Game state management
function updatePlayerNicknames(players) {
    playerNicknames = {};
    players.forEach(player => {
        playerNicknames[player.id] = player.nickname;
    });
}

function resetGameState() {
    currentRoom = null;
    currentPlayerId = null;
    isHost = false;
    gameState = null;
    playerNicknames = {};
}

// UI update functions
function updateConnectionStatus(status) {
    const statusElement = document.getElementById('connectionStatus');
    statusElement.textContent = status;
    statusElement.className = 'status ' + status.toLowerCase();
}

function showLobbySection() {
    document.getElementById('lobbySection').style.display = 'block';
    document.getElementById('roomSection').style.display = 'none';
    document.getElementById('gameSection').style.display = 'none';
    
    // Clear form inputs
    document.getElementById('createNickname').value = '';
    document.getElementById('joinRoomCode').value = '';
    document.getElementById('joinNickname').value = '';
}

function showRoomSection(roomData) {
    document.getElementById('lobbySection').style.display = 'none';
    document.getElementById('roomSection').style.display = 'block';
    document.getElementById('gameSection').style.display = 'none';
    
    document.getElementById('roomCode').textContent = roomData.roomCode;
    updatePlayersList(roomData.players);
    
    // Show start button only for host and when we have 2 players
    const startBtn = document.getElementById('startGameBtn');
    const shouldShowButton = isHost && roomData.players && roomData.players.length === 2;
    startBtn.style.display = shouldShowButton ? 'block' : 'none';
}

function showGameSection() {
    document.getElementById('lobbySection').style.display = 'none';
    document.getElementById('roomSection').style.display = 'none';
    document.getElementById('gameSection').style.display = 'block';
    document.getElementById('gameOverScreen').style.display = 'none';
    
    // Initialize game display
    updateGameDisplay({ gameState });
}

function showGameOverScreen() {
    document.getElementById('gameOverScreen').style.display = 'flex';
    
    const endCheck = checkEndConditions();
    if (endCheck.ended) {
        const result = endCheck.result;
        
        document.getElementById('gameOverTitle').textContent = 
            result.winner === currentPlayerId ? '🎉 You Won!' : 
            result.winner ? '😔 You Lost!' : '🤝 Draw!';
        
        document.getElementById('gameOverMessage').textContent = result.reason;
        document.getElementById('finalRounds').textContent = result.totalRounds || gameState.roundNumber;
        document.getElementById('finalWars').textContent = result.totalWars || gameState.totalWars;
    }
}

function updatePlayersList(players) {
    const playersList = document.getElementById('playersList');
    playersList.innerHTML = '';
    
    players.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player';
        if (player.isHost) playerDiv.classList.add('host');
        if (!player.connected) playerDiv.classList.add('disconnected');
        
        playerDiv.innerHTML = `
            <span class="player-name">${player.nickname}</span>
            ${player.isHost ? '<span class="player-badge">Host</span>' : ''}
            ${!player.connected ? '<span class="player-badge">Disconnected</span>' : ''}
        `;
        
        playersList.appendChild(playerDiv);
    });
}

function updateGameDisplay(data) {
    if (!gameState) return;
    
    // Update game stats
    document.getElementById('roundNumber').textContent = gameState.roundNumber || 1;
    document.getElementById('totalWars').textContent = gameState.totalWars || 0;
    
    // Update player names
    const playerIds = gameState.playerIds;
    const opponentId = playerIds.find(id => id !== currentPlayerId);
    
    document.getElementById('playerName').textContent = playerNicknames[currentPlayerId] || 'You';
    document.getElementById('opponentName').textContent = playerNicknames[opponentId] || 'Opponent';
    
    // Update card counts
    const playerCardCount = gameState.playerStacks[currentPlayerId]?.length || 0;
    const opponentCardCount = gameState.playerStacks[opponentId]?.length || 0;
    
    document.getElementById('playerCardCount').textContent = playerCardCount;
    document.getElementById('opponentCardCount').textContent = opponentCardCount;
    
    // Update card stack visibility
    const playerStack = document.getElementById('playerStack');
    const opponentStack = document.getElementById('opponentStack');
    
    playerStack.style.display = playerCardCount > 0 ? 'block' : 'none';
    opponentStack.style.display = opponentCardCount > 0 ? 'block' : 'none';
    
    // Update battle area
    updateBattleArea();
    
    // Update play button
    updatePlayButton();
}

function updateBattleArea() {
    if (!gameState || !gameState.currentRound) return;
    
    const playerIds = gameState.playerIds;
    const opponentId = playerIds.find(id => id !== currentPlayerId);
    const cardsPlayed = gameState.currentRound.cardsPlayed;
    
    // Show war indicator if it's a war round
    const warIndicator = document.getElementById('warIndicator');
    warIndicator.style.display = gameState.currentRound.roundType === 'war' ? 'block' : 'none';
    
    // Update battle cards
    const playerCard = cardsPlayed[currentPlayerId]?.slice(-1)[0]; // Last card played
    const opponentCard = cardsPlayed[opponentId]?.slice(-1)[0]; // Last card played
    
    updateBattleCard('playerBattleCard', playerCard, true);
    updateBattleCard('opponentBattleCard', opponentCard, false);
    
    // Update battle message
    updateBattleMessage();
}

function updateBattleCard(elementId, card, isPlayer) {
    const cardElement = document.getElementById(elementId);
    
    if (card) {
        cardElement.className = 'card';
        cardElement.innerHTML = `
            <div class="card-rank">${card.rank}</div>
            <div class="card-suit">${getSuitSymbol(card.suit)}</div>
        `;
        cardElement.classList.add(getSuitColor(card.suit));
    } else {
        cardElement.className = 'card empty-slot';
        cardElement.innerHTML = `<span>${isPlayer ? 'Your Card' : 'Opponent\'s Card'}</span>`;
    }
}

function updateBattleMessage() {
    const battleMessage = document.getElementById('battleMessage');
    
    if (!gameState || !gameState.currentRound) {
        battleMessage.textContent = 'Ready to battle!';
        return;
    }
    
    // Ensure waitingForAction is a Set
    ensureWaitingForActionIsSet(gameState);

    const waitingCount = gameState.currentRound.waitingForAction.size;
    const isWaiting = gameState.currentRound.waitingForAction.has(currentPlayerId);
    
    if (waitingCount === 2) {
        battleMessage.textContent = 'Both players draw your cards!';
    } else if (waitingCount === 1 && isWaiting) {
        battleMessage.textContent = 'Your turn - draw a card!';
    } else if (waitingCount === 1 && !isWaiting) {
        battleMessage.textContent = 'Waiting for opponent...';
    } else {
        battleMessage.textContent = 'Battle in progress...';
    }
}

function updatePlayButton() {
    const playBtn = document.getElementById('playCardBtn');
    
    if (!gameState || gameState.status !== 'playing') {
        playBtn.disabled = true;
        playBtn.textContent = 'Game Not Active';
        return;
    }
    
    // Ensure waitingForAction is a Set
    ensureWaitingForActionIsSet(gameState);

    const isWaiting = gameState.currentRound.waitingForAction.has(currentPlayerId);
    const hasCards = gameState.playerStacks[currentPlayerId]?.length > 0;
    
    playBtn.disabled = !isWaiting || !hasCards;
    
    if (!hasCards) {
        playBtn.textContent = 'No Cards Left';
    } else if (isWaiting) {
        playBtn.textContent = gameState.currentRound.roundType === 'war' ? 'Draw War Card' : 'Draw Card';
    } else {
        playBtn.textContent = 'Waiting...';
    }
}

function handleActionResult(data) {
    if (data.success) {
        // Show the card that was played
        if (data.card) {
            const cardName = `${data.card.rank} of ${data.card.suit}`;
            showMessage(`You played: ${cardName}`, 'success');
        }
        
        // Handle round results
        if (data.roundResolved) {
            setTimeout(() => {
                if (data.winner) {
                    const winnerName = data.winner === currentPlayerId ? 'You' : playerNicknames[data.winner];
                    showMessage(`${winnerName} won the round! ${data.winReason}`, 'success');
                } else if (data.war) {
                    showMessage(data.winReason, 'warning');
                }
            }, 1000);
        }
        
        if (data.warStarted) {
            setTimeout(() => {
                showMessage('War continues! Draw your battle card!', 'warning');
            }, 1500);
        }
    } else {
        showMessage(data.error || 'Action failed', 'error');
    }
    
    // Re-enable the play button
    setTimeout(() => {
        updatePlayButton();
    }, 500);
}

// Helper functions
function ensureWaitingForActionIsSet(gameState) {
    if (!gameState || !gameState.currentRound) {
        return;
    }
    
    if (!gameState.currentRound.waitingForAction) {
        gameState.currentRound.waitingForAction = new Set();
    } else if (!gameState.currentRound.waitingForAction.has) {
        // Convert to Set if it's not already a Set
        if (Array.isArray(gameState.currentRound.waitingForAction)) {
            gameState.currentRound.waitingForAction = new Set(gameState.currentRound.waitingForAction);
        } else {
            // Fallback: create empty Set if it's not an array
            gameState.currentRound.waitingForAction = new Set();
        }
    }
}

function getSuitSymbol(suit) {
    const symbols = {
        'hearts': '♥',
        'diamonds': '♦',
        'clubs': '♣',
        'spades': '♠'
    };
    return symbols[suit] || suit;
}

function getSuitColor(suit) {
    return (suit === 'hearts' || suit === 'diamonds') ? 'red' : 'black';
}

function checkEndConditions() {
    if (!gameState) return { ended: false };
    
    const playerIds = gameState.playerIds;
    const player1Cards = gameState.playerStacks[playerIds[0]]?.length || 0;
    const player2Cards = gameState.playerStacks[playerIds[1]]?.length || 0;
    
    if (player1Cards === 0) {
        return {
            ended: true,
            result: {
                winner: playerIds[1],
                loser: playerIds[0],
                reason: 'Opponent ran out of cards',
                totalRounds: gameState.roundNumber,
                totalWars: gameState.totalWars
            }
        };
    }
    
    if (player2Cards === 0) {
        return {
            ended: true,
            result: {
                winner: playerIds[0],
                loser: playerIds[1],
                reason: 'Opponent ran out of cards',
                totalRounds: gameState.roundNumber,
                totalWars: gameState.totalWars
            }
        };
    }
    
    if (gameState.status === 'ended') {
        return {
            ended: true,
            result: {
                winner: null,
                reason: 'Game ended in a draw',
                totalRounds: gameState.roundNumber,
                totalWars: gameState.totalWars
            }
        };
    }
    
    return { ended: false };
}

function showMessage(message, type = 'info') {
    const messagesContainer = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    messagesContainer.appendChild(messageDiv);
    
    // Auto-remove message after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 5000);
}

// Initialize when page loads
window.addEventListener('load', initializeGame); 