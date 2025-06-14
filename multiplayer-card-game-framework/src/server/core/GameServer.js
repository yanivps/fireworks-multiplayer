const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const RoomManager = require('./RoomManager');
const GameImplementation = require('../../shared/GameImplementation');

/**
 * Main game server that orchestrates multiplayer card games
 */
class GameServer {
  constructor(gameImplementation, options = {}) {
    if (!(gameImplementation instanceof GameImplementation)) {
      throw new Error('gameImplementation must extend GameImplementation');
    }

    this.gameImpl = gameImplementation;
    this.gameConfig = gameImplementation.getGameConfig();
    
    // Server configuration
    this.config = {
      port: options.port || 3000,
      staticPath: options.staticPath || null,
      corsOrigin: options.corsOrigin || "*",
      ...options
    };

    // Initialize components
    this.roomManager = new RoomManager({
      maxRooms: options.maxRooms || 1000,
      roomCleanupInterval: options.roomCleanupInterval,
      reconnectionTimeout: options.reconnectionTimeout,
      ...this.gameConfig
    });

    this.playerSockets = new Map(); // socketId -> { playerId, roomCode }
    
    // Initialize Express and Socket.IO
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: this.config.corsOrigin,
        methods: ["GET", "POST"]
      }
    });

    this.setupMiddleware();
    this.setupSocketHandlers();
  }

  /**
   * Setup Express middleware
   */
  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    
    // Serve static files if path provided
    if (this.config.staticPath) {
      this.app.use(express.static(this.config.staticPath));
    }

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      const stats = this.roomManager.getStats();
      res.json({
        status: 'healthy',
        game: this.gameConfig.name,
        version: this.gameConfig.version,
        ...stats
      });
    });

    // Game info endpoint
    this.app.get('/game-info', (req, res) => {
      res.json(this.gameConfig);
    });
  }

  /**
   * Setup Socket.IO event handlers
   */
  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Player connected: ${socket.id}`);

      // Create room
      socket.on('createRoom', (data) => {
        this.handleCreateRoom(socket, data);
      });

      // Join room
      socket.on('joinRoom', (data) => {
        this.handleJoinRoom(socket, data);
      });

      // Reconnect to room
      socket.on('reconnectToRoom', (data) => {
        this.handleReconnectToRoom(socket, data);
      });

      // Leave room
      socket.on('leaveRoom', () => {
        this.handleLeaveRoom(socket);
      });

      // Start game
      socket.on('startGame', (data) => {
        this.handleStartGame(socket, data);
      });

      // Game action
      socket.on('gameAction', (data) => {
        this.handleGameAction(socket, data);
      });

      // Disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  /**
   * Handle room creation
   */
  handleCreateRoom(socket, data) {
    try {
      const { nickname } = data;
      const { room, hostPlayer } = this.roomManager.createRoom(
        nickname, 
        socket.id, 
        this.gameConfig
      );

      // Join socket to room
      socket.join(room.code);
      
      // Track player socket
      this.playerSockets.set(socket.id, {
        playerId: hostPlayer.id,
        roomCode: room.code
      });

      // Send response
      socket.emit('roomCreated', {
        roomCode: room.code,
        playerId: hostPlayer.id,
        ...room.toClientData()
      });

      console.log(`Room created: ${room.code} by ${nickname}`);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  }

  /**
   * Handle joining a room
   */
  handleJoinRoom(socket, data) {
    try {
      const { roomCode, nickname } = data;
      const { room, player } = this.roomManager.joinRoom(roomCode, nickname, socket.id);

      // Join socket to room
      socket.join(room.code);
      
      // Track player socket
      this.playerSockets.set(socket.id, {
        playerId: player.id,
        roomCode: room.code
      });

      // Notify player
      socket.emit('roomJoined', {
        roomCode: room.code,
        playerId: player.id,
        ...room.toClientData()
      });

      // Notify other players
      socket.to(room.code).emit('playerJoined', {
        player: player.toClientData(),
        room: room.toClientData()
      });

      console.log(`${nickname} joined room ${room.code}`);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  }

  /**
   * Handle reconnection to a room
   */
  handleReconnectToRoom(socket, data) {
    try {
      const { roomCode, playerId } = data;
      const { room, player } = this.roomManager.reconnectPlayer(roomCode, playerId, socket.id);

      // Join socket to room
      socket.join(room.code);
      
      // Track player socket
      this.playerSockets.set(socket.id, {
        playerId: player.id,
        roomCode: room.code
      });

      // Send current game state
      const gameState = room.gameState ? 
        this.gameImpl.getPlayerView(room.gameState, player.id) : null;

      socket.emit('reconnected', {
        roomCode: room.code,
        playerId: player.id,
        room: room.toClientData(),
        gameState
      });

      // Notify other players
      socket.to(room.code).emit('playerReconnected', {
        player: player.toClientData()
      });

      // Handle game-specific reconnection logic
      if (room.gameState && room.gameState.status === 'playing') {
        const reconnectionResult = this.gameImpl.handlePlayerReconnection(room.gameState, player.id);
        if (reconnectionResult.shouldResume && room.gameState.status === 'paused') {
          room.gameState.status = 'playing';
          this.broadcastGameState(room);
        }
      }

      console.log(`${player.nickname} reconnected to room ${room.code}`);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  }

  /**
   * Handle leaving a room
   */
  handleLeaveRoom(socket) {
    const playerInfo = this.playerSockets.get(socket.id);
    if (!playerInfo) return;

    const { playerId, roomCode } = playerInfo;
    const room = this.roomManager.getRoom(roomCode);
    
    if (room) {
      const player = room.getPlayer(playerId);
      if (player) {
        // Remove player from room
        this.roomManager.leaveRoom(roomCode, playerId);
        
        // Leave socket room
        socket.leave(roomCode);
        
        // Notify other players
        socket.to(roomCode).emit('playerLeft', {
          playerId: playerId,
          nickname: player.nickname,
          room: room.toClientData()
        });

        console.log(`${player.nickname} left room ${roomCode}`);
      }
    }

    // Clean up socket tracking
    this.playerSockets.delete(socket.id);
  }

  /**
   * Handle game start
   */
  handleStartGame(socket, data) {
    try {
      const playerInfo = this.playerSockets.get(socket.id);
      if (!playerInfo) {
        socket.emit('error', { message: 'Not in a room' });
        return;
      }

      const room = this.roomManager.getRoom(playerInfo.roomCode);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      const player = room.getPlayer(playerInfo.playerId);
      if (!player || !player.isHost) {
        socket.emit('error', { message: 'Only the host can start the game' });
        return;
      }

      if (!room.canStartGame()) {
        socket.emit('error', { message: 'Cannot start game with current player count' });
        return;
      }

      // Create initial game state
      const playerIds = room.getConnectedPlayers().map(p => p.id);
      room.gameState = this.gameImpl.createInitialState(playerIds, data.gameConfig || {});

      // Broadcast game started
      this.broadcastGameState(room);

      console.log(`Game started in room ${room.code}`);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  }

  /**
   * Handle game actions
   */
  handleGameAction(socket, data) {
    try {
      const playerInfo = this.playerSockets.get(socket.id);
      if (!playerInfo) {
        socket.emit('error', { message: 'Not in a room' });
        return;
      }

      const room = this.roomManager.getRoom(playerInfo.roomCode);
      if (!room || !room.gameState) {
        socket.emit('error', { message: 'No active game' });
        return;
      }

      // Validate action
      const validation = this.gameImpl.validateAction(data.action, room.gameState, playerInfo.playerId);
      if (!validation.valid) {
        socket.emit('actionError', { message: validation.error });
        return;
      }

      // Process action
      const result = this.gameImpl.processAction(data.action, room.gameState, playerInfo.playerId);
      
      // Check for game end
      const endCheck = this.gameImpl.checkEndConditions(room.gameState);
      if (endCheck.ended) {
        room.gameState.status = 'ended';
        room.gameState.result = this.gameImpl.calculateFinalResult(room.gameState);
      }

      // Broadcast updated game state
      this.broadcastGameState(room, result);

    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  }

  /**
   * Handle player disconnection
   */
  handleDisconnect(socket) {
    const playerInfo = this.playerSockets.get(socket.id);
    if (!playerInfo) return;

    const { playerId, roomCode } = playerInfo;
    const room = this.roomManager.getRoom(roomCode);
    
    if (room) {
      const player = room.getPlayer(playerId);
      if (player) {
        // Mark as disconnected
        this.roomManager.disconnectPlayer(roomCode, playerId);
        
        // Handle game-specific disconnection logic
        if (room.gameState && room.gameState.status === 'playing') {
          const disconnectionResult = this.gameImpl.handlePlayerDisconnection(room.gameState, playerId);
          if (disconnectionResult.shouldEnd) {
            room.gameState.status = 'ended';
            room.gameState.result = { reason: 'Player disconnection' };
          } else if (disconnectionResult.shouldPause) {
            room.gameState.status = 'paused';
          }
          this.broadcastGameState(room);
        }

        // Notify other players
        socket.to(roomCode).emit('playerDisconnected', {
          playerId: playerId,
          nickname: player.nickname
        });

        console.log(`${player.nickname} disconnected from room ${roomCode}`);
      }
    }

    // Clean up socket tracking
    this.playerSockets.delete(socket.id);
  }

  /**
   * Broadcast game state to all players in a room
   */
  broadcastGameState(room, actionResult = null) {
    room.getAllPlayers().forEach(player => {
      if (player.connected && player.socketId) {
        const playerView = this.gameImpl.getPlayerView(room.gameState, player.id);
        this.io.to(player.socketId).emit('gameStateUpdate', {
          gameState: playerView,
          actionResult,
          room: room.toClientData()
        });
      }
    });
  }

  /**
   * Start the server
   */
  start(port = null) {
    const serverPort = port || this.config.port;
    
    this.server.listen(serverPort, () => {
      console.log(`${this.gameConfig.name} server running on port ${serverPort}`);
      console.log(`Game: ${this.gameConfig.name} v${this.gameConfig.version}`);
      console.log(`Players: ${this.gameConfig.minPlayers}-${this.gameConfig.maxPlayers}`);
    });

    return this.server;
  }

  /**
   * Stop the server
   */
  stop() {
    this.roomManager.shutdown();
    this.server.close();
  }
}

module.exports = GameServer; 