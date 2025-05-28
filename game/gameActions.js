const gameState = require('./gameState');

/**
 * Play a card from player's hand
 */
function playCard(gameStateObj, playerId, cardIndex) {
  // Validate it's the player's turn
  if (!gameState.isPlayerTurn(gameStateObj, playerId)) {
    return {
      success: false,
      error: 'Not your turn'
    };
  }
  
  // Validate card index
  const playerHand = gameStateObj.hands[playerId];
  if (!playerHand || cardIndex < 0 || cardIndex >= playerHand.length) {
    return {
      success: false,
      error: 'Invalid card index'
    };
  }
  
  // Get the card
  const card = playerHand[cardIndex];
  
  // Try to play the card
  const canPlay = gameState.canPlayCard(gameStateObj, card);
  
  if (canPlay) {
    // Valid play - add to fireworks pile
    gameState.playCardToPile(gameStateObj, card);
    
    // Remove card from hand
    playerHand.splice(cardIndex, 1);
    
    // Draw replacement card if deck not empty
    const drawResult = gameState.drawCard(gameStateObj);
    const newCard = drawResult ? drawResult.card : null;
    const finalRoundBegan = drawResult ? drawResult.finalRoundBegan : false;
    
    if (newCard) {
      // Insert new card at the same position as the played card
      playerHand.splice(cardIndex, 0, newCard);
    }
    
    // Record action
    gameStateObj.lastAction = {
      type: 'play',
      playerId: playerId,
      card: card,
      success: true,
      timestamp: Date.now()
    };
    
    // Advance turn
    gameState.advanceTurn(gameStateObj);
    
    return {
      success: true,
      action: 'play',
      card: card,
      newCard: newCard,
      finalRoundBegan: finalRoundBegan,
      gameState: gameStateObj
    };
    
  } else {
    // Invalid play - lose fuse token
    gameState.loseFuseToken(gameStateObj);
    
    // Add card to discard pile
    gameStateObj.discardPile.push(card);
    
    // Remove card from hand
    playerHand.splice(cardIndex, 1);
    
    // Draw replacement card if deck not empty
    const drawResult = gameState.drawCard(gameStateObj);
    const newCard = drawResult ? drawResult.card : null;
    const finalRoundBegan = drawResult ? drawResult.finalRoundBegan : false;
    
    if (newCard) {
      // Insert new card at the same position as the played card
      playerHand.splice(cardIndex, 0, newCard);
    }
    
    // Record action
    gameStateObj.lastAction = {
      type: 'play',
      playerId: playerId,
      card: card,
      success: false,
      timestamp: Date.now()
    };
    
    // Advance turn (if game didn't end)
    if (gameStateObj.status === 'playing') {
      gameState.advanceTurn(gameStateObj);
    }
    
    return {
      success: true,
      action: 'play',
      card: card,
      newCard: newCard,
      invalidPlay: true,
      fuseTokenLost: true,
      finalRoundBegan: finalRoundBegan,
      gameState: gameStateObj
    };
  }
}

/**
 * Discard a card from player's hand
 */
function discardCard(gameStateObj, playerId, cardIndex) {
  // Validate it's the player's turn
  if (!gameState.isPlayerTurn(gameStateObj, playerId)) {
    return {
      success: false,
      error: 'Not your turn'
    };
  }
  
  // Validate card index
  const playerHand = gameStateObj.hands[playerId];
  if (!playerHand || cardIndex < 0 || cardIndex >= playerHand.length) {
    return {
      success: false,
      error: 'Invalid card index'
    };
  }
  
  // Get the card
  const card = playerHand[cardIndex];
  
  // Add card to discard pile
  gameStateObj.discardPile.push(card);
  
  // Remove card from hand
  playerHand.splice(cardIndex, 1);
  
  // Gain clue token
  const tokenGained = gameState.addClueToken(gameStateObj);
  
  // Draw replacement card if deck not empty
  const drawResult = gameState.drawCard(gameStateObj);
  const newCard = drawResult ? drawResult.card : null;
  const finalRoundBegan = drawResult ? drawResult.finalRoundBegan : false;
  
  if (newCard) {
    // Insert new card at the same position as the discarded card
    playerHand.splice(cardIndex, 0, newCard);
  }
  
  // Record action
  gameStateObj.lastAction = {
    type: 'discard',
    playerId: playerId,
    card: card,
    timestamp: Date.now()
  };
  
  // Advance turn
  gameState.advanceTurn(gameStateObj);
  
  return {
    success: true,
    action: 'discard',
    card: card,
    newCard: newCard,
    finalRoundBegan: finalRoundBegan,
    clueTokenGained: tokenGained,
    gameState: gameStateObj
  };
}

/**
 * Give a clue to another player
 */
function giveClue(gameStateObj, giverId, targetPlayerId, clueType, clueValue) {
  // Validate it's the player's turn
  if (!gameState.isPlayerTurn(gameStateObj, giverId)) {
    return {
      success: false,
      error: 'Not your turn'
    };
  }
  
  // Validate target player
  if (giverId === targetPlayerId) {
    return {
      success: false,
      error: 'Cannot give clue to yourself'
    };
  }
  
  if (!gameStateObj.hands[targetPlayerId]) {
    return {
      success: false,
      error: 'Invalid target player'
    };
  }
  
  // Validate clue tokens available
  if (gameStateObj.clueTokens <= 0) {
    return {
      success: false,
      error: 'No clue tokens available'
    };
  }
  
  // Validate clue type and value
  if (clueType === 'color') {
    if (!gameState.COLORS.includes(clueValue)) {
      return {
        success: false,
        error: 'Invalid color'
      };
    }
  } else if (clueType === 'number') {
    if (![1, 2, 3, 4, 5].includes(clueValue)) {
      return {
        success: false,
        error: 'Invalid number'
      };
    }
  } else {
    return {
      success: false,
      error: 'Invalid clue type. Must be "color" or "number"'
    };
  }
  
  // Find matching cards in target player's hand
  const targetHand = gameStateObj.hands[targetPlayerId];
  const matchingCardIndices = [];
  
  targetHand.forEach((card, index) => {
    if (clueType === 'color' && card.color === clueValue) {
      matchingCardIndices.push(index);
    } else if (clueType === 'number' && card.number === clueValue) {
      matchingCardIndices.push(index);
    }
  });
  
  // Must have at least one matching card
  if (matchingCardIndices.length === 0) {
    return {
      success: false,
      error: 'No matching cards found for this clue'
    };
  }
  
  // Use clue token
  gameState.useClueToken(gameStateObj);
  
  // Record action
  gameStateObj.lastAction = {
    type: 'clue',
    giverId: giverId,
    targetPlayerId: targetPlayerId,
    clueType: clueType,
    clueValue: clueValue,
    matchingCardIndices: matchingCardIndices,
    timestamp: Date.now()
  };
  
  // Advance turn
  gameState.advanceTurn(gameStateObj);
  
  return {
    success: true,
    action: 'clue',
    giverId: giverId,
    targetPlayerId: targetPlayerId,
    clueType: clueType,
    clueValue: clueValue,
    matchingCardIndices: matchingCardIndices,
    gameState: gameStateObj
  };
}

/**
 * Validate if an action is allowed
 */
function validateAction(gameStateObj, playerId, actionType) {
  // Check if game is active
  if (gameStateObj.status !== 'playing') {
    return {
      valid: false,
      error: 'Game is not active'
    };
  }
  
  // Check if it's player's turn
  if (!gameState.isPlayerTurn(gameStateObj, playerId)) {
    return {
      valid: false,
      error: 'Not your turn'
    };
  }
  
  // Check action-specific requirements
  if (actionType === 'clue' && gameStateObj.clueTokens <= 0) {
    return {
      valid: false,
      error: 'No clue tokens available'
    };
  }
  
  return {
    valid: true
  };
}

/**
 * Get available actions for a player
 */
function getAvailableActions(gameStateObj, playerId) {
  const actions = [];
  
  if (!gameState.isPlayerTurn(gameStateObj, playerId) || gameStateObj.status !== 'playing') {
    return actions;
  }
  
  // Can always play or discard cards if you have them
  const playerHand = gameStateObj.hands[playerId];
  if (playerHand && playerHand.length > 0) {
    actions.push('play', 'discard');
  }
  
  // Can give clue if tokens available and other players exist
  if (gameStateObj.clueTokens > 0 && gameStateObj.playerIds.length > 1) {
    actions.push('clue');
  }
  
  return actions;
}

module.exports = {
  playCard,
  discardCard,
  giveClue,
  validateAction,
  getAvailableActions
}; 