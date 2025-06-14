const path = require('path');

// Import the framework
const frameworkPath = path.join(__dirname, '../../multiplayer-card-game-framework/src/server');
const { GameServer } = require(frameworkPath);

// Import our Hanabi game implementation
const HanabiGame = require('./HanabiGame');

// Create and start the server
const hanabiGame = new HanabiGame();
const server = new GameServer(hanabiGame, {
  port: process.env.PORT || 3001,
  staticPath: path.join(__dirname, '../public'),
  corsOrigin: "*"
});

// Start the server
server.start();
console.log('🎆 Hanabi server is running!');
console.log('🎮 Game: Hanabi (Cooperative Fireworks)');
console.log(`🌐 Server: http://localhost:${server.config.port}`);
console.log('👥 Players: 2-5');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Hanabi server...');
  server.stop();
  console.log('✅ Server stopped gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down Hanabi server...');
  server.stop();
  console.log('✅ Server stopped gracefully');
  process.exit(0);
}); 