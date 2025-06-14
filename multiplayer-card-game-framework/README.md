# Multiplayer Card Game Framework

A reusable Node.js framework for building online multiplayer turn-based card games with real-time communication via Socket.IO.

## Features

- **Room Management**: Create, join, and manage game rooms with automatic cleanup
- **Player Management**: Handle connections, disconnections, and reconnections
- **Turn-Based Game Flow**: Built-in turn management system
- **Real-time Communication**: Socket.IO integration for instant updates
- **Game State Management**: Automatic state synchronization across clients
- **Extensible Architecture**: Plugin-based system for different card games
- **Player View Filtering**: Hide private information from other players
- **Reconnection Support**: Players can reconnect to ongoing games
- **Health Monitoring**: Built-in health check and statistics endpoints

## Installation

```bash
npm install multiplayer-card-game-framework
```

## Quick Start

### 1. Create Your Game Implementation

```javascript
const { GameImplementation } = require('multiplayer-card-game-framework');

class MyCardGame extends GameImplementation {
  getGameConfig() {
    return {
      minPlayers: 2,
      maxPlayers: 4,
      name: 'My Card Game',
      version: '1.0.0'
    };
  }

  createInitialState(playerIds, gameConfig = {}) {
    // Initialize your game state
    return {
      status: 'playing',
      playerIds: [...playerIds],
      currentPlayerIndex: 0,
      currentPlayerId: playerIds[0],
      // ... your game-specific state
    };
  }

  validateAction(action, gameState, playerId) {
    // Validate if the action is legal
    if (gameState.currentPlayerId !== playerId) {
      return { valid: false, error: 'Not your turn' };
    }
    // ... your validation logic
    return { valid: true };
  }

  processAction(action, gameState, playerId) {
    // Process the action and update game state
    // ... your game logic
    return { action: action.type, playerId, message: 'Action processed' };
  }

  checkEndConditions(gameState) {
    // Check if game should end
    // ... your end condition logic
    return { ended: false };
  }

  getPlayerView(gameState, playerId) {
    // Return player-specific view (hide private information)
    return gameState; // or filtered version
  }
}
```

### 2. Create Your Server

```javascript
const { GameServer } = require('multiplayer-card-game-framework');
const MyCardGame = require('./MyCardGame');

const gameImpl = new MyCardGame();
const server = new GameServer(gameImpl, {
  port: 3000,
  staticPath: './public', // Optional: serve static files
  corsOrigin: "*"
});

server.start();
```

### 3. Connect from Client

```javascript
const socket = io();

// Create a room
socket.emit('createRoom', { nickname: 'Player1' });

// Join a room
socket.emit('joinRoom', { roomCode: 'ABC123', nickname: 'Player2' });

// Start game (host only)
socket.emit('startGame', { gameConfig: {} });

// Send game action
socket.emit('gameAction', { 
  action: { type: 'drawCard' } 
});

// Listen for updates
socket.on('gameStateUpdate', (data) => {
  console.log('Game state:', data.gameState);
  console.log('Action result:', data.actionResult);
});
```

## API Reference

### GameImplementation (Abstract Class)

Your game must extend this class and implement the required methods:

#### Required Methods

- `createInitialState(playerIds, gameConfig)` - Create initial game state
- `validateAction(action, gameState, playerId)` - Validate player actions
- `processAction(action, gameState, playerId)` - Process valid actions
- `checkEndConditions(gameState)` - Check if game should end

#### Optional Methods

- `getGameConfig()` - Return game configuration
- `getPlayerView(gameState, playerId)` - Filter state for specific player
- `handlePlayerDisconnection(gameState, playerId)` - Handle disconnections
- `handlePlayerReconnection(gameState, playerId)` - Handle reconnections
- `calculateFinalResult(gameState)` - Calculate final game result

### GameServer

Main server class that orchestrates the multiplayer game.

```javascript
const server = new GameServer(gameImplementation, options);
```

#### Options

- `port` - Server port (default: 3000)
- `staticPath` - Path to static files directory
- `corsOrigin` - CORS origin setting (default: "*")
- `maxRooms` - Maximum number of rooms (default: 1000)
- `roomCleanupInterval` - Room cleanup interval in ms
- `reconnectionTimeout` - Player reconnection timeout in ms

### Socket Events

#### Client → Server

- `createRoom` - Create a new game room
- `joinRoom` - Join an existing room
- `reconnectToRoom` - Reconnect to a room
- `leaveRoom` - Leave current room
- `startGame` - Start the game (host only)
- `gameAction` - Send a game action

#### Server → Client

- `roomCreated` - Room successfully created
- `roomJoined` - Successfully joined room
- `playerJoined` - Another player joined
- `playerLeft` - Player left the room
- `gameStateUpdate` - Game state changed
- `error` - Error occurred
- `actionError` - Invalid action attempted

## Example Games

### Simple Card Game

See `examples/SimpleCardGame.js` for a complete example of a simple card drawing game.

### Running the Example

```bash
cd examples
node basic-server.js
```

Then open `http://localhost:3000` in your browser.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Game Client   │◄──►│   GameServer     │◄──►│ GameImplementation │
│   (Browser)     │    │                  │    │   (Your Game)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   RoomManager    │
                       │                  │
                       │ ┌──────────────┐ │
                       │ │    Room      │ │
                       │ │              │ │
                       │ │ ┌──────────┐ │ │
                       │ │ │ Player   │ │ │
                       │ │ │ Player   │ │ │
                       │ │ │ Player   │ │ │
                       │ │ └──────────┘ │ │
                       │ └──────────────┘ │
                       └──────────────────┘
```

## Development

### Running Tests

```bash
npm test
```

### Development Mode

```bash
npm run dev
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details.

## Roadmap

- [ ] Client-side framework components
- [ ] Database persistence layer
- [ ] Spectator mode
- [ ] Tournament system
- [ ] Admin dashboard
- [ ] Game replay system
- [ ] AI player support 