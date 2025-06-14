const path = require('path');

// Import the framework from the relative path
// In a real project, this would be: require('multiplayer-card-game-framework')
const frameworkPath = path.join(__dirname, '../../multiplayer-card-game-framework/src/server');
const { GameServer } = require(frameworkPath);

const WarGame = require('./WarGame');

// Create game implementation
const gameImpl = new WarGame();

// Create server with configuration
const server = new GameServer(gameImpl, {
  port: 3002,
  staticPath: path.join(__dirname, '../public'),
  corsOrigin: "*",
  maxRooms: 50,
  roomCleanupInterval: 30 * 60 * 1000, // 30 minutes
  reconnectionTimeout: 5 * 60 * 1000    // 5 minutes
});

// Start the server
server.start();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down War game server...');
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down War game server...');
  server.stop();
  process.exit(0);
}); 