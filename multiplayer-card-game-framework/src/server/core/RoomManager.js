const Room = require('../../shared/Room');
const Player = require('../../shared/Player');

/**
 * Manages all game rooms and their lifecycle
 */
class RoomManager {
  constructor(config = {}) {
    this.rooms = new Map();
    this.config = {
      roomCleanupInterval: config.roomCleanupInterval || 30 * 60 * 1000, // 30 minutes
      reconnectionTimeout: config.reconnectionTimeout || 5 * 60 * 1000, // 5 minutes
      maxRooms: config.maxRooms || 1000,
      ...config
    };
    
    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Create a new room with a host player
   */
  createRoom(hostNickname, hostSocketId, roomConfig = {}) {
    if (!Player.isValidNickname(hostNickname)) {
      throw new Error('Invalid nickname');
    }

    if (this.rooms.size >= this.config.maxRooms) {
      throw new Error('Server is at maximum room capacity');
    }

    // Generate unique room code
    let roomCode;
    let attempts = 0;
    do {
      roomCode = Room.generateRoomCode();
      attempts++;
      if (attempts > 100) {
        throw new Error('Unable to generate unique room code');
      }
    } while (this.rooms.has(roomCode));

    // Create host player and room
    const hostPlayer = new Player(hostNickname, hostSocketId);
    const room = new Room(roomCode, hostPlayer, roomConfig);
    
    this.rooms.set(roomCode, room);
    
    return {
      room,
      hostPlayer
    };
  }

  /**
   * Join an existing room
   */
  joinRoom(roomCode, playerNickname, socketId) {
    if (!Player.isValidNickname(playerNickname)) {
      throw new Error('Invalid nickname');
    }

    const room = this.rooms.get(roomCode);
    if (!room) {
      throw new Error('Room not found');
    }

    // Check if nickname is already taken in this room
    const existingPlayer = Array.from(room.players.values())
      .find(p => p.nickname.toLowerCase() === playerNickname.toLowerCase());
    
    if (existingPlayer) {
      throw new Error('Nickname already taken in this room');
    }

    const player = new Player(playerNickname, socketId);
    room.addPlayer(player);
    
    return {
      room,
      player
    };
  }

  /**
   * Handle player reconnection
   */
  reconnectPlayer(roomCode, playerId, socketId) {
    const room = this.rooms.get(roomCode);
    if (!room) {
      throw new Error('Room not found');
    }

    const success = room.reconnectPlayer(playerId, socketId);
    if (!success) {
      throw new Error('Player not found in room or reconnection not allowed');
    }

    return {
      room,
      player: room.getPlayer(playerId)
    };
  }

  /**
   * Remove a player from a room
   */
  leaveRoom(roomCode, playerId) {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return false;
    }

    const removed = room.removePlayer(playerId);
    
    // Remove room if empty
    if (room.isEmpty()) {
      this.rooms.delete(roomCode);
    }
    
    return removed;
  }

  /**
   * Handle player disconnection
   */
  disconnectPlayer(roomCode, playerId) {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return false;
    }

    const disconnected = room.disconnectPlayer(playerId);
    
    // Remove room if empty (no connected players and no reconnection allowed)
    if (room.isEmpty()) {
      this.rooms.delete(roomCode);
    }
    
    return disconnected;
  }

  /**
   * Get a room by code
   */
  getRoom(roomCode) {
    return this.rooms.get(roomCode);
  }

  /**
   * Get all rooms (for admin purposes)
   */
  getAllRooms() {
    return Array.from(this.rooms.values());
  }

  /**
   * Get room statistics
   */
  getStats() {
    const rooms = Array.from(this.rooms.values());
    const totalPlayers = rooms.reduce((sum, room) => sum + room.players.size, 0);
    const activeGames = rooms.filter(room => room.gameState && room.gameState.status === 'playing').length;
    
    return {
      totalRooms: this.rooms.size,
      totalPlayers,
      activeGames,
      waitingRooms: this.rooms.size - activeGames
    };
  }

  /**
   * Clean up inactive rooms and disconnected players
   */
  cleanup() {
    const now = Date.now();
    const roomsToDelete = [];
    let cleanedPlayers = 0;
    
    this.rooms.forEach((room, roomCode) => {
      // Clean up disconnected players first
      const removedPlayers = room.cleanupDisconnectedPlayers();
      cleanedPlayers += removedPlayers.length;
      
      // Check if room should be deleted due to inactivity
      if (now - room.lastActivity > this.config.roomCleanupInterval) {
        roomsToDelete.push(roomCode);
      }
      
      // Check if room is empty
      if (room.isEmpty()) {
        roomsToDelete.push(roomCode);
      }
    });
    
    // Delete inactive/empty rooms
    roomsToDelete.forEach(roomCode => {
      this.rooms.delete(roomCode);
    });
    
    return {
      roomsDeleted: roomsToDelete.length,
      playersRemoved: cleanedPlayers
    };
  }

  /**
   * Start the cleanup interval
   */
  startCleanupInterval() {
    this.cleanupInterval = setInterval(() => {
      const result = this.cleanup();
      if (result.roomsDeleted > 0 || result.playersRemoved > 0) {
        console.log(`Room cleanup: ${result.roomsDeleted} rooms deleted, ${result.playersRemoved} players removed`);
      }
    }, 60000); // Check every minute
  }

  /**
   * Stop the cleanup interval
   */
  stopCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Shutdown the room manager
   */
  shutdown() {
    this.stopCleanupInterval();
    this.rooms.clear();
  }
}

module.exports = RoomManager; 