# Hanabi Online

A real-time multiplayer implementation of the cooperative card game Hanabi, built with Node.js, Express, and Socket.IO.

## 🎯 Current Status

### ✅ Completed Features

#### Backend/Server Setup
- ✅ Node.js/Express server with Socket.IO for real-time multiplayer
- ✅ Room management system with unique 6-character room codes
- ✅ Player connection/disconnection handling with 5-minute reconnection grace period
- ✅ Automatic 30-minute inactivity room cleanup
- ✅ Host transfer when original host disconnects

#### Game State Management
- ✅ Complete Hanabi deck generation (5 colors, proper card distribution)
- ✅ Random card dealing with correct hand sizes (5 cards for 2-3 players, 4 cards for 4-5 players)
- ✅ Turn management system with fixed turn order
- ✅ Clue token management (start with 8, max 8)
- ✅ Fuse token management (start with 3, max 3)
- ✅ Fireworks pile state tracking for all 5 colors

#### Game Actions
- ✅ **Play Card**: Validate and execute card plays, handle invalid plays (lose fuse token)
- ✅ **Discard Card**: Remove card from hand, gain clue token, draw replacement
- ✅ **Give Clue**: Color and number clues with validation and highlighting

#### Game End Conditions & Scoring
- ✅ **Perfect Score Detection**: Automatic win when all fireworks completed (25 points)
- ✅ **Fuse Token Loss**: Game ends when all 3 fuse tokens are lost
- ✅ **Deck Exhaustion**: Final round system when deck runs out
- ✅ **Player Disconnection**: 5-minute timeout handling
- ✅ **Score Rating System**: 9-tier rating system from "Terrible" to "Legendary"
- ✅ **Game Summary**: Detailed statistics and fireworks progress
- ✅ **Play Again**: Host can restart with same players

#### Basic Frontend
- ✅ Room creation and joining interface
- ✅ Real-time player list with host indicator
- ✅ Game start functionality (host only)
- ✅ Basic game board with fireworks piles, token displays, and player hands
- ✅ Card interaction (play/discard) with turn validation
- ✅ Visual distinction between own cards (hidden) and others' cards (visible)

#### Enhanced Lobby System (NEW!)
- ✅ **Real-time Synchronization**: Player lists update instantly across all clients
- ✅ **Host Transfer**: Automatic host reassignment with immediate UI updates
- ✅ **Connection Status**: Visual indicators for online/offline players
- ✅ **Smart Validation**: Real-time player count validation (2-5 players)
- ✅ **Modern UI**: Card-based layout with hover effects and animations
- ✅ **Room Code Sharing**: One-click copy functionality
- ✅ **Keyboard Navigation**: Full Enter key support for all forms
- ✅ **Session Persistence**: Better handling of page refreshes

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd hanabi

# Install dependencies
npm install

# Start the server
npm start
```

The server will start on `http://localhost:3000`

### Testing
```bash
# Run game logic tests
node test/gameLogic.test.js

# Check server health
curl http://localhost:3000/health
```

## 🎮 How to Play

1. **Create or Join Room**: One player creates a room and shares the room code with others
2. **Start Game**: Host clicks "Start Game" when 2-5 players have joined
3. **Take Turns**: Players take turns performing one of three actions:
   - **Play Card**: Click a card in your hand and choose "Play" (1)
   - **Discard Card**: Click a card in your hand and choose "Discard" (2)
   - **Give Clue**: (Not yet implemented in UI)

### Game Rules
- **Objective**: Build fireworks piles from 1 to 5 in each color
- **Your Hand**: You can see other players' cards but not your own
- **Clue Tokens**: Start with 8, use 1 to give clues, gain 1 when discarding
- **Fuse Tokens**: Start with 3, lose 1 for invalid plays, game ends at 0
- **Winning**: Complete all 5 fireworks (score 25) or get the highest score when deck runs out

## 🏗️ Architecture

### Backend Structure
```
server.js           # Main server with Socket.IO handlers
game/
  ├── gameState.js  # Core game state management
  └── gameActions.js # Game action handlers (play, discard, clue)
test/
  └── gameLogic.test.js # Game logic tests
```

### Key Components
- **Room Management**: Unique codes, player tracking, host transfer
- **Game State**: Deck generation, hand management, turn tracking
- **Action System**: Validated game actions with real-time updates
- **Connection Handling**: Reconnection support, cleanup systems

## 🔄 Real-time Communication

### Socket Events
- `createRoom` / `joinRoom` - Room management
- `startGame` - Initialize game state
- `playCard` / `discardCard` / `giveClue` - Game actions
- `gameStarted` / `actionResult` - Game state updates

## 🧪 Testing

The game includes comprehensive tests for:
- Game state creation and validation
- Card playing (valid and invalid)
- Discard and clue actions
- Turn management
- Token systems

## 📋 Next Steps

See `todo.md` for the complete roadmap. Key upcoming features:
- Complete clue giving UI
- Enhanced game board layout
- Game end conditions and scoring
- Better visual feedback and animations
- Mobile responsiveness

## 🎯 Game Rules Reference

### Card Distribution (per color)
- **1**: 3 copies
- **2**: 2 copies  
- **3**: 2 copies
- **4**: 2 copies
- **5**: 1 copy

### Hand Sizes
- **2-3 players**: 5 cards each
- **4-5 players**: 4 cards each

### Tokens
- **Clue Tokens**: Start with 8, max 8
- **Fuse Tokens**: Start with 3, game ends at 0

---

Built with ❤️ for the Hanabi community 