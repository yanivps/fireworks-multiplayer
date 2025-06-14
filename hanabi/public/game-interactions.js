// Game interaction functions

function updateHandsDisplay() {
    const handsContainer = document.getElementById('handsContainer');
    handsContainer.innerHTML = '';
    
    if (!gameState || !gameState.hands) return;
    
    const playerEntries = Object.entries(gameState.hands);
    const playerCount = playerEntries.length;
    
    // Add player count class for positioning
    handsContainer.className = `hands-container players-${playerCount}`;
    
    // Sort players so current player is always first (bottom position)
    const sortedPlayers = playerEntries.sort(([playerId]) => {
        return playerId === currentPlayerId ? -1 : 1;
    });
    
    sortedPlayers.forEach(([playerId, hand], index) => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-hand';
        
        const playerName = players[playerId]?.nickname || 'Unknown';
        const isCurrentPlayer = playerId === currentPlayerId;
        const isTurn = playerId === gameState.currentPlayerId;
        
        // Add special classes for styling
        if (isCurrentPlayer) {
            playerDiv.classList.add('own-hand');
        }
        if (isTurn) {
            playerDiv.classList.add('current-turn');
        }
        
        // Create player header
        const headerDiv = document.createElement('div');
        headerDiv.innerHTML = `
            <h4>
                <span class="player-name">${playerName}</span>
                ${isCurrentPlayer ? ' (You)' : ''}
                ${isTurn ? '<div class="turn-indicator">👈 Your Turn</div>' : ''}
            </h4>
        `;
        playerDiv.appendChild(headerDiv);
        
        // Create cards container
        const cardsDiv = document.createElement('div');
        cardsDiv.className = 'cards';
        cardsDiv.id = `hand-${playerId}`;
        
        hand.forEach((card, cardIndex) => {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'card';
            cardDiv.dataset.playerId = playerId;
            cardDiv.dataset.cardIndex = cardIndex;
            
            // Set default pointer events to none
            cardDiv.style.pointerEvents = 'none';
            
            // Create the card image element
            const cardImg = document.createElement('img');
            cardImg.style.width = '100%';
            cardImg.style.height = '100%';
            cardImg.style.objectFit = 'contain';
            cardImg.style.borderRadius = '5px';
            
            if (card.hidden) {
                // Player's own cards (hidden) - use back.png or clue images
                let imageSrc = 'assets/Cards/back.png';
                let cardTitle = 'Your card (hidden)';
                
                // Apply clue visualization for the target player
                if (currentClueVisualization && 
                    currentClueVisualization.targetPlayerId === playerId &&
                    currentClueVisualization.matchingCardIndices.includes(cardIndex)) {
                    
                    if (currentClueVisualization.clueType === 'number') {
                        imageSrc = `assets/Cards/h${currentClueVisualization.clueValue}.png`;
                        cardTitle = `Your card - Number ${currentClueVisualization.clueValue}`;
                        cardDiv.classList.add('clued-number');
                        cardDiv.dataset.cluedNumber = currentClueVisualization.clueValue;
                    } else if (currentClueVisualization.clueType === 'color') {
                        // Map color names to image suffixes
                        const colorMap = {
                            'red': 'R',
                            'yellow': 'Y', 
                            'green': 'G',
                            'blue': 'B',
                            'white': 'W'
                        };
                        const colorSuffix = colorMap[currentClueVisualization.clueValue];
                        if (colorSuffix) {
                            imageSrc = `assets/Cards/h${colorSuffix}.png`;
                        }
                        cardTitle = `Your card - ${currentClueVisualization.clueValue} color`;
                        cardDiv.classList.add('clued-color');
                        cardDiv.classList.add(`${currentClueVisualization.clueValue}-clue`);
                    }
                }
                
                cardImg.src = imageSrc;
                cardImg.alt = cardTitle;
                cardDiv.title = cardTitle;
            } else {
                // Other players' cards (visible) - use specific card images
                const colorMap = {
                    'red': 'R',
                    'yellow': 'Y',
                    'green': 'G', 
                    'blue': 'B',
                    'white': 'W'
                };
                
                const colorSuffix = colorMap[card.color];
                const imageSrc = `assets/Cards/${card.number}${colorSuffix}.png`;
                const cardTitle = `${card.color.charAt(0).toUpperCase() + card.color.slice(1)} ${card.number}`;
                
                cardImg.src = imageSrc;
                cardImg.alt = cardTitle;
                cardDiv.title = cardTitle;
                cardDiv.dataset.color = card.color;
                cardDiv.dataset.number = card.number;
                
                // Apply clue highlight for other players to see what was clued
                if (currentClueVisualization && 
                    currentClueVisualization.targetPlayerId === playerId &&
                    currentClueVisualization.matchingCardIndices.includes(cardIndex)) {
                    cardDiv.classList.add('clued-highlight');
                }
            }
            
            // Add error handling for missing images
            cardImg.onerror = function() {
                console.warn(`Failed to load card image: ${this.src}`);
                // Fallback to a simple colored div if image fails to load
                cardDiv.innerHTML = '';
                cardDiv.style.backgroundColor = card.hidden ? '#333' : getCardColor(card.color);
                cardDiv.style.color = card.hidden ? 'white' : getCardTextColor(card.color);
                cardDiv.textContent = card.hidden ? '?' : card.number;
                cardDiv.style.display = 'flex';
                cardDiv.style.alignItems = 'center';
                cardDiv.style.justifyContent = 'center';
                cardDiv.style.fontWeight = 'bold';
            };
            
            cardDiv.appendChild(cardImg);
            
            // Add interaction handlers
            setupCardInteraction(cardDiv, playerId, cardIndex, isCurrentPlayer);
            
            cardsDiv.appendChild(cardDiv);
        });
        
        playerDiv.appendChild(cardsDiv);
        handsContainer.appendChild(playerDiv);
    });
    
    // Update action buttons visibility
    updateActionButtons();
}

// Helper function to get card background color (fallback)
function getCardColor(color) {
    const colorMap = {
        'red': '#dc3545',
        'yellow': '#ffc107',
        'green': '#28a745',
        'blue': '#007bff',
        'white': '#f8f9fa'
    };
    return colorMap[color] || '#333';
}

// Helper function to get card text color (fallback)
function getCardTextColor(color) {
    return color === 'white' || color === 'yellow' ? '#333' : 'white';
}

function setupCardInteraction(cardDiv, playerId, cardIndex, isCurrentPlayer) {
    // Click handler
    cardDiv.addEventListener('click', () => {
        handleCardClick(playerId, cardIndex, isCurrentPlayer);
    });
    
    // Hover handlers for clue preview
    cardDiv.addEventListener('mouseenter', () => {
        if ((interactionState === 'clue' || interactionState === 'clue-number' || interactionState === 'clue-color') && !isCurrentPlayer && clueType) {
            hoveredCard = { playerId, cardIndex };
            previewClue(cardDiv);
        }
    });
    
    cardDiv.addEventListener('mouseleave', () => {
        if ((interactionState === 'clue' || interactionState === 'clue-number' || interactionState === 'clue-color') && hoveredCard) {
            clearCluePreview();
            hoveredCard = null;
        }
    });
}

function handleCardClick(playerId, cardIndex, isCurrentPlayer) {
    const isMyTurn = gameState.currentPlayerId === currentPlayerId;
    
    if (!isMyTurn) {
        showGameMessage('Not your turn!', 'error');
        return;
    }
    
    if (interactionState === 'play' && isCurrentPlayer) {
        performPlayCard(cardIndex);
    } else if (interactionState === 'discard' && isCurrentPlayer) {
        performDiscardCard(cardIndex);
    } else if ((interactionState === 'clue' || interactionState === 'clue-number' || interactionState === 'clue-color') && !isCurrentPlayer && clueType) {
        performGiveClue(playerId, cardIndex);
    }
}

// Action state management
function enterPlayState() {
    if (!isMyTurn()) return;
    
    // If already in play state, cancel it
    if (interactionState === 'play') {
        cancelAction();
        return;
    }
    
    setInteractionState('play');
    updateGameStateIndicator('Click on one of your cards to play it');
    updateCardInteractivity();
}

function enterDiscardState() {
    if (!isMyTurn()) return;
    
    // If already in discard state, cancel it
    if (interactionState === 'discard') {
        cancelAction();
        return;
    }
    
    setInteractionState('discard');
    updateGameStateIndicator('Click on one of your cards to discard it');
    updateCardInteractivity();
}

function enterClueState() {
    if (!isMyTurn()) return;
    
    if (gameState.clueTokens <= 0) {
        showGameMessage('No clue tokens available!', 'error');
        return;
    }
    
    setInteractionState('clue');
    updateGameStateIndicator('Select clue type, then click on a card to give a clue');
    showClueTypeButtons();
    updateCardInteractivity();
}

function enterNumberClueState() {
    if (!isMyTurn()) return;
    
    if (gameState.clueTokens <= 0) {
        showGameMessage('No clue tokens available!', 'error');
        return;
    }
    
    // If already in number clue state, cancel it
    if (interactionState === 'clue-number') {
        cancelAction();
        return;
    }
    
    setInteractionState('clue-number');
    clueType = 'number';
    updateGameStateIndicator('Click on a number to give a number clue');
    updateCardInteractivity();
    
    // Re-trigger preview if there's a currently hovered card
    if (hoveredCard) {
        const hoveredCardDiv = document.querySelector(`[data-player-id="${hoveredCard.playerId}"][data-card-index="${hoveredCard.cardIndex}"]`);
        if (hoveredCardDiv) {
            previewClue(hoveredCardDiv);
        }
    }
}

function enterColorClueState() {
    if (!isMyTurn()) return;
    
    if (gameState.clueTokens <= 0) {
        showGameMessage('No clue tokens available!', 'error');
        return;
    }
    
    // If already in color clue state, cancel it
    if (interactionState === 'clue-color') {
        cancelAction();
        return;
    }
    
    setInteractionState('clue-color');
    clueType = 'color';
    updateGameStateIndicator('Click on a color to give a color clue');
    updateCardInteractivity();
    
    // Re-trigger preview if there's a currently hovered card
    if (hoveredCard) {
        const hoveredCardDiv = document.querySelector(`[data-player-id="${hoveredCard.playerId}"][data-card-index="${hoveredCard.cardIndex}"]`);
        if (hoveredCardDiv) {
            previewClue(hoveredCardDiv);
        }
    }
}

function setClueType(type) {
    clueType = type;
    
    // Update button states
    document.getElementById('colorClueBtn').classList.toggle('active', type === 'color');
    document.getElementById('numberClueBtn').classList.toggle('active', type === 'number');
    
    updateGameStateIndicator(`Click on a ${type} to give a clue about that ${type}`);
    updateCardInteractivity();
    
    // Re-trigger preview if there's a currently hovered card
    if (hoveredCard) {
        const hoveredCardDiv = document.querySelector(`[data-player-id="${hoveredCard.playerId}"][data-card-index="${hoveredCard.cardIndex}"]`);
        if (hoveredCardDiv) {
            previewClue(hoveredCardDiv);
        }
    }
}

function cancelAction() {
    setInteractionState('idle');
    clueType = null;
    
    // Only update game state indicator if there's no temporary message showing
    const indicator = document.getElementById('gameStateIndicator');
    const hasTemporaryMessage = indicator.classList.contains('success') || 
                               indicator.classList.contains('error') || 
                               indicator.classList.contains('warning');
    
    if (!hasTemporaryMessage) {
        updateGameStateIndicator('Select an action');
    }
    
    updateCardInteractivity();
    clearCluePreview();
}

function setInteractionState(state) {
    interactionState = state;
    
    // Update action button states
    const actionButtons = document.getElementById('actionButtons');
    const buttons = actionButtons.querySelectorAll('.action-button');
    
    buttons.forEach(btn => btn.classList.remove('active'));
    actionButtons.classList.toggle('in-state', state !== 'idle');
    
    if (state !== 'idle') {
        const activeButton = actionButtons.querySelector(`.action-button.${state}`);
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }
}

function updateCardInteractivity() {
    const allCards = document.querySelectorAll('.card');
    
    allCards.forEach(card => {
        // Remove all interaction classes
        card.classList.remove('interactive', 'non-interactive', 'highlighted');
        
        // Set default pointer events to none for all cards
        card.style.pointerEvents = 'none';
        
        const playerId = card.dataset.playerId;
        const isCurrentPlayer = playerId === currentPlayerId;
        
        if (interactionState === 'idle') {
            // No special interaction, keep pointer events disabled
            return;
        } else if (interactionState === 'play' || interactionState === 'discard') {
            // Only current player's cards are interactive
            if (isCurrentPlayer) {
                card.classList.add('interactive');
                card.style.pointerEvents = ''; // Enable pointer events
            } else {
                card.classList.add('non-interactive');
                // Keep pointer events disabled
            }
        } else if (interactionState === 'clue' || interactionState === 'clue-number' || interactionState === 'clue-color') {
            // Only other players' cards are interactive
            if (!isCurrentPlayer) {
                card.classList.add('interactive');
                card.style.pointerEvents = ''; // Enable pointer events
            } else {
                card.classList.add('non-interactive');
                // Keep pointer events disabled
            }
        }
    });
}

function previewClue(hoveredCardDiv) {
    if (!clueType || !hoveredCard) return;
    
    const targetPlayerId = hoveredCard.playerId;
    const targetColor = hoveredCardDiv.dataset.color;
    const targetNumber = hoveredCardDiv.dataset.number;
    
    // Clear previous highlights
    clearCluePreview();
    
    // Collect all matching cards for the target player
    const targetPlayerCards = document.querySelectorAll(`[data-player-id="${targetPlayerId}"]`);
    const cardsToHighlight = [];
    
    targetPlayerCards.forEach(card => {
        if (clueType === 'color' && card.dataset.color === targetColor) {
            cardsToHighlight.push(card);
        } else if (clueType === 'number' && card.dataset.number === targetNumber) {
            cardsToHighlight.push(card);
        }
    });
    
    // Add highlighted class to all matching cards at the same time to sync animations
    // Use requestAnimationFrame to ensure the DOM has updated before adding the class
    requestAnimationFrame(() => {
        cardsToHighlight.forEach(card => {
            card.classList.add('highlighted');
        });
    });
}

function clearCluePreview() {
    const highlightedCards = document.querySelectorAll('.card.highlighted');
    highlightedCards.forEach(card => {
        card.classList.remove('highlighted');
    });
}

// Game actions
function performPlayCard(cardIndex) {
    socket.emit('gameAction', { 
        action: {
            type: 'play',
            cardIndex: cardIndex
        }
    });
    cancelAction();
}

function performDiscardCard(cardIndex) {
    socket.emit('gameAction', { 
        action: {
            type: 'discard',
            cardIndex: cardIndex
        }
    });
    cancelAction();
}

function performGiveClue(targetPlayerId, cardIndex) {
    const targetCard = document.querySelector(`[data-player-id="${targetPlayerId}"][data-card-index="${cardIndex}"]`);
    
    if (!targetCard) {
        console.error('Target card not found');
        return;
    }
    
    let clueValue = clueType === 'color' ? targetCard.dataset.color : targetCard.dataset.number;
    
    // Convert number clues to integers
    if (clueType === 'number') {
        clueValue = parseInt(clueValue, 10);
    }
    
    console.log('Sending clue:', {
        targetPlayerId: targetPlayerId,
        clueType: clueType,
        clueValue: clueValue
    });
    
    socket.emit('gameAction', {
        action: {
            type: 'clue',
            targetPlayerId: targetPlayerId,
            clueType: clueType,
            clueValue: clueValue
        }
    });
    
    cancelAction();
}

// UI helpers
function updateActionButtons() {
    const actionButtons = document.getElementById('actionButtons');
    const isMyTurn = gameState && gameState.currentPlayerId === currentPlayerId;
    
    if (isMyTurn) {
        actionButtons.style.display = 'flex';
    } else {
        actionButtons.style.display = 'none';
        cancelAction(); // Reset state when it's not our turn
    }
}

function showClueTypeButtons() {
    document.getElementById('clueTypeButtons').classList.add('show');
}

function hideClueTypeButtons() {
    const clueTypeButtons = document.getElementById('clueTypeButtons');
    clueTypeButtons.classList.remove('show');
    
    // Reset button states
    document.getElementById('colorClueBtn').classList.remove('active');
    document.getElementById('numberClueBtn').classList.remove('active');
}

function updateGameStateIndicator(message) {
    const indicator = document.getElementById('gameStateIndicator');
    const stateText = document.getElementById('stateText');
    
    // Clear any existing type classes to prevent color inheritance
    indicator.classList.remove('success', 'warning', 'error');
    
    stateText.textContent = message;
    
    if (message === 'Select an action') {
        indicator.classList.remove('show');
    } else {
        indicator.classList.add('show');
    }
}

function showGameMessage(message, type = 'info') {
    // Create a temporary message overlay
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: ${type === 'error' ? '#dc3545' : '#007bff'};
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        font-weight: bold;
        z-index: 10000;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    `;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 2000);
}

function isMyTurn() {
    return gameState && gameState.currentPlayerId === currentPlayerId;
}

// Enhanced visual feedback functions
function showActionFeedback(message, type = 'info', duration = 3000) {
    const feedback = document.getElementById('actionFeedback');
    const feedbackText = document.getElementById('feedbackText');
    
    // Clear any existing classes
    feedback.className = 'action-feedback';
    
    // Set message and type
    feedbackText.textContent = message;
    feedback.classList.add(type, 'show');
    
    // Auto-hide after duration
    setTimeout(() => {
        feedback.classList.remove('show');
    }, duration);
}

function showGameStateIndicator(message, type = 'info', duration = 0) {
    const indicator = document.getElementById('gameStateIndicator');
    const stateText = document.getElementById('stateText');
    
    // Clear any existing type classes
    indicator.classList.remove('success', 'warning', 'error');
    
    // Set message and type
    stateText.textContent = message;
    indicator.classList.add('show');
    
    if (type !== 'info') {
        indicator.classList.add(type);
    }
    
    // Auto-hide after duration if specified
    if (duration > 0) {
        setTimeout(() => {
            indicator.classList.remove('show');
        }, duration);
    }
}

function animateTokenChange(tokenType, change) {
    const tokenElement = document.querySelector(`.${tokenType}-tokens .token-count`);
    
    if (tokenElement) {
        tokenElement.classList.add('token-change');
        
        if (change > 0) {
            tokenElement.classList.add('token-gained');
        } else if (change < 0) {
            tokenElement.classList.add('token-lost');
        }
        
        // Remove animation classes after animation completes
        setTimeout(() => {
            tokenElement.classList.remove('token-change', 'token-gained', 'token-lost');
        }, 800);
    }
}

function animateFireworkSuccess(color) {
    const fireworkPile = document.querySelector(`.firework-pile.${color}`);
    if (fireworkPile) {
        fireworkPile.classList.add('card-added');
        
        // Remove animation class after animation completes
        setTimeout(() => {
            fireworkPile.classList.remove('card-added');
        }, 1000);
    }
}

function animateInvalidPlay(cardElement) {
    if (cardElement) {
        cardElement.classList.add('invalid-play');
        
        // Remove animation class after animation completes
        setTimeout(() => {
            cardElement.classList.remove('invalid-play');
        }, 600);
    }
}

function animateNewCard(cardElement) {
    if (cardElement) {
        cardElement.classList.add('drawing-new');
        
        // Remove animation class after animation completes
        setTimeout(() => {
            cardElement.classList.remove('drawing-new');
        }, 500);
    }
}

// Export functions that need to be called from HTML
window.enterPlayState = enterPlayState;
window.enterDiscardState = enterDiscardState;
window.enterNumberClueState = enterNumberClueState;
window.enterColorClueState = enterColorClueState;
window.cancelAction = cancelAction; 