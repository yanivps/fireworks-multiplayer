// Global variables
let socket;
let currentRoom = null;
let currentPlayerId = null;
let isHost = false;
let gameState = null;
let players = {};

// Interactive game state
let interactionState = 'idle'; // 'idle', 'play', 'discard', 'clue'
let clueType = null; // 'color' or 'number'
let hoveredCard = null;

// Clue visualization state
let currentClueVisualization = null;
let clueQueue = []; // Queue to handle multiple clues
let isProcessingClue = false; // Flag to prevent overlapping clue processing

// Initialize socket connection
function initSocket() {
    socket = io();
    
    socket.on('connect', () => {
        updateConnectionStatus(true);
        log('Connected to server');
    });
    
    socket.on('disconnect', () => {
        updateConnectionStatus(false);
        log('Disconnected from server');
    });
    
    socket.on('error', (data) => {
        handleSocketError(data);
    });
    
    socket.on('roomCreated', (data) => {
        log(`Room created: ${data.roomCode}`);
        currentRoom = data.roomCode;
        currentPlayerId = data.playerId;
        isHost = true;
        
        // Save session data
        sessionStorage.setItem('hanabiRoom', data.roomCode);
        sessionStorage.setItem('hanabiPlayerId', data.playerId);
        
        // Save form data for future use
        const nickname = document.getElementById('createNickname').value.trim();
        saveFormData(data.roomCode, nickname);
        
        updateRoomDisplay(data);
    });
    
    socket.on('roomJoined', (data) => {
        log(`${data.reconnected ? 'Reconnected to' : 'Joined'} room: ${data.roomCode}`);
        currentRoom = data.roomCode;
        currentPlayerId = data.playerId;
        isHost = false;
        
        // Save session data
        sessionStorage.setItem('hanabiRoom', data.roomCode);
        sessionStorage.setItem('hanabiPlayerId', data.playerId);
        
        // Save form data for future use
        const nickname = document.getElementById('joinNickname').value.trim();
        saveFormData(data.roomCode, nickname);
        
        updateRoomDisplay(data);
        
        if (data.reconnected) {
            log('Successfully reconnected as existing player');
        }
    });
    
    socket.on('playerJoined', (data) => {
        log(`Player joined: ${data.player.nickname}`);
        // Request updated room state to refresh player list
        requestRoomState();
    });
    
    socket.on('playerDisconnected', (data) => {
        log(`Player disconnected: ${data.nickname}`);
        // Request updated room state to refresh player list
        requestRoomState();
    });
    
    socket.on('playerReconnected', (data) => {
        log(`Player reconnected: ${data.nickname}`);
        // Request updated room state to refresh player list
        requestRoomState();
    });
    
    socket.on('hostChanged', (data) => {
        log(`New host: ${data.newHostNickname}`);
        isHost = (data.newHostId === currentPlayerId);
        // Request updated room state to refresh player list with new host
        requestRoomState();
    });
    
    socket.on('gameStarted', (data) => {
        log('Game started!');
        gameState = data.gameState;
        showGameSection();
        updateGameDisplay();
    });
    
    socket.on('actionResult', (data) => {
        log(`Action: ${data.action.action}`);
        console.log('Action result received:', data);
        
        // Update game state first
        gameState = data.gameState;
        
        // Handle different action types with enhanced visual feedback
        if (data.action.action === 'play') {
            handlePlayActionResult(data.action);
        } else if (data.action.action === 'discard') {
            handleDiscardActionResult(data.action);
        } else if (data.action.action === 'clue') {
            handleClueActionResult(data.action);
        }
        
        // Update display after handling specific action feedback
        updateGameDisplay();
    });
    
    socket.on('gameState', (data) => {
        if (data.gameState) {
            gameState = data.gameState;
            updateGameDisplay();
        }
    });
    
    socket.on('gameEnded', (data) => {
        log(`Game ended: ${data.endReason}`);
        showGameEndSection(data);
    });
    
    socket.on('finalRoundBegin', (data) => {
        log('Final round has begun - deck is empty!');
        showGameStateIndicator(`Final Round! ${data.turnsLeft} turns remaining`, 'warning', 5000);
        
        // Change the deck counter to turns counter
        const deckHeader = document.querySelector('.deck-counter h4');
        const deckCountElement = document.getElementById('deckCount');
        
        if (deckHeader && deckCountElement) {
            deckHeader.textContent = 'Turns Left';
            deckCountElement.textContent = data.turnsLeft;
            
            // Update CSS class for different styling if needed
            const deckCounterDiv = document.querySelector('.deck-counter');
            if (deckCounterDiv) {
                deckCounterDiv.classList.add('final-round');
            }
        }
    });
    
    // Handle room state updates
    socket.on('roomStateUpdated', (data) => {
        if (data.players) {
            updatePlayersList(data.players);
            updateStartButton();
        }
    });
}

function updateConnectionStatus(connected) {
    const status = document.getElementById('connectionStatus');
    if (connected) {
        status.textContent = 'Connected';
        status.className = 'status connected';
    } else {
        status.textContent = 'Disconnected';
        status.className = 'status disconnected';
    }
}

function createRoom() {
    const nickname = document.getElementById('createNickname').value.trim();
    if (!nickname) {
        showValidationMessage('Please enter a nickname', 'error');
        return;
    }
    
    if (nickname.length < 2) {
        showValidationMessage('Nickname must be at least 2 characters', 'error');
        return;
    }
    
    // Disable button to prevent double-clicks
    const btn = document.getElementById('createRoomBtn');
    btn.disabled = true;
    btn.textContent = 'Creating...';
    
    socket.emit('createRoom', { nickname });
    
    // Re-enable button after timeout
    setTimeout(() => {
        btn.disabled = false;
        btn.textContent = 'Create Room';
    }, 3000);
}

function joinRoom() {
    const roomCode = document.getElementById('joinRoomCode').value.trim().toUpperCase();
    const nickname = document.getElementById('joinNickname').value.trim();
    
    if (!roomCode) {
        showValidationMessage('Please enter a room code', 'error');
        return;
    }
    
    if (roomCode.length !== 6) {
        showValidationMessage('Room code must be 6 characters', 'error');
        return;
    }
    
    if (!nickname) {
        showValidationMessage('Please enter a nickname', 'error');
        return;
    }
    
    if (nickname.length < 2) {
        showValidationMessage('Nickname must be at least 2 characters', 'error');
        return;
    }
    
    // Disable button to prevent double-clicks
    const btn = document.getElementById('joinRoomBtn');
    btn.disabled = true;
    btn.textContent = 'Joining...';
    
    socket.emit('joinRoom', { roomCode, nickname });
    
    // Re-enable button after timeout
    setTimeout(() => {
        btn.disabled = false;
        btn.textContent = 'Join Room';
    }, 3000);
}

function copyRoomCode(event) {
    const roomCode = document.getElementById('currentRoomCode').textContent;
    navigator.clipboard.writeText(roomCode).then(() => {
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        btn.style.background = '#28a745';
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '#2196f3';
        }, 2000);
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = roomCode;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    });
}

function showValidationMessage(message, type) {
    // Try to find validation message in current context
    let msgElement = document.getElementById('validationMessage');
    
    // If not found, create a temporary one in lobby
    if (!msgElement || msgElement.style.display === 'none') {
        // Create temporary message for lobby
        const tempMsg = document.createElement('div');
        tempMsg.className = `validation-message ${type}`;
        tempMsg.textContent = message;
        tempMsg.style.marginTop = '10px';
        
        // Find the appropriate parent
        const lobbySection = document.getElementById('lobbySection');
        if (lobbySection && lobbySection.style.display !== 'none') {
            lobbySection.appendChild(tempMsg);
            setTimeout(() => {
                if (tempMsg.parentNode) {
                    tempMsg.parentNode.removeChild(tempMsg);
                }
            }, 5000);
        }
        return;
    }
    
    msgElement.textContent = message;
    msgElement.className = `validation-message ${type}`;
    msgElement.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        msgElement.style.display = 'none';
    }, 5000);
}

function updateRoomDisplay(data) {
    document.getElementById('roomSection').style.display = 'block';
    document.getElementById('currentRoomCode').textContent = data.roomCode;
    
    updatePlayersList(data.players);
    updateStartButton();
}

function updatePlayersList(playerList) {
    const list = document.getElementById('playersList');
    const countElement = document.getElementById('playerCount');
    list.innerHTML = '';
    
    if (playerList) {
        // Store players for game display
        players = {};
        playerList.forEach(player => {
            players[player.id] = player;
            
            const li = document.createElement('li');
            li.className = 'player-item';
            
            // Add disconnected styling if player is offline
            if (player.connected === false) {
                li.classList.add('disconnected');
            }
            
            const playerInfo = document.createElement('div');
            playerInfo.className = 'player-info';
            
            const statusDot = document.createElement('div');
            statusDot.className = player.connected !== false ? 'player-status' : 'player-status disconnected';
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'player-name';
            nameSpan.textContent = player.nickname;
            if (player.isHost) {
                nameSpan.classList.add('host');
            }
            
            playerInfo.appendChild(statusDot);
            playerInfo.appendChild(nameSpan);
            
            // Add disconnection info if player is offline
            if (player.connected === false) {
                const disconnectInfo = document.createElement('div');
                disconnectInfo.className = 'disconnection-info';
                disconnectInfo.textContent = 'Disconnected (5min to reconnect)';
                playerInfo.appendChild(disconnectInfo);
            }
            
            li.appendChild(playerInfo);
            
            const rightSide = document.createElement('div');
            rightSide.style.display = 'flex';
            rightSide.style.alignItems = 'center';
            rightSide.style.gap = '8px';
            
            if (player.isHost) {
                const hostBadge = document.createElement('span');
                hostBadge.className = 'host-badge';
                hostBadge.textContent = 'HOST';
                rightSide.appendChild(hostBadge);
            }
            
            li.appendChild(rightSide);
            list.appendChild(li);
        });
        
        // Update player count (only count connected players for validation)
        const connectedCount = playerList.filter(p => p.connected !== false).length;
        const totalCount = playerList.length;
        
        if (connectedCount !== totalCount) {
            countElement.textContent = `${connectedCount}/${totalCount} (${totalCount}/5)`;
        } else {
            countElement.textContent = `${totalCount}/5`;
        }
        
        if (connectedCount >= 2 && connectedCount <= 5) {
            countElement.className = 'player-count valid';
        } else {
            countElement.className = 'player-count invalid';
        }
    }
}

function updateStartButton() {
    const startSection = document.getElementById('startGameSection');
    const startBtn = document.getElementById('startGameBtn');
    const msgElement = document.getElementById('validationMessage');
    
    if (isHost) {
        startSection.style.display = 'block';
        
        const playerCount = Object.keys(players).length;
        
        if (playerCount < 2) {
            startBtn.disabled = true;
            showValidationMessage('Need at least 2 players to start', 'warning');
        } else if (playerCount > 5) {
            startBtn.disabled = true;
            showValidationMessage('Maximum 5 players allowed', 'error');
        } else {
            startBtn.disabled = false;
            msgElement.style.display = 'none';
        }
    } else {
        startSection.style.display = 'none';
    }
}

function startGame() {
    const playerCount = Object.keys(players).length;
    
    if (playerCount < 2) {
        showValidationMessage('Need at least 2 players to start', 'error');
        return;
    }
    
    if (playerCount > 5) {
        showValidationMessage('Maximum 5 players allowed', 'error');
        return;
    }
    
    // Disable button and show loading state
    const btn = document.getElementById('startGameBtn');
    btn.disabled = true;
    btn.textContent = 'Starting Game...';
    
    socket.emit('startGame', {});
    
    // Re-enable button after timeout in case of error
    setTimeout(() => {
        btn.disabled = false;
        btn.textContent = 'Start Game';
    }, 5000);
}

function showGameSection() {
    document.getElementById('lobbySection').style.display = 'none';
    document.getElementById('roomSection').style.display = 'none';
    document.getElementById('gameEndSection').style.display = 'none';
    document.getElementById('gameSection').style.display = 'block';
    
    // Reset any final round UI state
    const deckCounterDiv = document.querySelector('.deck-counter');
    const deckHeader = document.querySelector('.deck-counter h4');
    
    if (deckCounterDiv) {
        deckCounterDiv.classList.remove('final-round');
    }
    
    if (deckHeader) {
        deckHeader.textContent = 'Cards Left';
    }
}

function updateGameDisplay() {
    if (!gameState) return;
    
    // Update tokens
    document.getElementById('clueTokens').textContent = gameState.clueTokens;
    document.getElementById('fuseTokens').textContent = gameState.fuseTokens;
    
    // Update deck count or turns left based on game state
    const deckCountElement = document.getElementById('deckCount');
    if (gameState.finalRound) {
        // Show turns left in final round
        deckCountElement.textContent = gameState.finalRoundTurnsLeft;
    } else {
        // Show cards remaining in deck
        deckCountElement.textContent = gameState.deck.length;
    }
    
    // Update fireworks piles with card images only
    ['red', 'yellow', 'green', 'blue', 'white'].forEach(color => {
        const pile = gameState.fireworksPiles[color];
        const topCardElement = document.getElementById(`${color}-top`);
        
        // Clear existing content
        topCardElement.innerHTML = '';
        
        if (pile.cards.length > 0) {
            // Show the top card as a small image
            const topCard = pile.cards[pile.cards.length - 1];
            const colorMap = {
                'red': 'R',
                'yellow': 'Y',
                'green': 'G',
                'blue': 'B',
                'white': 'W'
            };
            
            const colorSuffix = colorMap[color];
            const cardImg = document.createElement('img');
            cardImg.src = `assets/Cards/${topCard.number}${colorSuffix}.png`;
            cardImg.alt = `${color} ${topCard.number}`;
            cardImg.style.width = '45px';
            cardImg.style.height = '65px';
            cardImg.style.objectFit = 'cover';
            cardImg.style.borderRadius = '4px';
            cardImg.style.border = 'none';
            
            // Fallback if image fails to load
            cardImg.onerror = function() {
                topCardElement.textContent = topCard.number;
                topCardElement.style.fontSize = '18px';
                topCardElement.style.fontWeight = 'bold';
            };
            
            topCardElement.appendChild(cardImg);
        }
        // For empty piles, leave the element empty (no dash)
    });
    
    // Update discard pile with top card
    const discardTopElement = document.getElementById('discard-top');
    discardTopElement.innerHTML = '';
    
    if (gameState.discardPile && gameState.discardPile.length > 0) {
        // Show the top card of the discard pile
        const topCard = gameState.discardPile[gameState.discardPile.length - 1];
        const colorMap = {
            'red': 'R',
            'yellow': 'Y',
            'green': 'G',
            'blue': 'B',
            'white': 'W'
        };
        
        const colorSuffix = colorMap[topCard.color];
        const cardImg = document.createElement('img');
        cardImg.src = `assets/Cards/${topCard.number}${colorSuffix}.png`;
        cardImg.alt = `${topCard.color} ${topCard.number}`;
        cardImg.style.width = '45px';
        cardImg.style.height = '65px';
        cardImg.style.objectFit = 'cover';
        cardImg.style.borderRadius = '4px';
        cardImg.style.border = 'none';
        
        // Fallback if image fails to load
        cardImg.onerror = function() {
            discardTopElement.innerHTML = '<span class="pile-label">Discard</span>';
        };
        
        discardTopElement.appendChild(cardImg);
    } else {
        // Empty discard pile - show label
        const label = document.createElement('span');
        label.className = 'pile-label';
        label.textContent = 'Discard';
        discardTopElement.appendChild(label);
    }
    
    // Update hands
    updateHandsDisplay();
}

// Action result handlers with enhanced visual feedback
function handlePlayActionResult(action) {
    const playerName = action.playerNickname || 'Unknown';
    const cardText = `${action.card.color} ${action.card.number}`;
    const isMyAction = action.playerId === currentPlayerId;
    
    if (action.invalidPlay) {
        // Invalid play - show error feedback
        if (!isMyAction) {
            showActionFeedback(`${playerName} played ${cardText} - Invalid! Fuse token lost.`, 'error');
        } else {
            showGameStateIndicator('Invalid play! Fuse token lost.', 'error', 4000);
        }
        
        // Animate token loss
        animateTokenChange('fuse', -1);
        
        // Find and animate the card that was played invalidly
        const cardElement = document.querySelector(`[data-player-id="${action.playerId}"]`);
        if (cardElement) {
            animateInvalidPlay(cardElement);
        }
    } else {
        // Valid play - show success feedback
        if (!isMyAction) {
            showActionFeedback(`${playerName} played ${cardText} successfully!`, 'success');
        } else {
            showGameStateIndicator('Card played successfully!', 'success', 3000);
        }
        
        // Animate firework pile success
        animateFireworkSuccess(action.card.color);
    }
    
    // If a new card was drawn, animate it
    if (action.newCard) {
        setTimeout(() => {
            const newCardElement = document.querySelector(`[data-player-id="${action.playerId}"][data-card-index="${action.cardIndex}"]`);
            if (newCardElement) {
                animateNewCard(newCardElement);
            }
        }, 100);
    }
}

function handleDiscardActionResult(action) {
    const playerName = action.playerNickname || 'Unknown';
    const cardText = `${action.card.color} ${action.card.number}`;
    const isMyAction = action.playerId === currentPlayerId;
    
    // Show discard feedback only for other players
    if (!isMyAction) {
        showActionFeedback(`${playerName} discarded ${cardText}`, 'info');
    }
    
    if (action.clueTokenGained) {
        animateTokenChange('clue', 1);
    } 
    
    // If a new card was drawn, animate it
    if (action.newCard) {
        setTimeout(() => {
            const newCardElement = document.querySelector(`[data-player-id="${action.playerId}"][data-card-index="${action.cardIndex}"]`);
            if (newCardElement) {
                animateNewCard(newCardElement);
            }
        }, 100);
    }
}

function handleClueActionResult(action) {
    const giverName = action.playerNickname || 'Unknown';
    const targetName = action.targetNickname || 'Unknown';
    const clueText = action.clueType === 'color' 
        ? `${action.clueValue} color` 
        : `number ${action.clueValue}`;
    const isMyAction = action.giverId === currentPlayerId;
    
    // Create clue visualization data
    const clueVisualization = {
        giverId: action.giverId,
        targetPlayerId: action.targetPlayerId,
        clueType: action.clueType,
        clueValue: action.clueValue,
        matchingCardIndices: action.matchingCardIndices,
        giverName: giverName,
        targetName: targetName,
        clueText: clueText
    };
    
    log(`Clue given: ${giverName} → ${targetName} (${clueText})`);
    
    // Add to queue if this player should see the clue (not the giver)
    if (action.giverId !== currentPlayerId) {
        clueQueue.push(clueVisualization);
        processClueQueue();
    }
    
    // Animate clue token usage
    animateTokenChange('clue', -1);
}

// Export functions that need to be called from HTML
window.createRoom = createRoom;
window.joinRoom = joinRoom;
window.copyRoomCode = copyRoomCode;
window.startGame = startGame;