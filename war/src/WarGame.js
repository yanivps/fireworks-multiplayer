const path = require('path');

// Import the framework from the relative path
// In a real project, this would be: require('multiplayer-card-game-framework')
const frameworkPath = path.join(__dirname, '../../multiplayer-card-game-framework/src/shared/GameImplementation');
const GameImplementation = require(frameworkPath);

/**
 * War Card Game Implementation
 * 
 * A simple two-player card game that relies purely on luck.
 * Players simultaneously draw cards, and the higher card wins the round.
 * Equal cards trigger "War" - players put down sacrifice cards and draw again.
 */
class WarGame extends GameImplementation {
  getGameConfig() {
    return {
      minPlayers: 2,
      maxPlayers: 2, // War is strictly a 2-player game
      name: 'War',
      version: '1.0.0'
    };
  }

  createInitialState(playerIds, gameConfig = {}) {
    if (playerIds.length !== 2) {
      throw new Error('War requires exactly 2 players');
    }

    // Create and shuffle a standard 52-card deck
    const deck = this.createStandardDeck();
    const shuffledDeck = this.shuffleDeck(deck);
    
    // Deal cards evenly between players (26 each)
    const player1Cards = shuffledDeck.slice(0, 26);
    const player2Cards = shuffledDeck.slice(26, 52);
    
    return {
      status: 'playing',
      playerIds: [...playerIds],
      
      // Player card stacks (face down)
      playerStacks: {
        [playerIds[0]]: player1Cards,
        [playerIds[1]]: player2Cards
      },
      
      // Current round state
      currentRound: {
        cardsPlayed: {}, // playerId -> array of cards played this round
        roundType: 'normal', // 'normal' or 'war'
        waitingForAction: new Set(playerIds), // players who need to play a card
      },
      
      // Battle area (cards currently in play)
      battleArea: [],
      
      // Game statistics
      roundNumber: 1,
      totalWars: 0,
      
      createdAt: Date.now(),
      lastActionAt: Date.now()
    };
  }

  validateAction(action, gameState, playerId) {
    // Check if game is active
    if (gameState.status !== 'playing') {
      return { valid: false, error: 'Game is not active' };
    }

    // Check if it's this player's turn to act
    if (!gameState.currentRound.waitingForAction.has(playerId)) {
      return { valid: false, error: 'Not your turn to play a card' };
    }

    // Check if player has cards
    if (gameState.playerStacks[playerId].length === 0) {
      return { valid: false, error: 'You have no cards left' };
    }

    // Validate action type
    if (action.type !== 'playCard') {
      return { valid: false, error: 'Invalid action type. Only "playCard" is allowed.' };
    }

    return { valid: true };
  }

  processAction(action, gameState, playerId) {
    if (action.type === 'playCard') {
      return this.processPlayCard(gameState, playerId);
    }
    
    return { success: false, error: 'Unknown action type' };
  }

  processPlayCard(gameState, playerId) {
    const playerStack = gameState.playerStacks[playerId];
    
    if (playerStack.length === 0) {
      return { success: false, error: 'No cards to play' };
    }

    // Draw top card from player's stack
    const card = playerStack.shift();
    
    // Add card to current round
    if (!gameState.currentRound.cardsPlayed[playerId]) {
      gameState.currentRound.cardsPlayed[playerId] = [];
    }
    gameState.currentRound.cardsPlayed[playerId].push(card);
    
    // Remove player from waiting list
    gameState.currentRound.waitingForAction.delete(playerId);
    
    // Update timestamp
    gameState.lastActionAt = Date.now();
    
    let result = {
      success: true,
      actionType: 'playCard',
      playerId: playerId,
      card: card,
      playerCardsRemaining: playerStack.length
    };
    
    // Check if all players have played their cards for this phase
    if (gameState.currentRound.waitingForAction.size === 0) {
      const roundResult = this.resolveRound(gameState);
      result = { ...result, ...roundResult };
    }
    
    return result;
  }

  resolveRound(gameState) {
    const playerIds = gameState.playerIds;
    const cardsPlayed = gameState.currentRound.cardsPlayed;
    
    // Get the cards played by each player in this phase
    const player1Cards = cardsPlayed[playerIds[0]] || [];
    const player2Cards = cardsPlayed[playerIds[1]] || [];
    
    const player1TopCard = player1Cards[player1Cards.length - 1];
    const player2TopCard = player2Cards[player2Cards.length - 1];
    
    // Compare card values
    const player1Value = this.getCardValue(player1TopCard);
    const player2Value = this.getCardValue(player2TopCard);
    
    let result = {
      roundResolved: true,
      battleCards: {
        [playerIds[0]]: player1TopCard,
        [playerIds[1]]: player2TopCard
      }
    };
    
    if (player1Value > player2Value) {
      // Player 1 wins
      result.winner = playerIds[0];
      result.winReason = `${this.getCardDisplayName(player1TopCard)} beats ${this.getCardDisplayName(player2TopCard)}`;
      this.awardCardsToWinner(gameState, playerIds[0]);
      
    } else if (player2Value > player1Value) {
      // Player 2 wins
      result.winner = playerIds[1];
      result.winReason = `${this.getCardDisplayName(player2TopCard)} beats ${this.getCardDisplayName(player1TopCard)}`;
      this.awardCardsToWinner(gameState, playerIds[1]);
      
    } else {
      // Tie - WAR!
      result.war = true;
      result.winReason = `${this.getCardDisplayName(player1TopCard)} ties with ${this.getCardDisplayName(player2TopCard)} - WAR!`;
      gameState.totalWars++;
      
      // Check if both players have enough cards for war (need at least 2 more cards)
      if (gameState.playerStacks[playerIds[0]].length < 2 || gameState.playerStacks[playerIds[1]].length < 2) {
        // Player with more cards wins
        const player1Cards = gameState.playerStacks[playerIds[0]].length;
        const player2Cards = gameState.playerStacks[playerIds[1]].length;
        
        if (player1Cards > player2Cards) {
          result.winner = playerIds[0];
          result.winReason = 'War declared but opponent has insufficient cards';
          this.awardCardsToWinner(gameState, playerIds[0]);
        } else if (player2Cards > player1Cards) {
          result.winner = playerIds[1];
          result.winReason = 'War declared but opponent has insufficient cards';
          this.awardCardsToWinner(gameState, playerIds[1]);
        } else {
          // Extremely rare - both have same number of insufficient cards
          result.winner = null;
          result.winReason = 'Game ends in a draw - both players have insufficient cards for war';
          gameState.status = 'ended';
        }
      } else {
        // Start war phase - players need to play sacrifice card + battle card
        this.startWarPhase(gameState);
        result.warStarted = true;
        result.roundResolved = false; // Round not fully resolved yet
      }
    }
    
    // If round is resolved, start next round
    if (result.roundResolved && gameState.status === 'playing') {
      this.startNextRound(gameState);
    }
    
    return result;
  }

  startWarPhase(gameState) {
    const playerIds = gameState.playerIds;
    
    // Each player plays one card face down (sacrifice), then one face up (battle)
    // For simplicity, we'll have them play both cards in one action
    gameState.currentRound.roundType = 'war';
    gameState.currentRound.waitingForAction = new Set(playerIds);
    
    // Play sacrifice cards automatically (face down)
    playerIds.forEach(playerId => {
      const sacrificeCard = gameState.playerStacks[playerId].shift();
      gameState.currentRound.cardsPlayed[playerId].push(sacrificeCard);
    });
    
    // Now players need to play their battle cards
  }

  awardCardsToWinner(gameState, winnerId) {
    const allCards = [];
    
    // Collect all cards from battle area and current round
    allCards.push(...gameState.battleArea);
    
    // Collect all cards played in current round
    Object.values(gameState.currentRound.cardsPlayed).forEach(playerCards => {
      allCards.push(...playerCards);
    });
    
    // Add all cards to bottom of winner's stack
    gameState.playerStacks[winnerId].push(...allCards);
    
    // Clear battle area and current round
    gameState.battleArea = [];
    gameState.currentRound.cardsPlayed = {};
  }

  startNextRound(gameState) {
    gameState.roundNumber++;
    gameState.currentRound = {
      cardsPlayed: {},
      roundType: 'normal',
      waitingForAction: new Set(gameState.playerIds)
    };
  }

  checkEndConditions(gameState) {
    const playerIds = gameState.playerIds;
    const player1Cards = gameState.playerStacks[playerIds[0]].length;
    const player2Cards = gameState.playerStacks[playerIds[1]].length;
    
    // Game ends when one player has all the cards (or no cards)
    if (player1Cards === 0) {
      return {
        ended: true,
        result: {
          winner: playerIds[1],
          loser: playerIds[0],
          reason: 'Opponent ran out of cards',
          finalCardCounts: {
            [playerIds[0]]: 0,
            [playerIds[1]]: 52
          },
          totalRounds: gameState.roundNumber,
          totalWars: gameState.totalWars
        }
      };
    }
    
    if (player2Cards === 0) {
      return {
        ended: true,
        result: {
          winner: playerIds[0],
          loser: playerIds[1],
          reason: 'Opponent ran out of cards',
          finalCardCounts: {
            [playerIds[0]]: 52,
            [playerIds[1]]: 0
          },
          totalRounds: gameState.roundNumber,
          totalWars: gameState.totalWars
        }
      };
    }
    
    // Check for draw condition (set in resolveRound)
    if (gameState.status === 'ended') {
      return {
        ended: true,
        result: {
          winner: null,
          reason: 'Game ended in a draw',
          finalCardCounts: {
            [playerIds[0]]: player1Cards,
            [playerIds[1]]: player2Cards
          },
          totalRounds: gameState.roundNumber,
          totalWars: gameState.totalWars
        }
      };
    }
    
    return { ended: false };
  }

  getPlayerView(gameState, playerId) {
    // Create a view that hides opponent's cards but shows public information
    const playerIds = gameState.playerIds;
    const opponentId = playerIds.find(id => id !== playerId);
    
    return {
      ...gameState,
      playerStacks: {
        [playerId]: gameState.playerStacks[playerId], // Player can see their own cards
        [opponentId]: gameState.playerStacks[opponentId].map(() => ({ hidden: true })) // Opponent cards are hidden
      }
    };
  }

  calculateFinalResult(gameState) {
    const endCheck = this.checkEndConditions(gameState);
    if (endCheck.ended) {
      return {
        gameEnded: true,
        timestamp: Date.now(),
        ...endCheck.result
      };
    }
    
    return {
      gameEnded: false,
      timestamp: Date.now()
    };
  }

  // Helper methods for card management
  createStandardDeck() {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const deck = [];
    
    suits.forEach(suit => {
      ranks.forEach(rank => {
        deck.push({ suit, rank });
      });
    });
    
    return deck;
  }

  shuffleDeck(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  getCardValue(card) {
    const values = {
      '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
      'J': 11, 'Q': 12, 'K': 13, 'A': 14 // Ace is high
    };
    return values[card.rank];
  }

  getCardDisplayName(card) {
    return `${card.rank} of ${card.suit}`;
  }

  /**
   * Serialize game state for JSON transmission
   * Convert Sets to arrays for JSON compatibility
   */
  serializeGameState(gameState) {
    const serialized = { ...gameState };
    
    // Convert Set to array for JSON serialization
    if (gameState.currentRound && gameState.currentRound.waitingForAction instanceof Set) {
      serialized.currentRound = {
        ...gameState.currentRound,
        waitingForAction: Array.from(gameState.currentRound.waitingForAction)
      };
    }
    
    return serialized;
  }

  /**
   * Deserialize game state from JSON
   * Convert arrays back to Sets
   */
  deserializeGameState(serializedState) {
    const gameState = { ...serializedState };
    
    // Convert array back to Set
    if (gameState.currentRound && Array.isArray(gameState.currentRound.waitingForAction)) {
      gameState.currentRound.waitingForAction = new Set(gameState.currentRound.waitingForAction);
    }
    
    return gameState;
  }

  /**
   * Override getPlayerView to ensure proper serialization
   */
  getPlayerView(gameState, playerId) {
    // First get the basic player view
    const playerIds = gameState.playerIds;
    const opponentId = playerIds.find(id => id !== playerId);
    
    const playerView = {
      ...gameState,
      playerStacks: {
        [playerId]: gameState.playerStacks[playerId], // Player can see their own cards
        [opponentId]: gameState.playerStacks[opponentId].map(() => ({ hidden: true })) // Opponent cards are hidden
      }
    };

    // Then serialize it to handle Sets
    return this.serializeGameState(playerView);
  }
}

module.exports = WarGame; 
 