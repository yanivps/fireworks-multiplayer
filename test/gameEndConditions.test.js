const gameState = require('../game/gameState');
const gameEndConditions = require('../game/gameEndConditions');

// Simple test function
function test(description, testFn) {
  try {
    testFn();
    console.log(`✅ ${description}`);
  } catch (error) {
    console.log(`❌ ${description}: ${error.message}`);
  }
}

console.log('\n🧪 Running Game End Conditions Tests...\n');

// Test perfect score detection
test('Perfect score detection', () => {
  const playerIds = ['player1', 'player2'];
  const game = gameState.createGameState(playerIds);
  
  // Complete all fireworks
  gameState.COLORS.forEach(color => {
    for (let i = 1; i <= 5; i++) {
      game.fireworksPiles[color].cards.push({ color, number: i });
    }
    game.fireworksPiles[color].nextNumber = 6;
    game.fireworksPiles[color].completed = true;
  });
  
  const endConditions = gameEndConditions.checkGameEndConditions(game);
  
  if (endConditions.length === 0) throw new Error('Should detect perfect score');
  if (endConditions[0].type !== 'perfect_score') throw new Error('Should be perfect score type');
  if (endConditions[0].score !== 25) throw new Error('Should have score 25');
});

// Test fuse tokens lost detection
test('Fuse tokens lost detection', () => {
  const playerIds = ['player1', 'player2'];
  const game = gameState.createGameState(playerIds);
  
  game.fuseTokens = 0;
  
  const endConditions = gameEndConditions.checkGameEndConditions(game);
  
  if (endConditions.length === 0) throw new Error('Should detect fuse tokens lost');
  if (endConditions[0].type !== 'fuse_tokens_lost') throw new Error('Should be fuse tokens lost type');
});

// Test deck exhausted detection
test('Deck exhausted detection', () => {
  const playerIds = ['player1', 'player2'];
  const game = gameState.createGameState(playerIds);
  
  game.finalRound = true;
  game.finalRoundTurnsLeft = 0;
  
  const endConditions = gameEndConditions.checkGameEndConditions(game);
  
  if (endConditions.length === 0) throw new Error('Should detect deck exhausted');
  if (endConditions[0].type !== 'deck_exhausted') throw new Error('Should be deck exhausted type');
});

// Test score rating
test('Score rating system', () => {
  const ratings = [
    { score: 25, expectedRating: 'Legendary' },
    { score: 22, expectedRating: 'Excellent' },
    { score: 19, expectedRating: 'Very Good' },
    { score: 16, expectedRating: 'Good' },
    { score: 13, expectedRating: 'Average' },
    { score: 10, expectedRating: 'Poor' },
    { score: 7, expectedRating: 'Bad' },
    { score: 4, expectedRating: 'Very Bad' },
    { score: 1, expectedRating: 'Terrible' }
  ];
  
  ratings.forEach(({ score, expectedRating }) => {
    const rating = gameEndConditions.getScoreRating(score);
    if (rating.rating !== expectedRating) {
      throw new Error(`Score ${score} should be ${expectedRating}, got ${rating.rating}`);
    }
  });
});

// Test game summary generation
test('Game summary generation', () => {
  const playerIds = ['player1', 'player2'];
  const game = gameState.createGameState(playerIds);
  
  // Add some cards to fireworks
  game.fireworksPiles.red.cards.push({ color: 'red', number: 1 });
  game.fireworksPiles.red.cards.push({ color: 'red', number: 2 });
  game.fireworksPiles.blue.cards.push({ color: 'blue', number: 1 });
  
  // Add some discarded cards
  game.discardPile.push({ color: 'yellow', number: 3 });
  
  // Set some game state
  game.turnCount = 10;
  game.clueTokens = 6;
  game.fuseTokens = 2;
  
  const summary = gameEndConditions.generateGameSummary(game);
  
  if (summary.score !== 3) throw new Error('Should calculate correct score');
  if (summary.gameStats.totalTurns !== 10) throw new Error('Should track total turns');
  if (summary.gameStats.clueTokensUsed !== 2) throw new Error('Should calculate clue tokens used');
  if (summary.gameStats.fuseTokensLost !== 1) throw new Error('Should calculate fuse tokens lost');
  if (summary.gameStats.cardsDiscarded !== 1) throw new Error('Should count discarded cards');
  if (!summary.fireworksProgress.red.includes(1)) throw new Error('Should track fireworks progress');
});

// Test game continuation validation
test('Game continuation validation', () => {
  const playerIds = ['player1', 'player2'];
  const game = gameState.createGameState(playerIds);
  
  // Game should continue normally
  if (!gameEndConditions.canGameContinue(game)) throw new Error('Game should continue normally');
  
  // Game should not continue if ended
  game.status = 'ended';
  if (gameEndConditions.canGameContinue(game)) throw new Error('Game should not continue if ended');
  
  // Reset and test fuse tokens
  game.status = 'playing';
  game.fuseTokens = 0;
  if (gameEndConditions.canGameContinue(game)) throw new Error('Game should not continue with no fuse tokens');
  
  // Reset and test final round
  game.fuseTokens = 3;
  game.finalRound = true;
  game.finalRoundTurnsLeft = 0;
  if (gameEndConditions.canGameContinue(game)) throw new Error('Game should not continue after final round');
});

console.log('\n✅ All game end condition tests completed!\n'); 