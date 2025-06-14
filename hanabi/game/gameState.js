const { v4: uuidv4 } = require('uuid');

// Card colors and their distribution
const COLORS = ['red', 'yellow', 'green', 'blue', 'white'];
const CARD_DISTRIBUTION = {
  1: 3, // Three 1s per color
  2: 2, // Two 2s per color
  3: 2, // Two 3s per color
  4: 2, // Two 4s per color
  5: 1  // One 5 per color
};

// Game constants
const MAX_CLUE_TOKENS = 8;
const MAX_FUSE_TOKENS = 3;
const HAND_SIZES = {
  2: 5, // 2-3 players get 5 cards
  3: 5,
  4: 4, // 4-5 players get 4 cards
  5: 4
};

/**
 * Create a new card
 */
function createCard(color, number) {
  return {
    id: uuidv4(),
    color: color,
    number: number
  };
}

/**
 * Generate a complete Hanabi deck
 */
function generateDeck() {
  const deck = [];
  
  COLORS.forEach(color => {
    Object.entries(CARD_DISTRIBUTION).forEach(([number, count]) => {
      for (let i = 0; i < count; i++) {
        deck.push(createCard(color, parseInt(number)));
      }
    });
  });
  
  return deck;
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 */
function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Deal initial hands to players
 */
function dealInitialHands(deck, playerIds) {
  const playerCount = playerIds.length;
  const handSize = HAND_SIZES[playerCount];
  const hands = {};
  let deckIndex = 0;
  
  // Deal cards to each player
  playerIds.forEach(playerId => {
    hands[playerId] = [];
    for (let i = 0; i < handSize; i++) {
      if (deckIndex < deck.length) {
        hands[playerId].push(deck[deckIndex]);
        deckIndex++;
      }
    }
  });
  
  // Return hands and remaining deck
  return {
    hands: hands,
    remainingDeck: deck.slice(deckIndex)
  };
}

/**
 * Initialize fireworks piles
 */
function initializeFireworksPiles() {
  const piles = {};
  COLORS.forEach(color => {
    piles[color] = {
      cards: [],
      nextNumber: 1,
      completed: false
    };
  });
  return piles;
}

/**
 * Create initial game state
 */
function createGameState(playerIds) {
  if (playerIds.length < 2 || playerIds.length > 5) {
    throw new Error('Invalid number of players. Must be 2-5 players.');
  }
  
  // Generate and shuffle deck
  const deck = shuffleDeck(generateDeck());
  
  // Deal initial hands
  const { hands, remainingDeck } = dealInitialHands(deck, playerIds);
  
  // Initialize turn order (same as player join order)
  const turnOrder = [...playerIds];
  
  const gameState = {
    // Game metadata
    status: 'playing', // 'waiting', 'playing', 'ended'
    playerIds: playerIds,
    turnOrder: turnOrder,
    currentPlayerIndex: 0,
    currentPlayerId: turnOrder[0],
    
    // Game components
    deck: remainingDeck,
    hands: hands,
    fireworksPiles: initializeFireworksPiles(),
    discardPile: [],
    
    // Tokens
    clueTokens: MAX_CLUE_TOKENS,
    fuseTokens: MAX_FUSE_TOKENS,
    
    // Game flow
    finalRound: false,
    finalRoundTurnsLeft: 0,
    lastCardDrawn: false,
    
    // Game end
    endReason: null,
    score: 0,
    
    // Turn tracking
    turnCount: 0,
    lastAction: null,
    
    // Timestamps
    createdAt: Date.now(),
    lastActionAt: Date.now()
  };
  
  return gameState;
}

/**
 * Advance to next player's turn
 */
function advanceTurn(gameState) {
  gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.turnOrder.length;
  gameState.currentPlayerId = gameState.turnOrder[gameState.currentPlayerIndex];
  gameState.turnCount++;
  gameState.lastActionAt = Date.now();
  
  // Handle final round countdown
  if (gameState.finalRound) {
    gameState.finalRoundTurnsLeft--;
    if (gameState.finalRoundTurnsLeft <= 0) {
      endGame(gameState, 'Deck exhausted');
    }
  }
}

/**
 * Draw a card from the deck
 */
function drawCard(gameState) {
  if (gameState.deck.length === 0) {
    return null;
  }
  
  const card = gameState.deck.shift();
  
  // Check if this was the last card
  const finalRoundJustBegan = gameState.deck.length === 0 && !gameState.lastCardDrawn;
  
  if (finalRoundJustBegan) {
    gameState.lastCardDrawn = true;
    gameState.finalRound = true;
    gameState.finalRoundTurnsLeft = gameState.playerIds.length + 1;
  }
  
  return {
    card: card,
    finalRoundBegan: finalRoundJustBegan
  };
}

/**
 * Add clue token (when discarding)
 */
function addClueToken(gameState) {
  if (gameState.clueTokens < MAX_CLUE_TOKENS) {
    gameState.clueTokens++;
    return true;
  }
  return false;
}

/**
 * Use clue token (when giving clue)
 */
function useClueToken(gameState) {
  if (gameState.clueTokens > 0) {
    gameState.clueTokens--;
    return true;
  }
  return false;
}

/**
 * Lose fuse token (when playing invalid card)
 */
function loseFuseToken(gameState) {
  if (gameState.fuseTokens > 0) {
    gameState.fuseTokens--;
    
    // Check if game should end
    if (gameState.fuseTokens === 0) {
      endGame(gameState, 'All fuse tokens lost');
    }
    
    return true;
  }
  return false;
}

/**
 * Check if a card can be played on a fireworks pile
 */
function canPlayCard(gameState, card) {
  const pile = gameState.fireworksPiles[card.color];
  return pile && !pile.completed && card.number === pile.nextNumber;
}

/**
 * Play a card to a fireworks pile
 */
function playCardToPile(gameState, card) {
  const pile = gameState.fireworksPiles[card.color];
  
  if (!canPlayCard(gameState, card)) {
    return false;
  }
  
  pile.cards.push(card);
  pile.nextNumber++;
  
  // Check if pile is completed (reached 5)
  if (card.number === 5) {
    pile.completed = true;
    // Gain a clue token for completing a pile
    addClueToken(gameState);
  }
  
  // Check if all piles are completed (perfect score)
  const allCompleted = Object.values(gameState.fireworksPiles).every(p => p.completed);
  if (allCompleted) {
    endGame(gameState, 'Perfect score achieved');
  }
  
  return true;
}

/**
 * Calculate current score
 */
function calculateScore(gameState) {
  let score = 0;
  Object.values(gameState.fireworksPiles).forEach(pile => {
    score += pile.cards.length;
  });
  return score;
}

/**
 * End the game
 */
function endGame(gameState, reason) {
  gameState.status = 'ended';
  gameState.endReason = reason;
  gameState.score = calculateScore(gameState);
  gameState.lastActionAt = Date.now();
}

/**
 * Get visible game state for a specific player
 * (hides their own hand but shows others)
 */
function getPlayerGameState(gameState, playerId) {
  const playerState = {
    ...gameState,
    hands: {}
  };
  
  // Show all hands except the requesting player's own hand
  Object.entries(gameState.hands).forEach(([pid, hand]) => {
    if (pid === playerId) {
      // Don't show player their own cards (they see card backs)
      playerState.hands[pid] = hand.map(() => ({ hidden: true }));
    } else {
      // Show other players' cards
      playerState.hands[pid] = hand;
    }
  });
  
  return playerState;
}

/**
 * Validate if it's a player's turn
 */
function isPlayerTurn(gameState, playerId) {
  return gameState.currentPlayerId === playerId && gameState.status === 'playing';
}

/**
 * Get hand size for player count
 */
function getHandSize(playerCount) {
  return HAND_SIZES[playerCount] || 4;
}

module.exports = {
  createGameState,
  advanceTurn,
  drawCard,
  addClueToken,
  useClueToken,
  loseFuseToken,
  canPlayCard,
  playCardToPile,
  calculateScore,
  endGame,
  getPlayerGameState,
  isPlayerTurn,
  getHandSize,
  COLORS,
  MAX_CLUE_TOKENS,
  MAX_FUSE_TOKENS
}; 