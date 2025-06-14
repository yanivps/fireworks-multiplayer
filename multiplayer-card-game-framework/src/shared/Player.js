const { v4: uuidv4 } = require('uuid');

/**
 * Represents a player in a multiplayer card game
 */
class Player {
  constructor(nickname, socketId = null) {
    this.id = uuidv4();
    this.nickname = nickname.trim();
    this.socketId = socketId;
    this.isHost = false;
    this.connected = true;
    this.joinedAt = Date.now();
    this.lastActivity = Date.now();
    
    // Game-specific data can be stored here
    this.gameData = {};
  }

  /**
   * Update the player's socket connection
   */
  updateSocket(socketId) {
    this.socketId = socketId;
    this.connected = true;
    this.lastActivity = Date.now();
  }

  /**
   * Mark player as disconnected
   */
  disconnect() {
    this.connected = false;
    this.socketId = null;
    this.lastActivity = Date.now();
  }

  /**
   * Update player's last activity timestamp
   */
  updateActivity() {
    this.lastActivity = Date.now();
  }

  /**
   * Set or update game-specific data for this player
   */
  setGameData(key, value) {
    this.gameData[key] = value;
  }

  /**
   * Get game-specific data for this player
   */
  getGameData(key) {
    return this.gameData[key];
  }

  /**
   * Get a safe representation of the player for client-side use
   */
  toClientData() {
    return {
      id: this.id,
      nickname: this.nickname,
      isHost: this.isHost,
      connected: this.connected,
      joinedAt: this.joinedAt
    };
  }

  /**
   * Validate nickname format
   */
  static isValidNickname(nickname) {
    return nickname && 
           typeof nickname === 'string' && 
           nickname.trim().length > 0 && 
           nickname.trim().length <= 20 &&
           /^[a-zA-Z0-9_\-\s]+$/.test(nickname.trim());
  }
}

module.exports = Player; 