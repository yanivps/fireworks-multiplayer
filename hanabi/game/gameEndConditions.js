const gameState = require('./gameState');

/**
 * Check all possible game end conditions
 */
function checkGameEndConditions(gameStateObj) {
  const endConditions = [];
  
  // Check if all fireworks are completed (perfect score)
  const allCompleted = Object.values(gameStateObj.fireworksPiles).every(pile => pile.completed);
  if (allCompleted) {
    endConditions.push({
      type: 'perfect_score',
      reason: 'Perfect score achieved - all fireworks completed!',
      score: 25
    });
  }
  
  // Check if all fuse tokens are lost
  if (gameStateObj.fuseTokens <= 0) {
    endConditions.push({
      type: 'fuse_tokens_lost',
      reason: 'Game over - all fuse tokens lost',
      score: gameState.calculateScore(gameStateObj)
    });
  }
  
  // Check if final round is complete
  if (gameStateObj.finalRound && gameStateObj.finalRoundTurnsLeft <= 0) {
    endConditions.push({
      type: 'deck_exhausted',
      reason: 'Deck exhausted - final round complete',
      score: gameState.calculateScore(gameStateObj)
    });
  }
  
  return endConditions;
}

/**
 * Get score rating based on final score
 */
function getScoreRating(score) {
  if (score >= 25) return { rating: 'Legendary', description: 'Perfect fireworks display!' };
  if (score >= 22) return { rating: 'Excellent', description: 'Outstanding performance!' };
  if (score >= 19) return { rating: 'Very Good', description: 'Great teamwork!' };
  if (score >= 16) return { rating: 'Good', description: 'Well done!' };
  if (score >= 13) return { rating: 'Average', description: 'Not bad!' };
  if (score >= 10) return { rating: 'Poor', description: 'Room for improvement.' };
  if (score >= 7) return { rating: 'Bad', description: 'Better luck next time.' };
  if (score >= 4) return { rating: 'Very Bad', description: 'Ouch! Try again.' };
  return { rating: 'Terrible', description: 'Disaster! But everyone starts somewhere.' };
}

/**
 * Generate game summary
 */
function generateGameSummary(gameStateObj) {
  const score = gameState.calculateScore(gameStateObj);
  const rating = getScoreRating(score);
  
  // Get cards played by color
  const cardsByColor = {};
  gameState.COLORS.forEach(color => {
    cardsByColor[color] = gameStateObj.fireworksPiles[color].cards.map(card => card.number);
  });
  
  // Calculate game statistics
  const totalTurns = gameStateObj.turnCount;
  const clueTokensUsed = gameState.MAX_CLUE_TOKENS - gameStateObj.clueTokens;
  const fuseTokensLost = gameState.MAX_FUSE_TOKENS - gameStateObj.fuseTokens;
  const cardsDiscarded = gameStateObj.discardPile.length;
  
  return {
    score: score,
    maxScore: 25,
    rating: rating,
    endReason: gameStateObj.endReason,
    gameStats: {
      totalTurns: totalTurns,
      clueTokensUsed: clueTokensUsed,
      fuseTokensLost: fuseTokensLost,
      cardsDiscarded: cardsDiscarded,
      gameLength: gameStateObj.lastActionAt - gameStateObj.createdAt
    },
    fireworksProgress: cardsByColor,
    discardedCards: gameStateObj.discardPile,
    finalGameState: {
      clueTokens: gameStateObj.clueTokens,
      fuseTokens: gameStateObj.fuseTokens,
      deckRemaining: gameStateObj.deck.length
    }
  };
}

/**
 * Check if game should end due to player disconnection timeout
 */
function checkDisconnectionTimeout(room) {
  const now = Date.now();
  const RECONNECTION_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  
  // Check for disconnected players who haven't reconnected in time
  for (const [playerId, disconnectTime] of room.disconnectedPlayers.entries()) {
    if (now - disconnectTime > RECONNECTION_TIMEOUT) {
      return {
        shouldEnd: true,
        reason: 'Player disconnection timeout',
        disconnectedPlayer: room.players.get(playerId)
      };
    }
  }
  
  return { shouldEnd: false };
}

/**
 * Handle game end and cleanup
 */
function handleGameEnd(gameStateObj, reason) {
  // End the game
  gameState.endGame(gameStateObj, reason);
  
  // Generate summary
  const summary = generateGameSummary(gameStateObj);
  
  return {
    gameEnded: true,
    endReason: reason,
    summary: summary,
    finalScore: summary.score,
    rating: summary.rating
  };
}

/**
 * Check if a specific end condition is met and handle it
 */
function processGameEnd(gameStateObj, room, io) {
  // Check standard game end conditions
  const endConditions = checkGameEndConditions(gameStateObj);
  
  if (endConditions.length > 0) {
    const endCondition = endConditions[0]; // Take the first (most important) condition
    const result = handleGameEnd(gameStateObj, endCondition.reason);
    
    // Notify all players
    room.players.forEach(player => {
      if (player.connected && player.socketId) {
        io.to(player.socketId).emit('gameEnded', {
          ...result,
          gameState: gameState.getPlayerGameState(gameStateObj, player.id)
        });
      }
    });
    
    return true; // Game ended
  }
  
  return false; // Game continues
}

/**
 * Validate if game can continue
 */
function canGameContinue(gameStateObj) {
  // Game cannot continue if ended
  if (gameStateObj.status === 'ended') {
    return false;
  }
  
  // Game cannot continue if no fuse tokens left
  if (gameStateObj.fuseTokens <= 0) {
    return false;
  }
  
  // Game cannot continue if all fireworks completed
  const allCompleted = Object.values(gameStateObj.fireworksPiles).every(pile => pile.completed);
  if (allCompleted) {
    return false;
  }
  
  // Game cannot continue if final round is over
  if (gameStateObj.finalRound && gameStateObj.finalRoundTurnsLeft <= 0) {
    return false;
  }
  
  return true;
}

module.exports = {
  checkGameEndConditions,
  getScoreRating,
  generateGameSummary,
  checkDisconnectionTimeout,
  handleGameEnd,
  processGameEnd,
  canGameContinue
}; 