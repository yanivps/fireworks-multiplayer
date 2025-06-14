const path = require('path');

// Import the framework
const frameworkPath = path.join(__dirname, '../../multiplayer-card-game-framework/src/server');
const { GameServer } = require(frameworkPath);

// Import the Trio game implementation
const TrioGame = require('./TrioGame');

// Create server instance
const trioGame = new TrioGame();
const server = new GameServer(trioGame, {
  port: 3002, // Different port from other games
  staticPath: path.join(__dirname, '../public'),
  corsOrigin: "*"
});

// Start server
server.start();

console.log('🃏 Trio server is running!');
console.log('🎮 Game: Trio (Strategic Card Collection)');
console.log('🌐 Server: http://localhost:3002');
console.log('👥 Players: 3-6');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Trio server...');
  server.stop();
  console.log('✅ Server stopped gracefully');
  process.exit(0);
}); 