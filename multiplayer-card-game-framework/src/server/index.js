// Main server framework exports
const GameServer = require('./core/GameServer');
const RoomManager = require('./core/RoomManager');

// Shared models and interfaces
const GameImplementation = require('../shared/GameImplementation');
const Player = require('../shared/Player');
const Room = require('../shared/Room');

module.exports = {
  // Main server class
  GameServer,
  
  // Core components
  RoomManager,
  
  // Shared models
  GameImplementation,
  Player,
  Room
}; 