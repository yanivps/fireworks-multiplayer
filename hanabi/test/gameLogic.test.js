const gameState = require('../game/gameState');
const gameActions = require('../game/gameActions');

// Simple test function
function test(description, testFn) {
  try {
    testFn();
    console.log(`✅ ${description}`);
  } catch (error) {
    console.log(`❌ ${description}: ${error.message}`);
  }
}

// Test game state creation
test('Game state creation with 2 players', () => {
  const playerIds = ['player1', 'player2'];
  const game = gameState.createGameState(playerIds);
  
  if (game.playerIds.length !== 2) throw new Error('Wrong number of players');
  if (game.clueTokens !== 8) throw new Error('Wrong clue tokens');
  if (game.fuseTokens !== 3) throw new Error('Wrong fuse tokens');
  if (game.hands.player1.length !== 5) throw new Error('Wrong hand size for 2 players');
  if (game.deck.length !== 40) throw new Error('Wrong deck size after dealing'); // 50 total - 10 dealt
});

// Test game state creation with 4 players
test('Game state creation with 4 players', () => {
  const playerIds = ['p1', 'p2', 'p3', 'p4'];
  const game = gameState.createGameState(playerIds);
  
  if (game.hands.p1.length !== 4) throw new Error('Wrong hand size for 4 players');
  if (game.deck.length !== 34) throw new Error('Wrong deck size after dealing'); // 50 total - 16 dealt
});

// Test card playing
test('Valid card play', () => {
  const playerIds = ['player1', 'player2'];
  const game = gameState.createGameState(playerIds);
  
  // Manually place a red 1 in player1's hand for testing
  game.hands.player1[0] = { id: 'test', color: 'red', number: 1 };
  
  const result = gameActions.playCard(game, 'player1', 0);
  
  if (!result.success) throw new Error('Valid play should succeed');
  if (game.fireworksPiles.red.cards.length !== 1) throw new Error('Card not added to pile');
  if (game.currentPlayerId === 'player1') throw new Error('Turn should advance');
});

// Test invalid card play
test('Invalid card play loses fuse token', () => {
  const playerIds = ['player1', 'player2'];
  const game = gameState.createGameState(playerIds);
  
  // Manually place a red 3 in player1's hand (can't play 3 first)
  game.hands.player1[0] = { id: 'test', color: 'red', number: 3 };
  
  const result = gameActions.playCard(game, 'player1', 0);
  
  if (!result.success) throw new Error('Action should succeed even if play is invalid');
  if (!result.invalidPlay) throw new Error('Should be marked as invalid play');
  if (game.fuseTokens !== 2) throw new Error('Should lose fuse token');
  if (game.discardPile.length !== 1) throw new Error('Card should go to discard pile');
});

// Test discard action
test('Discard card gains clue token', () => {
  const playerIds = ['player1', 'player2'];
  const game = gameState.createGameState(playerIds);
  
  // Use a clue token first
  game.clueTokens = 7;
  
  const result = gameActions.discardCard(game, 'player1', 0);
  
  if (!result.success) throw new Error('Discard should succeed');
  if (game.clueTokens !== 8) throw new Error('Should gain clue token');
  if (game.discardPile.length !== 1) throw new Error('Card should go to discard pile');
});

// Test clue giving
test('Give valid clue', () => {
  const playerIds = ['player1', 'player2'];
  const game = gameState.createGameState(playerIds);
  
  // Manually place a red card in player2's hand
  game.hands.player2[0] = { id: 'test', color: 'red', number: 1 };
  
  const result = gameActions.giveClue(game, 'player1', 'player2', 'color', 'red');
  
  if (!result.success) throw new Error('Valid clue should succeed');
  if (game.clueTokens !== 7) throw new Error('Should use clue token');
  if (result.matchingCardIndices.length === 0) throw new Error('Should find matching cards');
});

// Test turn validation
test('Turn validation', () => {
  const playerIds = ['player1', 'player2'];
  const game = gameState.createGameState(playerIds);
  
  // Should be player1's turn initially
  if (!gameState.isPlayerTurn(game, 'player1')) throw new Error('Should be player1 turn');
  if (gameState.isPlayerTurn(game, 'player2')) throw new Error('Should not be player2 turn');
});

console.log('\n🧪 Running Hanabi Game Logic Tests...\n');

// Run all tests
test('Game state creation with 2 players', () => {
  const playerIds = ['player1', 'player2'];
  const game = gameState.createGameState(playerIds);
  
  if (game.playerIds.length !== 2) throw new Error('Wrong number of players');
  if (game.clueTokens !== 8) throw new Error('Wrong clue tokens');
  if (game.fuseTokens !== 3) throw new Error('Wrong fuse tokens');
  if (game.hands.player1.length !== 5) throw new Error('Wrong hand size for 2 players');
  if (game.deck.length !== 40) throw new Error('Wrong deck size after dealing');
});

test('Game state creation with 4 players', () => {
  const playerIds = ['p1', 'p2', 'p3', 'p4'];
  const game = gameState.createGameState(playerIds);
  
  if (game.hands.p1.length !== 4) throw new Error('Wrong hand size for 4 players');
  if (game.deck.length !== 34) throw new Error('Wrong deck size after dealing');
});

test('Valid card play', () => {
  const playerIds = ['player1', 'player2'];
  const game = gameState.createGameState(playerIds);
  
  game.hands.player1[0] = { id: 'test', color: 'red', number: 1 };
  
  const result = gameActions.playCard(game, 'player1', 0);
  
  if (!result.success) throw new Error('Valid play should succeed');
  if (game.fireworksPiles.red.cards.length !== 1) throw new Error('Card not added to pile');
  if (game.currentPlayerId === 'player1') throw new Error('Turn should advance');
});

test('Invalid card play loses fuse token', () => {
  const playerIds = ['player1', 'player2'];
  const game = gameState.createGameState(playerIds);
  
  game.hands.player1[0] = { id: 'test', color: 'red', number: 3 };
  
  const result = gameActions.playCard(game, 'player1', 0);
  
  if (!result.success) throw new Error('Action should succeed even if play is invalid');
  if (!result.invalidPlay) throw new Error('Should be marked as invalid play');
  if (game.fuseTokens !== 2) throw new Error('Should lose fuse token');
  if (game.discardPile.length !== 1) throw new Error('Card should go to discard pile');
});

test('Discard card gains clue token', () => {
  const playerIds = ['player1', 'player2'];
  const game = gameState.createGameState(playerIds);
  
  game.clueTokens = 7;
  
  const result = gameActions.discardCard(game, 'player1', 0);
  
  if (!result.success) throw new Error('Discard should succeed');
  if (game.clueTokens !== 8) throw new Error('Should gain clue token');
  if (game.discardPile.length !== 1) throw new Error('Card should go to discard pile');
});

test('Give valid clue', () => {
  const playerIds = ['player1', 'player2'];
  const game = gameState.createGameState(playerIds);
  
  game.hands.player2[0] = { id: 'test', color: 'red', number: 1 };
  
  const result = gameActions.giveClue(game, 'player1', 'player2', 'color', 'red');
  
  if (!result.success) throw new Error('Valid clue should succeed');
  if (game.clueTokens !== 7) throw new Error('Should use clue token');
  if (result.matchingCardIndices.length === 0) throw new Error('Should find matching cards');
});

test('Turn validation', () => {
  const playerIds = ['player1', 'player2'];
  const game = gameState.createGameState(playerIds);
  
  if (!gameState.isPlayerTurn(game, 'player1')) throw new Error('Should be player1 turn');
  if (gameState.isPlayerTurn(game, 'player2')) throw new Error('Should not be player2 turn');
});

console.log('\n✅ All tests completed!\n'); 