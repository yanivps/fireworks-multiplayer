// Global variables
let socket;
let currentRoom = null;
let currentPlayerId = null;
let isHost = false;
let gameState = null;
let playerNicknames = {};

// Modal state
let selectedPosition = null;
let selectedTargetPlayer = null;

// Initialize the game
function initializeGame() {
    setupSocketListeners();
    setupUIEventListeners();
    showLobbySection();
    // preloadTestingData();
}

// Pre-fill forms for quick testing
// function preloadTestingData() {
//     // Generate a random nickname for testing
//     const testNicknames = ['Tester', 'Player', 'User', 'Dev', 'Test'];
//     const randomNickname = testNicknames[Math.floor(Math.random() * testNicknames.length)] + Math.floor(Math.random() * 1000);
    
//     // Pre-fill create room nickname
//     document.getElementById('createNickname').value = randomNickname;
    
//     // Pre-fill join room fields
//     document.getElementById('joinRoomCode').value = 'AAAAAA';
//     document.getElementById('joinNickname').value = randomNickname + '_2';
    
//     console.log('Pre-filled testing data:', { createNickname: randomNickname, joinRoomCode: 'AAAAAA', joinNickname: randomNickname + '_2' });
// }

// Setup Socket.IO listeners
function setupSocketListeners() {
    socket = io();

    socket.on('connect', () => {
        console.log('Connected to server');
        updateConnectionStatus('connected');
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        updateConnectionStatus('disconnected');
    });

    socket.on('roomCreated', (data) => {
        console.log('Room created:', data);
        currentRoom = data.roomCode;
        currentPlayerId = data.playerId;
        isHost = true;
        
        updatePlayerNicknames(data.players);
        showRoomSection(data);
        showMessage(`Room ${data.roomCode} created!`, 'success');
    });

    socket.on('roomJoined', (data) => {
        console.log('Room joined:', data);
        currentRoom = data.roomCode;
        currentPlayerId = data.playerId;
        isHost = false;
        
        updatePlayerNicknames(data.players);
        showRoomSection(data);
        showMessage(`Joined room ${data.roomCode}`, 'success');
    });

    socket.on('playerJoined', (data) => {
        console.log('Player joined:', data);
        if (data.room) {
            updatePlayerNicknames(data.room.players);
            updatePlayersList(data.room.players);
            updateStartButton(data.room.players);
        }
        showMessage(`${data.player.nickname} joined the room`, 'info');
    });

    socket.on('playerLeft', (data) => {
        console.log('Player left:', data);
        if (data.room) {
            updatePlayerNicknames(data.room.players);
            updatePlayersList(data.room.players);
            updateStartButton(data.room.players);
        }
        showMessage(`${data.nickname} left the room`, 'info');
    });

    socket.on('hostChanged', (data) => {
        console.log('Host changed:', data);
        isHost = (data.newHostId === currentPlayerId);
        if (data.room) {
            updatePlayerNicknames(data.room.players);
            updatePlayersList(data.room.players);
            updateStartButton(data.room.players);
        }
        showMessage(`${data.newHostNickname} is now the host`, 'info');
    });

    socket.on('gameStateUpdate', (data) => {
        console.log('Game state update:', data);
        gameState = data.gameState;
        
        if (gameState.status === 'playing') {
            showGameSection();
            updateGameDisplay(data);
        } else if (gameState.status === 'ended') {
            showGameSection(); // Keep game section visible
            updateGameDisplay(data); // Update display to clean up revealed cards
            
            // Show modal after a short delay to ensure UI has updated
            setTimeout(() => {
                // Check if we have pending winner info from actionResult
                if (window.pendingGameOverModal) {
                    showGameOverModal(window.pendingGameOverModal);
                    window.pendingGameOverModal = null;
                } else {
                    // Fallback to gameState data
                    showGameOverModal();
                }
            }, 300);
        }
        
        // Handle action result
        if (data.actionResult) {
            handleActionResult(data.actionResult);
        }
    });

    socket.on('gameEnded', (data) => {
        console.log('Game ended:', data);
        showGameOverModal(data);
    });

    socket.on('error', (data) => {
        console.error('Server error:', data);
        showMessage(data.message, 'error');
    });

    socket.on('actionError', (data) => {
        console.error('Action error:', data);
        showMessage(data.message, 'error');
        enableActionButtons();
    });
}

// Setup UI event listeners
function setupUIEventListeners() {
    // Lobby
    document.getElementById('createRoomBtn').addEventListener('click', createRoom);
    document.getElementById('joinRoomBtn').addEventListener('click', joinRoom);
    
    // Room
    document.getElementById('copyRoomBtn').addEventListener('click', copyRoomCode);
    document.getElementById('leaveRoomBtn').addEventListener('click', leaveRoom);
    document.getElementById('startGameBtn').addEventListener('click', startGame);
    
    // Modal
    document.getElementById('confirmMismatchBtn').addEventListener('click', hideMismatchModal);
    
    // Game Over
    document.getElementById('backToLobbyBtn').addEventListener('click', backToLobby);
    document.getElementById('backToLobbyModalBtn').addEventListener('click', backToLobby);
    
    // Enter key support
    document.getElementById('createNickname').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') createRoom();
    });
    
    document.getElementById('joinNickname').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinRoom();
    });
    
    document.getElementById('joinRoomCode').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinRoom();
    });
    
    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Close mismatch modal with Enter key
        if (e.key === 'Enter') {
            const mismatchModal = document.getElementById('mismatchModal');
            const mismatchButton = document.getElementById('confirmMismatchBtn');
            if (mismatchModal && !mismatchModal.classList.contains('hidden') && !mismatchButton.disabled) {
                e.preventDefault();
                hideMismatchModal();
                return;
            }
        }
    });
}

// Room management functions
function createRoom() {
    const nickname = document.getElementById('createNickname').value.trim();
    if (!nickname) {
        showMessage('Please enter a nickname', 'error');
        return;
    }
    
    if (nickname.length < 2) {
        showMessage('Nickname must be at least 2 characters', 'error');
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
    
    if (roomCode.length !== 6) {
        showMessage('Room code must be 6 characters', 'error');
        return;
    }
    
    if (nickname.length < 2) {
        showMessage('Nickname must be at least 2 characters', 'error');
        return;
    }
    
    socket.emit('joinRoom', { roomCode, nickname });
}

function copyRoomCode() {
    const roomCode = document.getElementById('roomCode').textContent;
    navigator.clipboard.writeText(roomCode).then(() => {
        showMessage('Room code copied!', 'success');
    }).catch(() => {
        showMessage('Failed to copy room code', 'error');
    });
}

function leaveRoom() {
    socket.emit('leaveRoom');
    resetGameState();
    showLobbySection();
}

function startGame() {
    if (!isHost) {
        showMessage('Only the host can start the game', 'error');
        return;
    }
    
    socket.emit('startGame', {});
}

function backToLobby() {
    // Hide game over modal if it's open
    const gameOverModal = document.getElementById('gameOverModal');
    if (gameOverModal) {
        gameOverModal.classList.add('hidden');
    }
    
    leaveRoom();
}

// Game action functions

function showMismatchModal(expectedNumber, actualNumber) {
    // const message = `Expected ${expectedNumber}, got ${actualNumber}. All cards returned.`;
    const message = `All cards returned.`;
    document.getElementById('mismatchMessage').textContent = message;
    document.getElementById('mismatchModal').classList.remove('hidden');
    
    // Disable all card interactions while modal is open
    disableCardInteractions();
}

function disableCardInteractions() {
    // Add class to game board to disable all hover effects
    const gameBoard = document.querySelector('.game-board');
    if (gameBoard) {
        gameBoard.classList.add('modal-open');
    }
    
    // Remove clickable classes from all cards to disable hover effects
    document.querySelectorAll('.card.clickable').forEach(card => {
        card.classList.add('temporarily-disabled');
        card.classList.remove('clickable', 'lowest', 'highest');
    });
    
    // Remove clickable-middle class from middle pile cards
    document.querySelectorAll('.card.clickable-middle').forEach(card => {
        card.classList.add('temporarily-disabled-middle');
        card.classList.remove('clickable-middle');
    });
}

function enableCardInteractions() {
    // Only re-enable if modal is actually closed
    const mismatchModal = document.getElementById('mismatchModal');
    if (mismatchModal && !mismatchModal.classList.contains('hidden')) {
        return; // Don't re-enable if modal is still open
    }
    
    // Remove modal-open class from game board to re-enable hover effects
    const gameBoard = document.querySelector('.game-board');
    if (gameBoard) {
        gameBoard.classList.remove('modal-open');
    }
    
    // Re-enable card interactions by updating the display
    // This will rebuild all card elements with proper clickable classes
    updateGameDisplay(gameState);
}

function hideMismatchModal() {
    // Check if button is already disabled (player already acknowledged)
    const button = document.getElementById('confirmMismatchBtn');
    if (button.disabled) {
        return; // Don't process again
    }
    
    // Disable button and change text
    button.disabled = true;
    button.textContent = 'Waiting for other players...';
    
    // Send dismiss action to server
    socket.emit('gameAction', {
        action: {
            type: 'dismissMismatch'
        }
    });
    
    // Note: Don't close modal yet - wait for all players to acknowledge
}



function setupCardClickHandler(cardElement, targetPlayerId, handData, cardPosition) {
    // Only set up click handlers if it's the current player's turn
    if (!gameState || gameState.currentPlayerId !== currentPlayerId) {
        return;
    }
    
    // Don't make cards clickable if mismatch modal is open
    const mismatchModal = document.getElementById('mismatchModal');
    if (mismatchModal && !mismatchModal.classList.contains('hidden')) {
        return;
    }
    
    // Determine if this card is clickable and its position type
    const clickableInfo = getCardClickableInfo(handData, cardPosition);
    
    if (clickableInfo.isClickable) {
        cardElement.classList.add('clickable');
        cardElement.classList.add(clickableInfo.positionType); // 'lowest' or 'highest'
        cardElement.addEventListener('click', () => {
            handleCardClick(targetPlayerId, cardPosition, handData);
        });
    }
}

function getCardClickableInfo(handData, position) {
    let unrevealed;
    
    if (Array.isArray(handData)) {
        // Own hand - array of card objects
        unrevealed = handData.map((card, index) => ({ index, revealed: card.revealed }))
                            .filter(item => !item.revealed)
                            .map(item => item.index);
    } else {
        // Other player's hand - array of card info objects
        unrevealed = handData.map((cardInfo, index) => ({ index, revealed: cardInfo.revealed }))
                            .filter(item => !item.revealed)
                            .map(item => item.index);
    }
    
    if (unrevealed.length === 0) {
        return { isClickable: false, positionType: null };
    }
    
    // Card is clickable if it's the leftmost (lowest) or rightmost (highest) unrevealed card
    const leftmostIndex = Math.min(...unrevealed);
    const rightmostIndex = Math.max(...unrevealed);
    
    if (position === leftmostIndex) {
        return { isClickable: true, positionType: 'lowest' };
    } else if (position === rightmostIndex) {
        return { isClickable: true, positionType: 'highest' };
    } else {
        return { isClickable: false, positionType: null };
    }
}

function handleCardClick(targetPlayerId, position, handData) {
    // Check if mismatch modal is open - prevent interactions
    const mismatchModal = document.getElementById('mismatchModal');
    if (mismatchModal && !mismatchModal.classList.contains('hidden')) {
        return; // Don't allow card interactions when modal is open
    }
    
    // Determine if this is lowest or highest card
    let unrevealed;
    
    if (Array.isArray(handData)) {
        // Own hand
        unrevealed = handData.map((card, index) => ({ index, revealed: card.revealed }))
                            .filter(item => !item.revealed)
                            .map(item => item.index);
    } else {
        // Other player's hand
        unrevealed = handData.map((cardInfo, index) => ({ index, revealed: cardInfo.revealed }))
                            .filter(item => !item.revealed)
                            .map(item => item.index);
    }
    
    const leftmostIndex = Math.min(...unrevealed);
    const rightmostIndex = Math.max(...unrevealed);
    
    let positionType;
    if (position === leftmostIndex) {
        positionType = 'lowest';
    } else if (position === rightmostIndex) {
        positionType = 'highest';
    } else {
        showMessage('Invalid card selection', 'error');
        return;
    }
    
    // Send the action to server
    socket.emit('gameAction', {
        action: {
            type: 'revealFromHand',
            targetPlayerId: targetPlayerId,
            position: positionType
        }
    });
    
    // showMessage(`Revealing ${positionType} card from ${targetPlayerId === currentPlayerId ? 'your' : playerNicknames[targetPlayerId] + "'s"} hand...`, 'info');
}

// Removed revealFromMiddle function - players click directly on middle pile cards

// Removed endTurn function - turns end automatically

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
    statusElement.textContent = status === 'connected' ? 'Connected' : 
                               status === 'connecting' ? 'Connecting...' : 'Disconnected';
    statusElement.className = `status ${status}`;
}

function showLobbySection() {
    document.getElementById('lobbySection').style.display = 'block';
    document.getElementById('roomSection').style.display = 'none';
    document.getElementById('gameSection').style.display = 'none';
    document.getElementById('gameOverSection').style.display = 'none';
    
    // Clear form inputs
    document.getElementById('createNickname').value = '';
    document.getElementById('joinRoomCode').value = '';
    document.getElementById('joinNickname').value = '';
}

function showRoomSection(roomData) {
    document.getElementById('lobbySection').style.display = 'none';
    document.getElementById('roomSection').style.display = 'block';
    document.getElementById('gameSection').style.display = 'none';
    document.getElementById('gameOverSection').style.display = 'none';
    
    document.getElementById('roomCode').textContent = roomData.code;
    updatePlayersList(roomData.players);
    updateStartButton(roomData.players);
}

function showGameSection() {
    document.getElementById('lobbySection').style.display = 'none';
    document.getElementById('roomSection').style.display = 'none';
    document.getElementById('gameSection').style.display = 'block';
    document.getElementById('gameOverSection').style.display = 'none';
}

function showGameOverModal(data = null) {
    // Keep the game section visible, just show modal on top
    const modal = document.getElementById('gameOverModal');
    modal.classList.remove('hidden');
    
    if (data && data.winner) {
        // Use data from actionResult
        const isWinner = data.winner === currentPlayerId;
        const winnerName = playerNicknames[data.winner] || 'Someone';
        
        document.getElementById('gameOverModalTitle').textContent = 
            isWinner ? '🎉 You Won!' : 
            `🎲 ${winnerName} Wins!`;
        
        document.getElementById('gameOverModalMessage').textContent = 
            data.winReason || 'Game has ended';
    } else if (gameState && gameState.winner) {
        // Fallback to gameState data
        const isWinner = gameState.winner === currentPlayerId;
        const winnerName = playerNicknames[gameState.winner] || 'Someone';
        
        document.getElementById('gameOverModalTitle').textContent = 
            isWinner ? '🎉 You Won!' : 
            `🎲 ${winnerName} Wins!`;
        
        document.getElementById('gameOverModalMessage').textContent = 
            gameState.winReason || 'Game has ended';
    } else {
        // No winner info available
        document.getElementById('gameOverModalTitle').textContent = '🤝 Game Draw';
        document.getElementById('gameOverModalMessage').textContent = 'Game has ended';
    }
    
    // Show final statistics if gameState is available
    if (gameState) {
        const finalStats = document.getElementById('gameOverModalStats');
        finalStats.innerHTML = generateFinalStats();
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
            <div>
                ${player.isHost ? '<span class="player-badge">Host</span>' : ''}
                ${!player.connected ? '<span class="player-badge">Disconnected</span>' : ''}
            </div>
        `;
        
        playersList.appendChild(playerDiv);
    });
}

function updateStartButton(players) {
    const startBtn = document.getElementById('startGameBtn');
    const configText = document.querySelector('.game-config');
    
    const connectedPlayers = players.filter(p => p.connected).length;
    const canStart = isHost && connectedPlayers >= 3 && connectedPlayers <= 6;
    
    startBtn.style.display = isHost ? 'block' : 'none';
    startBtn.disabled = !canStart;
    
    if (connectedPlayers < 3) {
        configText.textContent = `Need ${3 - connectedPlayers} more players to start`;
    } else if (connectedPlayers > 6) {
        configText.textContent = 'Too many players (max 6)';
    } else {
        configText.textContent = `Ready to start with ${connectedPlayers} players`;
    }
}

function updateGameDisplay(data) {
    if (!gameState) return;
    
    // Update turn info
    const currentPlayerName = playerNicknames[gameState.currentPlayerId] || 'Unknown';
    document.getElementById('currentPlayerName').textContent = currentPlayerName;
    // document.getElementById('turnNumber').textContent = gameState.turnNumber;
    // document.getElementById('turnPhase').textContent = gameState.currentTurn.phase;
    
    // Update target number if revealing
    // const targetNumberSpan = document.getElementById('targetNumber');
    // if (gameState.currentTurn.targetNumber) {
    //     targetNumberSpan.style.display = 'inline';
    //     targetNumberSpan.querySelector('strong').textContent = gameState.currentTurn.targetNumber;
    // } else {
    //     targetNumberSpan.style.display = 'none';
    // }
    
    // Check if mismatch modal should be shown
    if (gameState.mismatchState && gameState.mismatchState.mismatchActive && !gameState.mismatchState.playerDismissed) {
        // Show mismatch modal if not already shown
        const modal = document.getElementById('mismatchModal');
        if (modal.classList.contains('hidden')) {
            showMismatchModal(gameState.mismatchState.expectedNumber, gameState.mismatchState.actualNumber);
        }
    }
    
    // Update middle pile
    updateMiddlePile();
    
    // Update players area
    updatePlayersArea();
    
    // Update action buttons
    updateActionButtons();
}

// Removed updateRevealedCards - cards are revealed in their original positions

function updateMiddlePile() {
    const container = document.getElementById('middlePileContainer');
    const countSpan = document.getElementById('middleCardCount');
    
    // Store previous card states before update
    const previousMiddleStates = new Map();
    if (container.children.length > 0) {
        Array.from(container.querySelectorAll('.card')).forEach(cardElement => {
            const middleIndex = cardElement.dataset.middleIndex;
            if (middleIndex !== undefined) {
                previousMiddleStates.set(middleIndex, {
                    wasRevealed: cardElement.classList.contains('revealed'),
                    wasFaceDown: cardElement.classList.contains('face-down') || cardElement.classList.contains('face-down-owner')
                });
            }
        });
    }
    
    container.innerHTML = '';
    
    if (!gameState.originalMiddlePile) {
        countSpan.textContent = '0';
        return;
    }
    
    // Count available cards (not null)
    const availableCards = gameState.originalMiddlePile.filter(card => card !== null).length;
    countSpan.textContent = availableCards;
    
    gameState.originalMiddlePile.forEach((card, index) => {
        const cardElement = createCardElement(null, false);
        cardElement.dataset.middleIndex = index;
        
        const previousState = previousMiddleStates.get(index.toString());
        
        if (card === null) {
            // This card was used in a trio - show a hole
            cardElement.classList.add('used-card');
            cardElement.textContent = '';
            cardElement.style.opacity = '0.3';
            cardElement.style.border = '2px dashed #ccc';
            cardElement.style.backgroundColor = 'transparent';
        } else if (card.revealed) {
            // Card is revealed
            cardElement.classList.add('revealed');
            cardElement.style.backgroundImage = `url('assets/${card.number}.png')`;
            cardElement.style.backgroundSize = 'cover';
            cardElement.textContent = '';
            if (card.number === 7) {
                cardElement.classList.add('number-7');
            }
            
            // Add animation if card was just revealed
            if (previousState && previousState.wasFaceDown && !previousState.wasRevealed) {
                cardElement.classList.add('card-animate');
                // Remove animation class after animation completes
                setTimeout(() => {
                    cardElement.classList.remove('card-animate');
                }, 600);
            }
        } else {
            // Check if this card is revealed due to mismatch
            let isRevealedByMismatch = false;
            if (gameState.mismatchState && gameState.mismatchState.mismatchActive) {
                const revealedCard = gameState.mismatchState.revealedCards.find(mismatchCard => 
                    mismatchCard.sourceType === 'middle' && 
                    mismatchCard.sourceIndex === index
                );
                
                if (revealedCard) {
                    isRevealedByMismatch = true;
                    cardElement.classList.add('revealed');
                    cardElement.style.backgroundImage = `url('assets/${revealedCard.number}.png')`;
                    cardElement.style.backgroundSize = 'cover';
                    cardElement.textContent = '';
                    if (revealedCard.number === 7) {
                        cardElement.classList.add('number-7');
                    }
                    
                    // Add animation if card was just revealed by mismatch
                    if (previousState && previousState.wasFaceDown && !previousState.wasRevealed) {
                        cardElement.classList.add('card-animate');
                        // Remove animation class after animation completes
                        setTimeout(() => {
                            cardElement.classList.remove('card-animate');
                        }, 600);
                    }
                }
            }
            
            if (!isRevealedByMismatch) {
                // Card is face down and clickable
                cardElement.classList.add('face-down');
                cardElement.textContent = ''; // No text needed - CSS background image handles it
                
                // Only add clickable styling and functionality for current player
                // Also check that mismatch modal is not open
                const mismatchModal = document.getElementById('mismatchModal');
                if (gameState.currentPlayerId === currentPlayerId && 
                    gameState.currentTurn.phase !== 'ended' &&
                    (mismatchModal && mismatchModal.classList.contains('hidden'))) {
                    cardElement.classList.add('clickable-middle');
                    cardElement.addEventListener('click', () => {
                        revealFromMiddleAtIndex(index);
                    });
                }
            }
        }
        
        container.appendChild(cardElement);
    });
}

function updatePlayersArea() {
    const container = document.getElementById('handsContainer');
    
    // Store previous card states before update
    const previousCardStates = new Map();
    if (container.children.length > 0) {
        Array.from(container.querySelectorAll('.card')).forEach(cardElement => {
            const playerId = cardElement.dataset.playerId;
            const position = cardElement.dataset.position;
            if (playerId && position !== undefined) {
                const key = `${playerId}-${position}`;
                previousCardStates.set(key, {
                    wasRevealed: cardElement.classList.contains('revealed'),
                    wasFaceDown: cardElement.classList.contains('face-down') || cardElement.classList.contains('face-down-owner'),
                    wasElevated: cardElement.classList.contains('card-animate-own') || cardElement.classList.contains('card-elevated-own')
                });
            }
        });
    }
    
    container.innerHTML = '';
    
    // Add player count class for positioning
    container.className = `hands-container players-${gameState.playerIds.length}`;
    
    // Sort players so current player is always first (bottom position)
    const sortedPlayerIds = [...gameState.playerIds].sort(playerId => {
        return playerId === currentPlayerId ? -1 : 1;
    });
    
    sortedPlayerIds.forEach(playerId => {
        const playerHand = createPlayerHand(playerId, previousCardStates);
        container.appendChild(playerHand);
    });
}

function createPlayerHand(playerId, previousCardStates = new Map()) {
    const playerHandDiv = document.createElement('div');
    playerHandDiv.className = 'player-hand';
    
    if (playerId === currentPlayerId) {
        playerHandDiv.classList.add('own-hand');
    } else if (playerId === gameState.currentPlayerId) {
        playerHandDiv.classList.add('current-turn');
    }
    
    const playerHand = gameState.playerHands[playerId];
    const playerTrios = gameState.collectedTrios[playerId] || [];
    
    // Calculate card count
    const cardCount = Array.isArray(playerHand) ? playerHand.length : 
                     (playerHand.hasCards ? playerHand.cardCount : 0);
    
    // Create header with player info
    const headerHtml = `
        <h4>
            <span class="player-name">${playerNicknames[playerId]}</span>
            ${playerId === gameState.currentPlayerId ? '<div class="turn-indicator">Current Turn</div>' : ''}
        </h4>
        <!-- <div class="card-count-badge">${cardCount} cards</div> -->
        <!-- <div class="trios-count">${playerTrios.length} trios</div> -->
    `;
    
    playerHandDiv.innerHTML = headerHtml + '<div class="cards" id="cards-' + playerId + '"></div>' + '<div class="player-trios" id="trios-' + playerId + '"></div>';
    
    // Update hand cards
    const cardsContainer = playerHandDiv.querySelector(`#cards-${playerId}`);
    if (Array.isArray(playerHand)) {
        // Own hand - show actual cards (already sorted by server), with revealed cards marked
        playerHand.forEach((card, index) => {
            const cardElement = createCardElement(card, true);
            cardElement.dataset.position = index; // Use actual position from server
            cardElement.dataset.playerId = playerId;
            
            // Check if this card was just revealed
            const cardKey = `${playerId}-${index}`;
            const previousState = previousCardStates.get(cardKey);
            
            // Mark revealed cards with special styling
            if (card.revealed) {
                cardElement.classList.add('revealed');
                
                // Add animation if card was just revealed - use different animation for own cards
                if (previousState && previousState.wasFaceDown && !previousState.wasRevealed) {
                    cardElement.classList.add('card-animate-own');
                    // Don't remove the animation class - keep the card elevated
                } else if (previousState && previousState.wasElevated) {
                    // Card was already elevated, keep it elevated WITHOUT animation
                    cardElement.classList.add('card-elevated-own');
                }
            } else {
                // For own hand, add face-down-owner class for animation tracking but keep showing the number
                cardElement.classList.add('face-down-owner');
                // Don't change textContent - player should see their own card numbers!
                
                // If card was previously revealed and is now face-down, animate it back down
                if (previousState && previousState.wasRevealed) {
                    cardElement.classList.add('card-animate-own-return');
                    // Remove the return animation class after animation completes
                    setTimeout(() => {
                        cardElement.classList.remove('card-animate-own-return');
                        // Also remove the elevated state from the previous animation
                        cardElement.classList.remove('card-animate-own');
                        cardElement.classList.remove('card-elevated-own');
                    }, 300);
                }
            }
            
            // Make clickable if it's a valid move
            setupCardClickHandler(cardElement, playerId, playerHand, index);
            
            cardsContainer.appendChild(cardElement);
        });
    } else if (playerHand.hasCards) {
        // Other player's hand - show cards based on server's exact position data
        playerHand.cards.forEach(cardInfo => {
            const cardKey = `${playerId}-${cardInfo.position}`;
            const previousState = previousCardStates.get(cardKey);
            
            if (cardInfo.revealed) {
                // Show revealed card at its exact position
                const cardElement = createCardElement({ number: cardInfo.number, id: cardInfo.id }, true);
                cardElement.classList.add('revealed');
                cardElement.dataset.position = cardInfo.position;
                cardElement.dataset.playerId = playerId;
                
                // Add animation if card was just revealed
                if (previousState && previousState.wasFaceDown && !previousState.wasRevealed) {
                    cardElement.classList.add('card-animate');
                    // Remove animation class after animation completes
                    setTimeout(() => {
                        cardElement.classList.remove('card-animate');
                    }, 600);
                }
                
                cardsContainer.appendChild(cardElement);
            } else {
                // Show face down card
                const cardElement = createCardElement(null, false);
                cardElement.classList.add('face-down');
                cardElement.textContent = ''; // No text needed - CSS background image handles it
                cardElement.dataset.position = cardInfo.position;
                cardElement.dataset.playerId = playerId;
                
                // Make clickable if it's a valid move
                setupCardClickHandler(cardElement, playerId, playerHand.cards, cardInfo.position);
                
                cardsContainer.appendChild(cardElement);
            }
        });
    }
    
    // Update trios display
    const triosContainer = playerHandDiv.querySelector(`#trios-${playerId}`);
    playerTrios.forEach(trio => {
        const trioElement = createTrioElement(trio);
        triosContainer.appendChild(trioElement);
    });
    
    return playerHandDiv;
}

function createCardElement(card, faceUp) {
    const cardElement = document.createElement('div');
    cardElement.className = 'card';
    
    if (faceUp && card) {
        // Use card image instead of text
        cardElement.style.backgroundImage = `url('assets/${card.number}.png')`;
        cardElement.style.backgroundSize = 'cover';
        cardElement.textContent = ''; // Remove text content
        if (card.number === 7) {
            cardElement.classList.add('number-7');
        }
    } else {
        cardElement.classList.add('face-down');
        cardElement.textContent = ''; // No text needed - background image handles it
        cardElement.style.backgroundImage = ''; // CSS will handle the back.png image
    }
    
    return cardElement;
}

function createTrioElement(trio) {
    const trioElement = document.createElement('div');
    trioElement.className = 'trio';
    
    if (trio.number === 7) {
        trioElement.classList.add('special-seven');
    }
    
    trio.cards.forEach(card => {
        const cardElement = createCardElement(card, true);
        trioElement.appendChild(cardElement);
    });
    
    return trioElement;
}

function updateActionButtons() {
    // No buttons to update anymore - cards are directly clickable
}

function disableActionButtons() {
    // No buttons to disable - will be handled by card click logic
}

function enableActionButtons() {
    // No buttons to enable - will be handled by card click logic
}

function revealFromMiddleAtIndex(index) {
    // Check if mismatch modal is open - prevent interactions
    const mismatchModal = document.getElementById('mismatchModal');
    if (mismatchModal && !mismatchModal.classList.contains('hidden')) {
        return; // Don't allow card interactions when modal is open
    }
    
    if (!gameState || gameState.currentPlayerId !== currentPlayerId) {
        showMessage('Not your turn', 'error');
        return;
    }
    
    disableActionButtons();
    
    socket.emit('gameAction', {
        action: {
            type: 'revealFromMiddle',
            cardIndex: index
        }
    });
}

function handleActionResult(result) {
    if (result.success) {
        // Check if this is a mismatch (server returns success: true for mismatches)
        if (result.actionType === 'mismatch' && result.expectedNumber && result.actualNumber) {
            // Show mismatch modal instead of toast
            showMismatchModal(result.expectedNumber, result.actualNumber);
            // Don't re-enable buttons until modal is dismissed
            return;
        }
        
        // Handle mismatch dismissal actions
        if (result.actionType === 'mismatchDismissedByPlayer') {
            // Don't show toast notification, just keep waiting
            return;
        }
        
        if (result.actionType === 'mismatchDismissedByAll') {
            // Close the mismatch modal
            document.getElementById('mismatchModal').classList.add('hidden');
            
            // Reset button state for next time
            const button = document.getElementById('confirmMismatchBtn');
            button.disabled = false;
            button.textContent = 'Continue';
            
            // Re-enable card interactions when modal is closed
            enableCardInteractions();
            
            // Don't show toast notification, just keep waiting
            // showMessage(result.message, 'success');
            
            // Re-enable buttons after all players dismissed
            setTimeout(() => {
                enableActionButtons();
            }, 500);
            return;
        }
        
        // Don't show toast notification, just keep waiting
        // showMessage(result.message, 'success');
        
        if (result.actionType === 'trioCompleted') {
            // Show toast notification for trio completion
            const isCurrentUser = gameState.currentPlayerId === currentPlayerId;
            const playerName = isCurrentUser ? 'You' : (playerNicknames[gameState.currentPlayerId] || 'Unknown');
            const trioNumber = result.trio.number;
            showMessage(`${playerName} got trio of ${trioNumber}s!`, 'success');
            
            // If the game ended, don't show modal here - wait for gameStateUpdate to clean up first  
            if (result.winner) {
                // Store winner info to show modal after gameStateUpdate
                window.pendingGameOverModal = {
                    winner: result.winner,
                    winReason: result.winReason
                };
            }
        }
        
        // Re-enable buttons after a short delay for successful actions
        setTimeout(() => {
            enableActionButtons();
        }, 500);
    } else {
        showMessage(result.error || 'Action failed', 'error');
        // Re-enable buttons after a short delay for errors
        setTimeout(() => {
            enableActionButtons();
        }, 500);
    }
}

function generateFinalStats() {
    if (!gameState) return '<p>No game data available</p>';
    
    let html = '<h4>Final Results</h4>';
    
    gameState.playerIds.forEach(playerId => {
        const trios = gameState.collectedTrios[playerId] || [];
        const trioNumbers = trios.map(trio => trio.number).join(', ');
        
        html += `
            <div style="margin-bottom: 10px; padding: 10px; background: white; border-radius: 5px;">
                <strong>${playerNicknames[playerId]}</strong>: ${trios.length} trios
                ${trioNumbers ? ` (${trioNumbers})` : ''}
                ${playerId === gameState.winner ? ' 👑' : ''}
            </div>
        `;
    });
    
    html += `<p style="margin-top: 15px; color: #666;">Total turns: ${gameState.turnNumber}</p>`;
    
    return html;
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