const { GameServer } = require('../src/server');
const SimpleCardGame = require('./SimpleCardGame');
const path = require('path');

// Create game implementation
const gameImpl = new SimpleCardGame();

// Create server with configuration
const server = new GameServer(gameImpl, {
  port: 3001,
  staticPath: path.join(__dirname, 'public'), // Serve static files from public directory
  corsOrigin: "*",
  maxRooms: 100,
  roomCleanupInterval: 30 * 60 * 1000, // 30 minutes
  reconnectionTimeout: 5 * 60 * 1000    // 5 minutes
});

// Start the server
server.start();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down server...');
  server.stop();
  process.exit(0);
}); 