# Multiplayer Card Games Project

This project contains a reusable framework for building online multiplayer turn-based card games, along with implementations of specific games.

## 🏗️ Project Structure

```
├── multiplayer-card-game-framework/    # Reusable framework for multiplayer card games
├── hanabi/                            # Hanabi card game implementation
├── war/                               # War card game implementation
└── README.md                          # This file
```

## 🎮 Games

### Hanabi
A cooperative card game where players work together to create fireworks displays. Features:
- 2-5 players
- Cooperative gameplay
- Hidden information mechanics
- Clue system with visual feedback
- Real-time multiplayer with reconnection support

**Status**: ✅ Fully implemented and playable

### War
A classic two-player card game where players battle with cards from their deck.

**Status**: 🚧 Framework integration complete, game rules implementation pending

## 🔧 Framework

The `multiplayer-card-game-framework` provides reusable infrastructure for building online multiplayer card games:

- **Room Management**: Create, join, and manage game rooms
- **Player Management**: Handle connections, disconnections, and reconnections  
- **Turn-Based Flow**: Built-in turn management system
- **Real-time Communication**: Socket.IO integration
- **Game State Sync**: Automatic state synchronization across clients
- **Extensible Architecture**: Plugin-based system for different games

### Framework Features

- ✅ Room creation and joining with unique codes
- ✅ Player connection/disconnection handling
- ✅ Host management and transfer
- ✅ Turn-based game orchestration
- ✅ Action validation and processing
- ✅ Game state broadcasting
- ✅ Reconnection support
- ✅ Health monitoring endpoints
- ✅ Automatic room cleanup

## 🚀 Quick Start

### Running Hanabi
```bash
cd hanabi
npm install
npm start
# Visit http://localhost:3000
```

### Running War
```bash
cd war
npm install
npm start
# Visit http://localhost:3002
```

### Using the Framework
```bash
cd multiplayer-card-game-framework
npm install
node examples/basic-server.js
# Visit http://localhost:3001
```

## 🛠️ Development

### Creating a New Game

1. Create a new directory for your game
2. Install dependencies and reference the framework
3. Extend `GameImplementation` class:

```javascript
const { GameImplementation } = require('../multiplayer-card-game-framework/src/shared/GameImplementation');

class MyCardGame extends GameImplementation {
  getGameConfig() {
    return {
      minPlayers: 2,
      maxPlayers: 4,
      name: 'My Card Game',
      version: '1.0.0'
    };
  }

  createInitialState(playerIds) {
    // Initialize your game state
  }

  validateAction(action, gameState, playerId) {
    // Validate player actions
  }

  processAction(action, gameState, playerId) {
    // Process valid actions
  }

  checkEndConditions(gameState) {
    // Check if game should end
  }
}
```

4. Create server using the framework:

```javascript
const { GameServer } = require('../multiplayer-card-game-framework/src/server');
const MyCardGame = require('./MyCardGame');

const server = new GameServer(new MyCardGame(), { port: 3003 });
server.start();
```

### Framework Architecture

The framework separates concerns into distinct layers:

- **Shared Models**: `Player`, `Room`, `GameImplementation`
- **Server Core**: `GameServer`, `RoomManager`
- **Game Logic**: Implemented by extending `GameImplementation`
- **Client Integration**: Standardized Socket.IO events

## 📊 Benefits

- **🔄 Reusability**: Core multiplayer logic works for any turn-based card game
- **🧪 Testability**: Framework components can be unit tested independently
- **🛠️ Maintainability**: Bug fixes in framework benefit all games
- **⚡ Rapid Development**: New games focus on game logic, not infrastructure
- **📈 Scalability**: Built-in room management and cleanup
- **🔌 Extensibility**: Plugin architecture for game-specific features

## 🎯 Roadmap

- [ ] Complete War game implementation
- [ ] Client-side framework components
- [ ] Database persistence layer
- [ ] Spectator mode
- [ ] Tournament system
- [ ] Admin dashboard
- [ ] Game replay system
- [ ] AI player support
- [ ] Publish framework as npm package

## 📝 License

MIT License - see individual project directories for details. 