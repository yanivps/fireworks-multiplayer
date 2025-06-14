const { GameImplementation } = require('../src/server');

/**
 * Simple example card game - players take turns drawing cards and trying to get the highest total
 */
class SimpleCardGame extends GameImplementation {
  getGameConfig() {
    return {
      minPlayers: 2,
      maxPlayers: 4,
      name: 'Simple Card Game',
      version: '1.0.0'
    };
  }

  createInitialState(playerIds, gameConfig = {}) {
    // Create a simple deck of cards (1-10, 4 suits)
    const deck = [];
    for (let suit = 0; suit < 4; suit++) {
      for (let value = 1; value <= 10; value++) {
        deck.push({ suit, value });
      }
    }
    
    // Shuffle deck
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    // Deal initial hands (3 cards each)
    const hands = {};
    playerIds.forEach(playerId => {
      hands[playerId] = [];
      for (let i = 0; i < 3; i++) {
        if (deck.length > 0) {
          hands[playerId].push(deck.pop());
        }
      }
    });

    return {
      status: 'playing',
      playerIds: [...playerIds],
      currentPlayerIndex: 0,
      currentPlayerId: playerIds[0],
      deck: deck,
      hands: hands,
      scores: playerIds.reduce((acc, id) => ({ ...acc, [id]: 0 }), {}),
      turnCount: 0,
      maxTurns: gameConfig.maxTurns || 10,
      createdAt: Date.now()
    };
  }

  validateAction(action, gameState, playerId) {
    // Check if it's the player's turn
    if (gameState.currentPlayerId !== playerId) {
      return { valid: false, error: 'Not your turn' };
    }

    // Check if game is still playing
    if (gameState.status !== 'playing') {
      return { valid: false, error: 'Game is not active' };
    }

    switch (action.type) {
      case 'drawCard':
        if (gameState.deck.length === 0) {
          return { valid: false, error: 'No cards left in deck' };
        }
        return { valid: true };

      case 'endTurn':
        return { valid: true };

      default:
        return { valid: false, error: 'Unknown action type' };
    }
  }

  processAction(action, gameState, playerId) {
    const result = { action: action.type, playerId };

    switch (action.type) {
      case 'drawCard':
        if (gameState.deck.length > 0) {
          const drawnCard = gameState.deck.pop();
          gameState.hands[playerId].push(drawnCard);
          result.drawnCard = drawnCard;
          result.message = `Player drew a card (${drawnCard.value})`;
        }
        break;

      case 'endTurn':
        // Calculate score for this turn (sum of hand values)
        const handValue = gameState.hands[playerId].reduce((sum, card) => sum + card.value, 0);
        gameState.scores[playerId] = handValue;
        
        // Advance turn
        gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.playerIds.length;
        gameState.currentPlayerId = gameState.playerIds[gameState.currentPlayerIndex];
        gameState.turnCount++;
        
        result.handValue = handValue;
        result.message = `Player ended turn with score: ${handValue}`;
        break;
    }

    return result;
  }

  checkEndConditions(gameState) {
    // Game ends when max turns reached or deck is empty
    if (gameState.turnCount >= gameState.maxTurns || gameState.deck.length === 0) {
      return { ended: true };
    }
    return { ended: false };
  }

  calculateFinalResult(gameState) {
    // Find winner (highest score)
    let winner = null;
    let highestScore = -1;
    
    Object.entries(gameState.scores).forEach(([playerId, score]) => {
      if (score > highestScore) {
        highestScore = score;
        winner = playerId;
      }
    });

    return {
      winner,
      scores: gameState.scores,
      highestScore,
      gameEnded: true,
      timestamp: Date.now()
    };
  }

  getPlayerView(gameState, playerId) {
    // In this simple game, players can see everything except other players' hands
    const playerView = { ...gameState };
    
    // Hide other players' hands (show only count)
    const hiddenHands = {};
    Object.entries(gameState.hands).forEach(([pid, hand]) => {
      if (pid === playerId) {
        hiddenHands[pid] = hand; // Show own hand
      } else {
        hiddenHands[pid] = { cardCount: hand.length }; // Hide others' hands
      }
    });
    
    playerView.hands = hiddenHands;
    return playerView;
  }
}

module.exports = SimpleCardGame; 