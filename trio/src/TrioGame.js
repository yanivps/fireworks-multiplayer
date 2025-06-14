const path = require('path');

// Import the framework from the relative path
const frameworkPath = path.join(__dirname, '../../multiplayer-card-game-framework/src/shared/GameImplementation');
const GameImplementation = require(frameworkPath);

/**
 * Trio Card Game Implementation
 * 
 * A strategic card collection game where players try to collect trios (3 cards of the same number).
 * Players reveal cards one at a time, and must continue as long as they match.
 * Special "7 trio" wins immediately.
 */
class TrioGame extends GameImplementation {
  getGameConfig() {
    return {
      minPlayers: 3,
      maxPlayers: 6,
      name: 'Trio',
      version: '1.0.0'
    };
  }

  createInitialState(playerIds, gameConfig = {}) {
    const numPlayers = playerIds.length;
    
    if (numPlayers < 3 || numPlayers > 6) {
      throw new Error('Trio requires 3-6 players');
    }

    // Create deck: 3 copies each of numbers 1-12 (36 cards total)
    const deck = this.createTrioDeck();
    const shuffledDeck = this.shuffleDeck(deck);
    
    // Deal cards based on player count
    const dealInfo = this.getDealInfo(numPlayers);
    const playerHands = {};
    const middlePile = [];
    
    let cardIndex = 0;
    
    // Deal to players and sort hands by number
    playerIds.forEach(playerId => {
      const hand = shuffledDeck.slice(cardIndex, cardIndex + dealInfo.cardsPerPlayer);
      // Sort hand by number so lowest is always at index 0, highest at last index
      playerHands[playerId] = hand.sort((a, b) => a.number - b.number);
      cardIndex += dealInfo.cardsPerPlayer;
    });
    
    // Deal to middle pile
    for (let i = 0; i < dealInfo.middleCards; i++) {
      middlePile.push(shuffledDeck[cardIndex]);
      cardIndex++;
    }

    return {
      status: 'playing',
      playerIds: [...playerIds],
      currentPlayerIndex: 0,
      currentPlayerId: playerIds[0],
      
      // Game state
      playerHands: playerHands,
      middlePile: middlePile,
      originalMiddlePile: [...middlePile], // Keep track of original positions
      collectedTrios: {}, // playerId -> array of trios
      
      // Current turn state
      currentTurn: {
        playerId: playerIds[0],
        revealedCards: [], // cards revealed this turn
        targetNumber: null, // number we're trying to match
        phase: 'choosing' // 'choosing', 'revealing', 'ended'
      },
      
      // Game statistics
      turnNumber: 1,
      gameMode: gameConfig.gameMode || 'simple', // 'simple' or 'spicy'
      
      createdAt: Date.now(),
      lastActionAt: Date.now()
    };
  }

  validateAction(action, gameState, playerId) {
    // Check if game is active
    if (gameState.status !== 'playing') {
      return { valid: false, error: 'Game is not active' };
    }

    // Special case: dismissMismatch doesn't require turn validation
    if (action.type === 'dismissMismatch') {
      return this.validateDismissMismatch(action, gameState, playerId);
    }

    // Check if it's this player's turn (for all other actions)
    if (gameState.currentPlayerId !== playerId) {
      return { valid: false, error: 'Not your turn' };
    }

    // Check if turn is in correct phase
    if (gameState.currentTurn.phase === 'ended') {
      return { valid: false, error: 'Turn has ended' };
    }

    switch (action.type) {
      case 'revealFromHand':
        return this.validateRevealFromHand(action, gameState, playerId);
      case 'revealFromMiddle':
        return this.validateRevealFromMiddle(action, gameState, playerId);
      default:
        return { valid: false, error: 'Invalid action type' };
    }
  }

  validateRevealFromHand(action, gameState, playerId) {
    if (!action.targetPlayerId) {
      return { valid: false, error: 'Target player ID required' };
    }

    if (!action.position || !['lowest', 'highest'].includes(action.position)) {
      return { valid: false, error: 'Position must be "lowest" or "highest"' };
    }

    // Check if target player exists
    const targetPlayerHand = gameState.playerHands[action.targetPlayerId];
    if (!targetPlayerHand) {
      return { valid: false, error: 'Target player not found' };
    }

    // Check if target player has unrevealed cards
    const availableCards = targetPlayerHand.filter(card => !card.revealed);
    if (availableCards.length === 0) {
      return { valid: false, error: 'Target player has no available cards' };
    }

    // If revealing from own hand, can only reveal lowest or highest
    if (action.targetPlayerId === playerId) {
      return { valid: true };
    }

    // Can reveal from any other player's hand
    return { valid: true };
  }

  validateRevealFromMiddle(action, gameState, playerId) {
    if (typeof action.cardIndex !== 'number') {
      return { valid: false, error: 'Card index required' };
    }

    if (action.cardIndex < 0 || action.cardIndex >= gameState.originalMiddlePile.length) {
      return { valid: false, error: 'Invalid card index' };
    }

    // Check if card is still available (not null and not already revealed)
    const card = gameState.originalMiddlePile[action.cardIndex];
    if (!card || card.revealed) {
      return { valid: false, error: 'Card no longer available' };
    }

    return { valid: true };
  }

  validateDismissMismatch(action, gameState, playerId) {
    // Check if there's an active mismatch
    if (!gameState.mismatchState || !gameState.mismatchState.mismatchActive) {
      return { valid: false, error: 'No active mismatch to dismiss' };
    }

    // Check if this player hasn't already dismissed it
    if (gameState.mismatchState.playersWhoSawMismatch[playerId]) {
      return { valid: false, error: 'Mismatch already dismissed by this player' };
    }

    return { valid: true };
  }

  processAction(action, gameState, playerId) {
    switch (action.type) {
      case 'revealFromHand':
        return this.processRevealFromHand(action, gameState, playerId);
      case 'revealFromMiddle':
        return this.processRevealFromMiddle(action, gameState, playerId);
      case 'dismissMismatch':
        return this.processDismissMismatch(action, gameState, playerId);
      default:
        return { success: false, error: 'Unknown action type' };
    }
  }

  processRevealFromHand(action, gameState, playerId) {
    const targetPlayerHand = gameState.playerHands[action.targetPlayerId];
    
    // Hand is already sorted by number, so we can directly find lowest/highest unrevealed card
    const availableIndices = [];
    targetPlayerHand.forEach((card, index) => {
      if (!card.revealed) {
        availableIndices.push(index);
      }
    });
    
    if (availableIndices.length === 0) {
      return { success: false, error: 'No available cards to reveal' };
    }
    
    // Get the index of the card to reveal (lowest = first available, highest = last available)
    const handIndex = action.position === 'lowest' ? availableIndices[0] : availableIndices[availableIndices.length - 1];
    const revealedCard = targetPlayerHand[handIndex];
    
    // Mark card as revealed in place
    targetPlayerHand[handIndex] = {
      ...revealedCard,
      revealed: true
    };
    
    return this.processRevealedCard(revealedCard, gameState, {
      source: 'hand',
      targetPlayerId: action.targetPlayerId,
      position: action.position,
      handIndex: handIndex
    });
  }

  processRevealFromMiddle(action, gameState, playerId) {
    const revealedCard = gameState.originalMiddlePile[action.cardIndex];
    
    // Check if card is still available (not null)
    if (!revealedCard) {
      return { success: false, error: 'Card no longer available' };
    }
    
    // Mark card as revealed in original position
    gameState.originalMiddlePile[action.cardIndex] = {
      ...revealedCard,
      revealed: true
    };
    
    return this.processRevealedCard(revealedCard, gameState, {
      source: 'middle',
      cardIndex: action.cardIndex
    });
  }

  processDismissMismatch(action, gameState, playerId) {
    // Mark this player as having seen the mismatch
    gameState.mismatchState.playersWhoSawMismatch[playerId] = true;
    
    // Check if all players have now seen the mismatch
    const allPlayersSawMismatch = gameState.playerIds.every(pid => 
      gameState.mismatchState.playersWhoSawMismatch[pid]
    );
    
    if (allPlayersSawMismatch) {
      // All players have dismissed the modal - now return the cards
      this.returnRevealedCards(gameState, gameState.mismatchState.revealedCards, gameState.mismatchState.lastSourceInfo);
      
      // Clear mismatch state
      gameState.mismatchState = null;
      
      return {
        success: true,
        actionType: 'mismatchDismissedByAll',
        message: 'All players have acknowledged the mismatch. Cards returned.',
        allPlayersReady: true
      };
    } else {
      return {
        success: true,
        actionType: 'mismatchDismissedByPlayer',
        message: 'Mismatch acknowledged. Waiting for other players.',
        allPlayersReady: false,
        playersReady: Object.values(gameState.mismatchState.playersWhoSawMismatch).filter(Boolean).length,
        totalPlayers: gameState.playerIds.length
      };
    }
  }

  processRevealedCard(revealedCard, gameState, sourceInfo) {
    const currentTurn = gameState.currentTurn;
    
    // Add source information to the revealed card
    const revealedCardWithSource = {
      ...revealedCard,
      sourceType: sourceInfo.source,
      sourceIndex: sourceInfo.cardIndex,
      sourcePlayerId: sourceInfo.targetPlayerId,
      sourcePosition: sourceInfo.position,
      handIndex: sourceInfo.handIndex // Include handIndex for proper card return
    };
    
    // If this is the first card revealed this turn
    if (currentTurn.revealedCards.length === 0) {
      currentTurn.targetNumber = revealedCard.number;
      currentTurn.revealedCards.push(revealedCardWithSource);
      currentTurn.phase = 'revealing';
      
      return {
        success: true,
        actionType: 'cardRevealed',
        card: revealedCard,
        sourceInfo: sourceInfo,
        targetNumber: revealedCard.number,
        canContinue: true,
        // Explicit position information for client rendering
        revealedCardPosition: {
          playerId: sourceInfo.targetPlayerId,
          handIndex: sourceInfo.handIndex,
          cardNumber: revealedCard.number,
          cardId: revealedCard.id
        },
        message: `Revealed ${revealedCard.number} - continue revealing to form a trio`
      };
    }
    
    // Check if revealed card matches target number
    if (revealedCard.number === currentTurn.targetNumber) {
      currentTurn.revealedCards.push(revealedCardWithSource);
      
      // Check if we have a complete trio (3 cards)
      if (currentTurn.revealedCards.length === 3) {
        return this.completeTrio(gameState, currentTurn.revealedCards);
      }
      
      return {
        success: true,
        actionType: 'cardRevealed',
        card: revealedCard,
        sourceInfo: sourceInfo,
        targetNumber: currentTurn.targetNumber,
        canContinue: true,
        cardsRevealed: currentTurn.revealedCards.length,
        // Explicit position information for client rendering
        revealedCardPosition: {
          playerId: sourceInfo.targetPlayerId,
          handIndex: sourceInfo.handIndex,
          cardNumber: revealedCard.number,
          cardId: revealedCard.id
        },
        message: `Revealed ${revealedCard.number} - ${3 - currentTurn.revealedCards.length} more needed for trio`
      };
    } else {
      // Mismatch - return all revealed cards and end turn
      return this.handleMismatch(gameState, revealedCardWithSource, sourceInfo);
    }
  }

  completeTrio(gameState, trioCards) {
    const playerId = gameState.currentPlayerId;
    const trioNumber = trioCards[0].number;
    
    // Remove cards from their original sources
    // First, handle middle pile cards
    trioCards.forEach(card => {
      if (card.sourceType === 'middle' && typeof card.sourceIndex === 'number') {
        gameState.originalMiddlePile[card.sourceIndex] = null;
      }
    });
    
    // Then, handle hand cards - group by player and sort indices in descending order
    const handCardsToRemove = trioCards.filter(card => 
      card.sourceType === 'hand' && typeof card.handIndex === 'number'
    );
    
    // Group by target player
    const cardsByPlayer = {};
    handCardsToRemove.forEach(card => {
      const targetPlayerId = card.sourcePlayerId;
      if (!cardsByPlayer[targetPlayerId]) {
        cardsByPlayer[targetPlayerId] = [];
      }
      cardsByPlayer[targetPlayerId].push(card.handIndex);
    });
    
    // Remove cards from each player's hand, starting from highest index
    Object.entries(cardsByPlayer).forEach(([targetPlayerId, indices]) => {
      if (gameState.playerHands[targetPlayerId]) {
        // Sort indices in descending order to avoid index shifting issues
        indices.sort((a, b) => b - a);
        indices.forEach(handIndex => {
          gameState.playerHands[targetPlayerId].splice(handIndex, 1);
        });
      }
    });
    
    // Add trio to player's collection
    if (!gameState.collectedTrios[playerId]) {
      gameState.collectedTrios[playerId] = [];
    }
    gameState.collectedTrios[playerId].push({
      number: trioNumber,
      cards: trioCards,
      completedAt: Date.now()
    });
    
    // Check for win conditions
    const winCheck = this.checkWinConditions(gameState, playerId);
    if (winCheck.hasWon) {
      gameState.status = 'ended';
      gameState.winner = playerId;
      gameState.winReason = winCheck.reason;
      
      // Clear current turn for game end
      gameState.currentTurn = {
        playerId: playerId,
        revealedCards: [],
        targetNumber: null,
        phase: 'ended'
      };
    } else {
      // Game continues - advance to next player
      this.advanceToNextPlayer(gameState);
    }
    
    return {
      success: true,
      actionType: 'trioCompleted',
      trio: {
        number: trioNumber,
        cards: trioCards
      },
      totalTrios: gameState.collectedTrios[playerId].length,
      winner: winCheck.hasWon ? playerId : null,
      winReason: winCheck.reason,
      message: winCheck.hasWon ? 
        `Trio of ${trioNumber}s completed! ${winCheck.reason}` : 
        `Trio of ${trioNumber}s completed! (${gameState.collectedTrios[playerId].length}/3)`
    };
  }

  handleMismatch(gameState, mismatchCard, sourceInfo) {
    const currentTurn = gameState.currentTurn;
    const revealedCards = [...currentTurn.revealedCards, mismatchCard];
    
    // Store mismatch state - don't return cards yet
    gameState.mismatchState = {
      revealedCards: revealedCards,
      lastSourceInfo: sourceInfo,
      expectedNumber: currentTurn.targetNumber,
      actualNumber: mismatchCard.number,
      playersWhoSawMismatch: {}, // Track which players have dismissed the modal
      mismatchActive: true
    };
    
    // Initialize all players as needing to see the mismatch
    gameState.playerIds.forEach(playerId => {
      gameState.mismatchState.playersWhoSawMismatch[playerId] = false;
    });
    
    // End turn but keep cards revealed
    this.advanceToNextPlayer(gameState);
    
    return {
      success: true,
      actionType: 'mismatch',
      expectedNumber: currentTurn.targetNumber,
      actualNumber: mismatchCard.number,
      cardsReturned: 0, // Cards not returned yet
      message: `Mismatch! Expected ${currentTurn.targetNumber}, got ${mismatchCard.number}. Cards will be returned when all players acknowledge.`
    };
  }

  returnRevealedCards(gameState, revealedCards, lastSourceInfo) {
    // Return cards to their original sources
    revealedCards.forEach(card => {
      if (card.sourceType === 'middle' && typeof card.sourceIndex === 'number') {
        // Return to original middle pile position and mark as not revealed
        gameState.originalMiddlePile[card.sourceIndex] = {
          ...card,
          revealed: false
        };
        // Remove source info when returning
        delete gameState.originalMiddlePile[card.sourceIndex].sourceType;
        delete gameState.originalMiddlePile[card.sourceIndex].sourceIndex;
        delete gameState.originalMiddlePile[card.sourceIndex].sourcePlayerId;
        delete gameState.originalMiddlePile[card.sourceIndex].sourcePosition;
      } else if (card.sourceType === 'hand') {
        // Mark card as not revealed in player's hand (flip back to face-down)
        const targetPlayerId = card.sourcePlayerId;
        const handIndex = card.handIndex;
        if (gameState.playerHands[targetPlayerId] && typeof handIndex === 'number') {
          const handCard = gameState.playerHands[targetPlayerId][handIndex];
          if (handCard && handCard.revealed) {
            // Simply set revealed to false, keep the card in place
            gameState.playerHands[targetPlayerId][handIndex].revealed = false;
          }
        }
      }
    });
  }

  // Removed processEndTurn - turns end automatically on trio completion or mismatch

  advanceToNextPlayer(gameState) {
    gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.playerIds.length;
    gameState.currentPlayerId = gameState.playerIds[gameState.currentPlayerIndex];
    gameState.turnNumber++;
    
    // Reset turn state
    gameState.currentTurn = {
      playerId: gameState.currentPlayerId,
      revealedCards: [],
      targetNumber: null,
      phase: 'choosing'
    };
    
    gameState.lastActionAt = Date.now();
  }

  checkWinConditions(gameState, playerId) {
    const playerTrios = gameState.collectedTrios[playerId] || [];
    
    // Check for special 7 trio (instant win)
    const hasSevenTrio = playerTrios.some(trio => trio.number === 7);
    if (hasSevenTrio) {
      return {
        hasWon: true,
        reason: 'Special 7 trio collected!'
      };
    }
    
    // Simple mode: 3 trios wins
    if (gameState.gameMode === 'simple' && playerTrios.length >= 3) {
      return {
        hasWon: true,
        reason: '3 trios collected!'
      };
    }
    
    // TODO: Implement Spicy mode with connected trios
    
    return { hasWon: false };
  }

  checkEndConditions(gameState) {
    // Game ends when someone wins or no more moves possible
    if (gameState.status === 'ended') {
      return {
        ended: true,
        result: {
          winner: gameState.winner,
          reason: gameState.winReason,
          finalTrios: gameState.collectedTrios,
          totalTurns: gameState.turnNumber
        }
      };
    }
    
    // Check if game is stuck (no cards left anywhere)
    const handCards = Object.values(gameState.playerHands).reduce((sum, hand) => sum + hand.length, 0);
    const middleCards = gameState.originalMiddlePile.filter(card => card !== null).length;
    const totalCards = handCards + middleCards;
    
    if (totalCards === 0) {
      return {
        ended: true,
        result: {
          winner: null,
          reason: 'No more cards available',
          finalTrios: gameState.collectedTrios,
          totalTurns: gameState.turnNumber
        }
      };
    }
    
    return { ended: false };
  }

  getPlayerView(gameState, playerId) {
    // Create view that shows player's own hand but hides others
    const playerView = {
      ...gameState,
      playerHands: {}
    };
    
    // Show player's own hand, hide others (show only count, but reveal flipped cards)
    gameState.playerIds.forEach(pid => {
      if (pid === playerId) {
        playerView.playerHands[pid] = gameState.playerHands[pid];
      } else {
        const hand = gameState.playerHands[pid];
        playerView.playerHands[pid] = {
          cardCount: hand.length,
          hasCards: hand.length > 0,
          // Send exact position and value information for each card
          cards: hand.map((card, index) => ({
            position: index,
            revealed: !!card.revealed,
            number: card.revealed ? card.number : null,
            id: card.revealed ? card.id : null
          }))
        };
      }
    });
    
    // Include mismatch state if active (but only show if this player hasn't dismissed it yet)
    if (gameState.mismatchState && gameState.mismatchState.mismatchActive) {
      if (!gameState.mismatchState.playersWhoSawMismatch[playerId]) {
        // Player hasn't dismissed the mismatch yet, show them the revealed cards
        playerView.mismatchState = gameState.mismatchState;
      } else {
        // Player has dismissed, but keep showing revealed cards until all players dismiss
        playerView.mismatchState = {
          ...gameState.mismatchState,
          playerDismissed: true
        };
      }
    }
    
    return playerView;
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

  // Helper methods
  createTrioDeck() {
    const deck = [];
    let cardId = 1;
    
    // Create 3 copies of each number 1-12
    for (let number = 1; number <= 12; number++) {
      for (let copy = 1; copy <= 3; copy++) {
        deck.push({
          id: cardId++,
          number: number,
          copy: copy
        });
      }
    }
    
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

  getDealInfo(numPlayers) {
    const dealInfo = {
      3: { cardsPerPlayer: 9, middleCards: 9 },
      4: { cardsPerPlayer: 7, middleCards: 8 },
      5: { cardsPerPlayer: 6, middleCards: 6 },
      6: { cardsPerPlayer: 5, middleCards: 6 }
    };
    
    return dealInfo[numPlayers];
  }
}

module.exports = TrioGame; 