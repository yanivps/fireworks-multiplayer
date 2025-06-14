const path = require('path');

// Import the framework from the relative path
const frameworkPath = path.join(__dirname, '../../multiplayer-card-game-framework/src/shared/GameImplementation');
const GameImplementation = require(frameworkPath);

// Import existing Hanabi game logic
const gameState = require('../game/gameState');
const gameActions = require('../game/gameActions');
const gameEndConditions = require('../game/gameEndConditions');

/**
 * Hanabi Card Game Implementation
 * 
 * A cooperative card game where players work together to build fireworks
 * by playing cards in sequence (1-5) for each color, without being able
 * to see their own cards.
 */
class HanabiGame extends GameImplementation {
  getGameConfig() {
    return {
      minPlayers: 2,
      maxPlayers: 5,
      name: 'Hanabi',
      version: '1.0.0'
    };
  }

  createInitialState(playerIds, gameConfig = {}) {
    // Use existing Hanabi game state creation logic
    return gameState.createGameState(playerIds);
  }

  validateAction(action, gameStateObj, playerId) {
    // Check if it's the player's turn
    if (!gameState.isPlayerTurn(gameStateObj, playerId)) {
      return { valid: false, error: 'Not your turn' };
    }

    // Check if game is still active
    if (gameStateObj.status !== 'playing') {
      return { valid: false, error: 'Game is not active' };
    }

    // Validate specific action types
    switch (action.type) {
      case 'play':
        return this.validatePlayAction(action, gameStateObj, playerId);
      case 'discard':
        return this.validateDiscardAction(action, gameStateObj, playerId);
      case 'clue':
        return this.validateClueAction(action, gameStateObj, playerId);
      default:
        return { valid: false, error: 'Invalid action type' };
    }
  }

  validatePlayAction(action, gameStateObj, playerId) {
    const playerHand = gameStateObj.hands[playerId];
    if (!playerHand || action.cardIndex < 0 || action.cardIndex >= playerHand.length) {
      return { valid: false, error: 'Invalid card index' };
    }
    return { valid: true };
  }

  validateDiscardAction(action, gameStateObj, playerId) {
    const playerHand = gameStateObj.hands[playerId];
    if (!playerHand || action.cardIndex < 0 || action.cardIndex >= playerHand.length) {
      return { valid: false, error: 'Invalid card index' };
    }
    return { valid: true };
  }

  validateClueAction(action, gameStateObj, playerId) {
    // Cannot give clue to yourself
    if (playerId === action.targetPlayerId) {
      return { valid: false, error: 'Cannot give clue to yourself' };
    }

    // Check if target player exists
    if (!gameStateObj.hands[action.targetPlayerId]) {
      return { valid: false, error: 'Invalid target player' };
    }

    // Check if clue tokens are available
    if (gameStateObj.clueTokens <= 0) {
      return { valid: false, error: 'No clue tokens available' };
    }

    // Validate clue type and value
    if (action.clueType === 'color') {
      if (!gameState.COLORS || !gameState.COLORS.includes(action.clueValue)) {
        return { valid: false, error: 'Invalid color' };
      }
    } else if (action.clueType === 'number') {
      if (![1, 2, 3, 4, 5].includes(action.clueValue)) {
        return { valid: false, error: 'Invalid number' };
      }
    } else {
      return { valid: false, error: 'Invalid clue type. Must be "color" or "number"' };
    }

    // Check if clue matches at least one card
    const targetHand = gameStateObj.hands[action.targetPlayerId];
    const hasMatch = targetHand.some(card => {
      if (action.clueType === 'color') {
        return card.color === action.clueValue;
      } else {
        return card.number === action.clueValue;
      }
    });

    if (!hasMatch) {
      return { valid: false, error: 'Clue must match at least one card' };
    }

    return { valid: true };
  }

  processAction(action, gameStateObj, playerId) {
    let result;

    switch (action.type) {
      case 'play':
        result = gameActions.playCard(gameStateObj, playerId, action.cardIndex);
        break;
      case 'discard':
        result = gameActions.discardCard(gameStateObj, playerId, action.cardIndex);
        break;
      case 'clue':
        result = gameActions.giveClue(
          gameStateObj, 
          playerId, 
          action.targetPlayerId, 
          action.clueType, 
          action.clueValue
        );
        break;
      default:
        return { success: false, error: 'Invalid action type' };
    }

    // Add additional framework-compatible fields
    if (result.success) {
      result.playerId = playerId;
      result.actionType = action.type;
      result.timestamp = Date.now();
    }

    return result;
  }

  checkEndConditions(gameStateObj) {
    const endConditions = gameEndConditions.checkGameEndConditions(gameStateObj);
    
    if (endConditions.length > 0) {
      const endCondition = endConditions[0];
      return {
        ended: true,
        result: {
          type: endCondition.type,
          reason: endCondition.reason,
          score: endCondition.score,
          summary: gameEndConditions.generateGameSummary(gameStateObj)
        }
      };
    }

    return { ended: false };
  }

  getPlayerView(gameStateObj, playerId) {
    // Use existing player view logic that hides the player's own cards
    return gameState.getPlayerGameState(gameStateObj, playerId);
  }

  handlePlayerDisconnection(gameStateObj, playerId) {
    // Hanabi benefits from pausing when a player disconnects
    // since it's cooperative and requires all players
    return {
      shouldPause: true,
      shouldEnd: false,
      message: `Game paused - ${playerId} disconnected`
    };
  }

  handlePlayerReconnection(gameStateObj, playerId) {
    return {
      shouldResume: true,
      message: `Game resumed - ${playerId} reconnected`
    };
  }

  getAvailableActions(gameStateObj, playerId) {
    // Use existing logic if available, otherwise return basic actions
    if (gameActions.getAvailableActions) {
      return gameActions.getAvailableActions(gameStateObj, playerId);
    }

    // Fallback: basic action list
    const actions = [];
    
    if (gameState.isPlayerTurn(gameStateObj, playerId)) {
      const playerHand = gameStateObj.hands[playerId];
      
      // Can always play or discard cards
      for (let i = 0; i < playerHand.length; i++) {
        actions.push({ type: 'play', cardIndex: i });
        actions.push({ type: 'discard', cardIndex: i });
      }
      
      // Can give clues if tokens available
      if (gameStateObj.clueTokens > 0) {
        const otherPlayers = gameStateObj.playerIds.filter(id => id !== playerId);
        const colors = ['red', 'yellow', 'green', 'blue', 'white'];
        const numbers = [1, 2, 3, 4, 5];
        
        otherPlayers.forEach(targetId => {
          colors.forEach(color => {
            actions.push({ type: 'clue', targetPlayerId: targetId, clueType: 'color', clueValue: color });
          });
          numbers.forEach(number => {
            actions.push({ type: 'clue', targetPlayerId: targetId, clueType: 'number', clueValue: number });
          });
        });
      }
    }
    
    return actions;
  }

  calculateFinalResult(gameStateObj) {
    const summary = gameEndConditions.generateGameSummary(gameStateObj);
    
    return {
      gameEnded: true,
      timestamp: Date.now(),
      score: summary.score,
      maxScore: summary.maxScore,
      rating: summary.rating,
      endReason: summary.endReason,
      gameStats: summary.gameStats,
      fireworksProgress: summary.fireworksProgress
    };
  }

  serializeGameState(gameStateObj) {
    // Hanabi state is already JSON-serializable
    return gameStateObj;
  }

  deserializeGameState(serializedState) {
    // No special deserialization needed for Hanabi
    return serializedState;
  }
}

module.exports = HanabiGame; 