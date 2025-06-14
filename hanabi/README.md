# Hanabi Card Game

A cooperative multiplayer card game implementation using the **Multiplayer Card Game Framework**.

## About Hanabi

Hanabi is a cooperative card game where players work together to build perfect fireworks displays. The unique challenge is that you can see everyone else's cards but not your own! Players must give each other clues about colors and numbers to help build sequences of cards (1-5) in each of the five colors.

## New Framework Architecture

This implementation has been **migrated to use the Multiplayer Card Game Framework**, providing:

- ✅ **Robust multiplayer infrastructure**
- ✅ **Standardized room management**  
- ✅ **Player reconnection handling**
- ✅ **Consistent game state management**
- ✅ **Framework-based action validation**
- ✅ **Scalable server architecture**

### Key Changes

1. **Server Architecture**: Now uses `GameServer` from the framework with `HanabiGame` implementation
2. **Game Logic**: Encapsulated in `HanabiGame` class extending `GameImplementation`
3. **Communication**: Standardized events (`gameAction`, `gameStateUpdate`)
4. **Error Handling**: Framework-provided validation and error responses

## Quick Start

### Prerequisites

Make sure the **Multiplayer Card Game Framework** is set up:

```bash
cd ../multiplayer-card-game-framework
npm install
```

### Install and Run

```bash
# Install dependencies
npm install

# Start the game server
npm start

# Or run in development mode
npm run dev
```

The server will start on **http://localhost:3001** (different from the original port to avoid conflicts).

## Game Rules

- **Players**: 2-5
- **Objective**: Build fireworks by playing cards in sequence (1→2→3→4→5) for each color
- **Challenge**: You can't see your own cards!
- **Actions**: Play card, Discard card, Give clue
- **Tokens**: 8 clue tokens, 3 fuse tokens
- **Scoring**: 0-25 points based on cards successfully played

### How to Play

1. **Create/Join Room**: Use the lobby interface
2. **Give Clues**: Click "Give Clue" → Select color/number → Click target cards
3. **Play Cards**: Click "Play Card" → Click a card from your hand
4. **Discard Cards**: Click "Discard" → Click a card (gains clue token)

## File Structure

```
hanabi/
├── src/
│   ├── HanabiGame.js      # Game implementation (extends GameImplementation)
│   └── server.js          # Framework-based server
├── public/                # Client files (HTML, CSS, JS)
├── game/                  # Original game logic (reused)
├── package.json           # Project dependencies
├── server-old.js          # Original server (backup)
└── README.md             # This file
```

## Framework Integration

### HanabiGame Class

The `HanabiGame` class implements all required framework methods:

- `createInitialState()` - Set up game with deck, hands, tokens
- `validateAction()` - Check if actions are legal
- `processAction()` - Execute plays, discards, and clues
- `checkEndConditions()` - Perfect score, deck empty, or fuse tokens lost
- `getPlayerView()` - Hide player's own cards
- `calculateFinalResult()` - Score and rating

### Client Communication

Actions are sent using the standardized format:
```javascript
socket.emit('gameAction', {
  action: {
    type: 'play',        // 'play', 'discard', or 'clue'
    cardIndex: 0,        // For play/discard
    targetPlayerId: '..', // For clues
    clueType: 'color',   // 'color' or 'number'
    clueValue: 'red'     // Color name or number
  }
});
```

Game updates arrive via:
```javascript
socket.on('gameStateUpdate', (data) => {
  // data.gameState - Current game state
  // data.actionResult - Result of last action
});
```

## Migration Benefits

1. **Reliability**: Framework handles edge cases and connection issues
2. **Consistency**: Same patterns as other framework games
3. **Maintainability**: Separation of game logic from server infrastructure
4. **Extensibility**: Easy to add features using framework capabilities
5. **Testing**: Framework provides testing utilities

## Compatibility

- **Original Game Logic**: Preserved and reused from `game/` directory
- **Client Interface**: Updated to use framework events, UI unchanged
- **Save Games**: Not yet implemented (framework feature available)

## Development

The game logic is split between:
- **Framework**: Room management, networking, infrastructure
- **HanabiGame**: Game-specific rules, actions, and state management
- **Client**: UI and user interactions

This provides a clean separation of concerns and makes the codebase much more maintainable.

---

🎆 **Enjoy building beautiful fireworks together!** 🎆 