const Player = require('./Player');

/**
 * Represents a game room that contains players and manages game sessions
 */
class Room {
  constructor(code, hostPlayer, config = {}) {
    this.code = code;
    this.players = new Map();
    this.gameState = null;
    this.createdAt = Date.now();
    this.lastActivity = Date.now();
    this.disconnectedPlayers = new Map(); // playerId -> disconnection timestamp
    
    // Room configuration
    this.config = {
      maxPlayers: config.maxPlayers || 5,
      minPlayers: config.minPlayers || 2,
      allowReconnection: config.allowReconnection !== false,
      reconnectionTimeout: config.reconnectionTimeout || 5 * 60 * 1000, // 5 minutes
      ...config
    };
    
    // Add host player
    hostPlayer.isHost = true;
    this.players.set(hostPlayer.id, hostPlayer);
    this.hostId = hostPlayer.id;
  }

  /**
   * Add a player to the room
   */
  addPlayer(player) {
    if (this.players.size >= this.config.maxPlayers) {
      throw new Error('Room is full');
    }
    
    if (this.gameState && this.gameState.status === 'playing') {
      throw new Error('Cannot join room while game is in progress');
    }
    
    this.players.set(player.id, player);
    this.updateActivity();
    return true;
  }

  /**
   * Remove a player from the room
   */
  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (!player) return false;
    
    this.players.delete(playerId);
    this.disconnectedPlayers.delete(playerId);
    
    // Transfer host if necessary
    if (player.isHost && this.players.size > 0) {
      this.transferHost();
    }
    
    this.updateActivity();
    return true;
  }

  /**
   * Mark a player as disconnected but keep them in the room for potential reconnection
   */
  disconnectPlayer(playerId) {
    const player = this.players.get(playerId);
    if (!player) return false;
    
    player.disconnect();
    
    if (this.config.allowReconnection) {
      this.disconnectedPlayers.set(playerId, Date.now());
    } else {
      this.removePlayer(playerId);
    }
    
    this.updateActivity();
    return true;
  }

  /**
   * Reconnect a player to the room
   */
  reconnectPlayer(playerId, socketId) {
    const player = this.players.get(playerId);
    if (!player) return false;
    
    player.updateSocket(socketId);
    this.disconnectedPlayers.delete(playerId);
    this.updateActivity();
    return true;
  }

  /**
   * Get a player by ID
   */
  getPlayer(playerId) {
    return this.players.get(playerId);
  }

  /**
   * Get all connected players
   */
  getConnectedPlayers() {
    return Array.from(this.players.values()).filter(p => p.connected);
  }

  /**
   * Get all players as array
   */
  getAllPlayers() {
    return Array.from(this.players.values());
  }

  /**
   * Transfer host to another connected player
   */
  transferHost() {
    const connectedPlayers = this.getConnectedPlayers();
    if (connectedPlayers.length === 0) return null;
    
    // Remove host status from all players
    this.players.forEach(player => player.isHost = false);
    
    // Make first connected player the new host
    const newHost = connectedPlayers[0];
    newHost.isHost = true;
    this.hostId = newHost.id;
    
    return newHost;
  }

  /**
   * Check if room can start a game
   */
  canStartGame() {
    const connectedCount = this.getConnectedPlayers().length;
    return connectedCount >= this.config.minPlayers && 
           connectedCount <= this.config.maxPlayers &&
           (!this.gameState || this.gameState.status !== 'playing');
  }

  /**
   * Check if room is empty
   */
  isEmpty() {
    return this.players.size === 0;
  }

  /**
   * Update room activity timestamp
   */
  updateActivity() {
    this.lastActivity = Date.now();
  }

  /**
   * Clean up disconnected players who have exceeded reconnection timeout
   */
  cleanupDisconnectedPlayers() {
    const now = Date.now();
    const playersToRemove = [];
    
    this.disconnectedPlayers.forEach((disconnectTime, playerId) => {
      if (now - disconnectTime > this.config.reconnectionTimeout) {
        playersToRemove.push(playerId);
      }
    });
    
    playersToRemove.forEach(playerId => {
      this.removePlayer(playerId);
    });
    
    return playersToRemove;
  }

  /**
   * Get room data safe for client consumption
   */
  toClientData() {
    return {
      code: this.code,
      players: this.getAllPlayers().map(p => p.toClientData()),
      gameStatus: this.gameState ? this.gameState.status : 'waiting',
      config: {
        maxPlayers: this.config.maxPlayers,
        minPlayers: this.config.minPlayers
      },
      createdAt: this.createdAt
    };
  }

  /**
   * Generate a unique room code
   */
  static generateRoomCode() {
    // return "AAAAAA";
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
}

module.exports = Room; 