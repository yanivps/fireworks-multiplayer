const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Import game logic
const gameState = require('./game/gameState');
const gameActions = require('./game/gameActions');
const gameEndConditions = require('./game/gameEndConditions');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage for rooms and players
const rooms = new Map();
const playerSockets = new Map(); // socketId -> playerId mapping

// Room cleanup interval (30 minutes)
const ROOM_CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutes
const RECONNECTION_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Generate unique room code
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Room structure
function createRoom(hostSocketId, hostNickname) {
  const roomCode = generateRoomCode();
  const hostId = uuidv4();
  
  const room = {
    code: roomCode,
    hostId: hostId,
    players: new Map(),
    gameState: null,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    disconnectedPlayers: new Map() // playerId -> disconnection timestamp
  };
  
  // Add host as first player
  room.players.set(hostId, {
    id: hostId,
    nickname: hostNickname,
    socketId: hostSocketId,
    isHost: true,
    connected: true
  });
  
  rooms.set(roomCode, room);
  playerSockets.set(hostSocketId, { playerId: hostId, roomCode: roomCode });
  
  return { room, hostId };
}

// Update room activity timestamp
function updateRoomActivity(roomCode) {
  const room = rooms.get(roomCode);
  if (room) {
    room.lastActivity = Date.now();
  }
}

// Transfer host to another player
function transferHost(room) {
  const connectedPlayers = Array.from(room.players.values()).filter(p => p.connected);
  if (connectedPlayers.length > 0) {
    // Remove host status from all players
    room.players.forEach(player => player.isHost = false);
    
    // Make first connected player the new host
    const newHost = connectedPlayers[0];
    newHost.isHost = true;
    room.hostId = newHost.id;
    
    // Notify all players in room about host change
    room.players.forEach(player => {
      if (player.connected && player.socketId) {
        io.to(player.socketId).emit('hostChanged', {
          newHostId: newHost.id,
          newHostNickname: newHost.nickname
        });
        
        // Also send updated room state
        io.to(player.socketId).emit('roomStateUpdated', {
          players: Array.from(room.players.values()).map(p => ({
            id: p.id,
            nickname: p.nickname,
            isHost: p.isHost,
            connected: p.connected
          }))
        });
      }
    });
    
    return true;
  }
  return false;
}

// Clean up inactive rooms
function cleanupInactiveRooms() {
  const now = Date.now();
  const roomsToDelete = [];
  
  rooms.forEach((room, roomCode) => {
    // Check if room has been inactive for 30 minutes
    if (now - room.lastActivity > ROOM_CLEANUP_INTERVAL) {
      roomsToDelete.push(roomCode);
    }
    
    // Check for disconnected players who haven't reconnected in 5 minutes
    room.disconnectedPlayers.forEach((disconnectTime, playerId) => {
      if (now - disconnectTime > RECONNECTION_TIMEOUT) {
        // Check if game should end due to disconnection timeout
        if (room.gameState && room.gameState.status === 'playing') {
          const disconnectionResult = gameEndConditions.checkDisconnectionTimeout(room);
          if (disconnectionResult.shouldEnd) {
            const endResult = gameEndConditions.handleGameEnd(
              room.gameState, 
              `Game ended due to player disconnection: ${disconnectionResult.disconnectedPlayer?.nickname || 'Unknown'}`
            );
            
            // Notify all connected players
            room.players.forEach(player => {
              if (player.connected && player.socketId) {
                io.to(player.socketId).emit('gameEnded', {
                  ...endResult,
                  gameState: gameState.getPlayerGameState(room.gameState, player.id)
                });
              }
            });
          }
        }
        
        // Remove disconnected player
        room.players.delete(playerId);
        room.disconnectedPlayers.delete(playerId);
      }
    });
    
    // If no players left, mark room for deletion
    if (room.players.size === 0) {
      roomsToDelete.push(roomCode);
    }
  });
  
  // Delete inactive rooms
  roomsToDelete.forEach(roomCode => {
    rooms.delete(roomCode);
    console.log(`Cleaned up inactive room: ${roomCode}`);
  });
}

// Start cleanup interval
setInterval(cleanupInactiveRooms, 60000); // Check every minute

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);
  
  // Create room
  socket.on('createRoom', (data) => {
    try {
      const { nickname } = data;
      if (!nickname || nickname.trim().length === 0) {
        socket.emit('error', { message: 'Nickname is required' });
        return;
      }
      
      const { room, hostId } = createRoom(socket.id, nickname.trim());
      
      socket.join(room.code);
      socket.emit('roomCreated', {
        roomCode: room.code,
        playerId: hostId,
        players: Array.from(room.players.values()).map(p => ({
          id: p.id,
          nickname: p.nickname,
          isHost: p.isHost
        }))
      });
      
      console.log(`Room created: ${room.code} by ${nickname}`);
    } catch (error) {
      socket.emit('error', { message: 'Failed to create room' });
    }
  });
  
  // Join room
  socket.on('joinRoom', (data) => {
    try {
      const { roomCode, nickname } = data;
      
      if (!roomCode || !nickname || nickname.trim().length === 0) {
        socket.emit('error', { message: 'Room code and nickname are required' });
        return;
      }
      
      const room = rooms.get(roomCode.toUpperCase());
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      
      // Check if game has already started
      if (room.gameState && room.gameState.status === 'playing') {
        socket.emit('error', { message: 'Cannot join - game already in progress' });
        return;
      }
      
      const trimmedNickname = nickname.trim();
      
      // Check if there's a disconnected player with the same nickname
      let existingPlayer = null;
      for (const [playerId, player] of room.players.entries()) {
        if (player.nickname === trimmedNickname && !player.connected) {
          existingPlayer = { playerId, player };
          break;
        }
      }
      
      if (existingPlayer) {
        // Reconnect existing player
        const { playerId, player } = existingPlayer;
        
        player.connected = true;
        player.socketId = socket.id;
        room.disconnectedPlayers.delete(playerId);
        playerSockets.set(socket.id, { playerId: playerId, roomCode: room.code });
        
        socket.join(room.code);
        updateRoomActivity(room.code);
        
        // Send reconnection confirmation to player
        socket.emit('roomJoined', {
          roomCode: room.code,
          playerId: playerId,
          players: Array.from(room.players.values()).map(p => ({
            id: p.id,
            nickname: p.nickname,
            isHost: p.isHost,
            connected: p.connected
          })),
          reconnected: true
        });
        
        // Notify other players about reconnection
        socket.to(room.code).emit('playerReconnected', {
          playerId: playerId,
          nickname: player.nickname
        });
        
        // Broadcast updated room state to all players
        room.players.forEach(roomPlayer => {
          if (roomPlayer.connected && roomPlayer.socketId) {
            io.to(roomPlayer.socketId).emit('roomStateUpdated', {
              players: Array.from(room.players.values()).map(p => ({
                id: p.id,
                nickname: p.nickname,
                isHost: p.isHost,
                connected: p.connected
              }))
            });
          }
        });
        
        console.log(`Player ${trimmedNickname} reconnected to room ${room.code}`);
        return;
      }
      
      // Check if room is full (max 5 players)
      if (room.players.size >= 5) {
        socket.emit('error', { message: 'Room is full' });
        return;
      }
      
      // Create new player
      const playerId = uuidv4();
      const player = {
        id: playerId,
        nickname: trimmedNickname,
        socketId: socket.id,
        isHost: false,
        connected: true
      };
      
      room.players.set(playerId, player);
      playerSockets.set(socket.id, { playerId: playerId, roomCode: room.code });
      updateRoomActivity(room.code);
      
      socket.join(room.code);
      
      // Send room state to new player
      socket.emit('roomJoined', {
        roomCode: room.code,
        playerId: playerId,
        players: Array.from(room.players.values()).map(p => ({
          id: p.id,
          nickname: p.nickname,
          isHost: p.isHost,
          connected: p.connected
        }))
      });
      
      // Notify other players
      socket.to(room.code).emit('playerJoined', {
        player: {
          id: playerId,
          nickname: trimmedNickname,
          isHost: false
        }
      });
      
      // Broadcast updated room state to all players
      room.players.forEach(player => {
        if (player.connected && player.socketId) {
          io.to(player.socketId).emit('roomStateUpdated', {
            players: Array.from(room.players.values()).map(p => ({
              id: p.id,
              nickname: p.nickname,
              isHost: p.isHost,
              connected: p.connected
            }))
          });
        }
      });
      
      console.log(`Player ${trimmedNickname} joined room ${room.code}`);
    } catch (error) {
      socket.emit('error', { message: 'Failed to join room' });
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    
    const playerInfo = playerSockets.get(socket.id);
    if (playerInfo) {
      const { playerId, roomCode } = playerInfo;
      const room = rooms.get(roomCode);
      
      if (room && room.players.has(playerId)) {
        const player = room.players.get(playerId);
        player.connected = false;
        player.socketId = null;
        
        // Add to disconnected players with timestamp
        room.disconnectedPlayers.set(playerId, Date.now());
        
        // If disconnected player was host, transfer host
        if (player.isHost) {
          const hostTransferred = transferHost(room);
          if (!hostTransferred) {
            // No other players to transfer host to, room will be cleaned up
            rooms.delete(roomCode);
            console.log(`Room ${roomCode} deleted - no players left`);
          }
        }
        
        // Notify other players about disconnection
        socket.to(roomCode).emit('playerDisconnected', {
          playerId: playerId,
          nickname: player.nickname
        });
        
        // Broadcast updated room state to remaining players
        room.players.forEach(remainingPlayer => {
          if (remainingPlayer.connected && remainingPlayer.socketId && remainingPlayer.id !== playerId) {
            io.to(remainingPlayer.socketId).emit('roomStateUpdated', {
              players: Array.from(room.players.values()).map(p => ({
                id: p.id,
                nickname: p.nickname,
                isHost: p.isHost,
                connected: p.connected
              }))
            });
          }
        });
        
        updateRoomActivity(roomCode);
      }
      
      playerSockets.delete(socket.id);
    }
  });
  
  // Handle reconnection
  socket.on('reconnect', (data) => {
    try {
      const { roomCode, playerId } = data;
      
      const room = rooms.get(roomCode);
      if (!room || !room.players.has(playerId)) {
        socket.emit('error', { message: 'Invalid reconnection data' });
        return;
      }
      
      const player = room.players.get(playerId);
      
      // Check if player was actually disconnected
      if (!room.disconnectedPlayers.has(playerId)) {
        socket.emit('error', { message: 'Player was not disconnected' });
        return;
      }
      
      // Reconnect player
      player.connected = true;
      player.socketId = socket.id;
      room.disconnectedPlayers.delete(playerId);
      playerSockets.set(socket.id, { playerId: playerId, roomCode: roomCode });
      
      socket.join(roomCode);
      updateRoomActivity(roomCode);
      
      // Send current room/game state to reconnected player
      socket.emit('reconnected', {
        roomCode: roomCode,
        playerId: playerId,
        players: Array.from(room.players.values()).map(p => ({
          id: p.id,
          nickname: p.nickname,
          isHost: p.isHost,
          connected: p.connected
        })),
        gameState: room.gameState
      });
      
      // Notify other players about reconnection
      socket.to(roomCode).emit('playerReconnected', {
        playerId: playerId,
        nickname: player.nickname
      });
      
      // Broadcast updated room state to all players
      room.players.forEach(roomPlayer => {
        if (roomPlayer.connected && roomPlayer.socketId) {
          io.to(roomPlayer.socketId).emit('roomStateUpdated', {
            players: Array.from(room.players.values()).map(p => ({
              id: p.id,
              nickname: p.nickname,
              isHost: p.isHost,
              connected: p.connected
            }))
          });
        }
      });
      
      console.log(`Player ${player.nickname} reconnected to room ${roomCode}`);
    } catch (error) {
      socket.emit('error', { message: 'Failed to reconnect' });
    }
  });
  
  // Start game
  socket.on('startGame', (data) => {
    try {
      const playerInfo = playerSockets.get(socket.id);
      if (!playerInfo) {
        socket.emit('error', { message: 'Player not found' });
        return;
      }
      
      const { playerId, roomCode } = playerInfo;
      const room = rooms.get(roomCode);
      
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      
      // Check if player is host
      const player = room.players.get(playerId);
      if (!player || !player.isHost) {
        socket.emit('error', { message: 'Only host can start the game' });
        return;
      }
      
      // Check minimum players (2-5)
      const connectedPlayers = Array.from(room.players.values()).filter(p => p.connected);
      if (connectedPlayers.length < 2) {
        socket.emit('error', { message: 'Need at least 2 players to start' });
        return;
      }
      
      if (connectedPlayers.length > 5) {
        socket.emit('error', { message: 'Maximum 5 players allowed' });
        return;
      }
      
      // Check if game already started
      if (room.gameState && room.gameState.status === 'playing') {
        socket.emit('error', { message: 'Game already in progress' });
        return;
      }
      
      // Create game state
      const playerIds = connectedPlayers.map(p => p.id);
      room.gameState = gameState.createGameState(playerIds);
      updateRoomActivity(roomCode);
      
      // Notify all players that game started
      room.players.forEach(player => {
        if (player.connected && player.socketId) {
          const playerGameState = gameState.getPlayerGameState(room.gameState, player.id);
          io.to(player.socketId).emit('gameStarted', {
            gameState: playerGameState
          });
        }
      });
      
      console.log(`Game started in room ${roomCode} with ${playerIds.length} players`);
    } catch (error) {
      console.error('Error starting game:', error);
      socket.emit('error', { message: 'Failed to start game' });
    }
  });
  
  // Play card action
  socket.on('playCard', (data) => {
    try {
      const { cardIndex } = data;
      const playerInfo = playerSockets.get(socket.id);
      
      if (!playerInfo) {
        socket.emit('error', { message: 'Player not found' });
        return;
      }
      
      const { playerId, roomCode } = playerInfo;
      const room = rooms.get(roomCode);
      
      if (!room || !room.gameState) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }
      
      // Execute action
      const result = gameActions.playCard(room.gameState, playerId, cardIndex);
      
      if (!result.success) {
        socket.emit('error', { message: result.error });
        return;
      }
      
      updateRoomActivity(roomCode);
      
      // Check for game end conditions
      const gameEnded = gameEndConditions.processGameEnd(room.gameState, room, io);
      
      if (!gameEnded) {
        // Get player nickname for the action
        const actingPlayer = room.players.get(playerId);
        const playerNickname = actingPlayer ? actingPlayer.nickname : 'Unknown';
        
        // Broadcast action result to all players only if game continues
        room.players.forEach(player => {
          if (player.connected && player.socketId) {
            const playerGameState = gameState.getPlayerGameState(room.gameState, player.id);
            io.to(player.socketId).emit('actionResult', {
              action: {
                ...result,
                playerNickname: playerNickname,
                playerId: playerId,
                cardIndex: cardIndex
              },
              gameState: playerGameState
            });
          }
        });
        
        // Send final round notification if it just began
        if (result.finalRoundBegan) {
          room.players.forEach(player => {
            if (player.connected && player.socketId) {
              io.to(player.socketId).emit('finalRoundBegin', {
                turnsLeft: room.gameState.finalRoundTurnsLeft
              });
            }
          });
        }
      }
      
      console.log(`Player ${playerId} played card in room ${roomCode}`);
    } catch (error) {
      console.error('Error playing card:', error);
      socket.emit('error', { message: 'Failed to play card' });
    }
  });
  
  // Discard card action
  socket.on('discardCard', (data) => {
    try {
      const { cardIndex } = data;
      const playerInfo = playerSockets.get(socket.id);
      
      if (!playerInfo) {
        socket.emit('error', { message: 'Player not found' });
        return;
      }
      
      const { playerId, roomCode } = playerInfo;
      const room = rooms.get(roomCode);
      
      if (!room || !room.gameState) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }
      
      // Execute action
      const result = gameActions.discardCard(room.gameState, playerId, cardIndex);
      
      if (!result.success) {
        socket.emit('error', { message: result.error });
        return;
      }
      
      updateRoomActivity(roomCode);
      
      // Check for game end conditions
      const gameEnded = gameEndConditions.processGameEnd(room.gameState, room, io);
      
      if (!gameEnded) {
        // Get player nickname for the action
        const actingPlayer = room.players.get(playerId);
        const playerNickname = actingPlayer ? actingPlayer.nickname : 'Unknown';
        
        // Broadcast action result to all players only if game continues
        room.players.forEach(player => {
          if (player.connected && player.socketId) {
            const playerGameState = gameState.getPlayerGameState(room.gameState, player.id);
            io.to(player.socketId).emit('actionResult', {
              action: {
                ...result,
                playerNickname: playerNickname,
                playerId: playerId,
                cardIndex: cardIndex
              },
              gameState: playerGameState
            });
          }
        });
        
        // Send final round notification if it just began
        if (result.finalRoundBegan) {
          room.players.forEach(player => {
            if (player.connected && player.socketId) {
              io.to(player.socketId).emit('finalRoundBegin', {
                turnsLeft: room.gameState.finalRoundTurnsLeft
              });
            }
          });
        }
      }
      
      console.log(`Player ${playerId} discarded card in room ${roomCode}`);
    } catch (error) {
      console.error('Error discarding card:', error);
      socket.emit('error', { message: 'Failed to discard card' });
    }
  });
  
  // Give clue action
  socket.on('giveClue', (data) => {
    try {
      const { targetPlayerId, clueType, clueValue } = data;
      const playerInfo = playerSockets.get(socket.id);
      
      if (!playerInfo) {
        socket.emit('error', { message: 'Player not found' });
        return;
      }
      
      const { playerId, roomCode } = playerInfo;
      const room = rooms.get(roomCode);
      
      if (!room || !room.gameState) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }
      
      // Execute action
      const result = gameActions.giveClue(room.gameState, playerId, targetPlayerId, clueType, clueValue);
      
      if (!result.success) {
        socket.emit('error', { message: result.error });
        return;
      }
      
      updateRoomActivity(roomCode);
      
      // Check for game end conditions
      const gameEnded = gameEndConditions.processGameEnd(room.gameState, room, io);
      
      if (!gameEnded) {
        // Get player nicknames for the action
        const actingPlayer = room.players.get(playerId);
        const targetPlayer = room.players.get(targetPlayerId);
        const playerNickname = actingPlayer ? actingPlayer.nickname : 'Unknown';
        const targetNickname = targetPlayer ? targetPlayer.nickname : 'Unknown';
        
        // Broadcast action result to all players only if game continues
        room.players.forEach(player => {
          if (player.connected && player.socketId) {
            const playerGameState = gameState.getPlayerGameState(room.gameState, player.id);
            io.to(player.socketId).emit('actionResult', {
              action: {
                ...result,
                playerNickname: playerNickname,
                targetNickname: targetNickname,
                playerId: playerId
              },
              gameState: playerGameState
            });
          }
        });
      }
      
      console.log(`Player ${playerId} gave clue in room ${roomCode}`);
    } catch (error) {
      console.error('Error giving clue:', error);
      socket.emit('error', { message: 'Failed to give clue' });
    }
  });
  
  // Get current game state
  socket.on('getGameState', () => {
    try {
      const playerInfo = playerSockets.get(socket.id);
      
      if (!playerInfo) {
        socket.emit('error', { message: 'Player not found' });
        return;
      }
      
      const { playerId, roomCode } = playerInfo;
      const room = rooms.get(roomCode);
      
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      
      if (room.gameState) {
        const playerGameState = gameState.getPlayerGameState(room.gameState, playerId);
        socket.emit('gameState', { gameState: playerGameState });
      } else {
        socket.emit('gameState', { gameState: null });
      }
    } catch (error) {
      console.error('Error getting game state:', error);
      socket.emit('error', { message: 'Failed to get game state' });
    }
  });
  
  // Get current room state (for lobby updates)
  socket.on('getRoomState', (data) => {
    try {
      const playerInfo = playerSockets.get(socket.id);
      
      if (!playerInfo) {
        socket.emit('error', { message: 'Player not found' });
        return;
      }
      
      const { roomCode } = playerInfo;
      const room = rooms.get(roomCode);
      
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      
      // Send updated room state
      socket.emit('roomStateUpdated', {
        players: Array.from(room.players.values()).map(p => ({
          id: p.id,
          nickname: p.nickname,
          isHost: p.isHost,
          connected: p.connected
        }))
      });
    } catch (error) {
      console.error('Error getting room state:', error);
      socket.emit('error', { message: 'Failed to get room state' });
    }
  });
  
  // Play again functionality
  socket.on('playAgain', () => {
    try {
      const playerInfo = playerSockets.get(socket.id);
      if (!playerInfo) {
        socket.emit('error', { message: 'Player not found' });
        return;
      }
      
      const { playerId, roomCode } = playerInfo;
      const room = rooms.get(roomCode);
      
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      
      // Check if player is host
      const player = room.players.get(playerId);
      if (!player || !player.isHost) {
        socket.emit('error', { message: 'Only host can start a new game' });
        return;
      }
      
      // Check if previous game ended
      if (!room.gameState || room.gameState.status !== 'ended') {
        socket.emit('error', { message: 'Previous game must be finished first' });
        return;
      }
      
      // Reset game state
      const connectedPlayers = Array.from(room.players.values()).filter(p => p.connected);
      if (connectedPlayers.length < 2) {
        socket.emit('error', { message: 'Need at least 2 players to start' });
        return;
      }
      
      // Create new game state
      const playerIds = connectedPlayers.map(p => p.id);
      room.gameState = gameState.createGameState(playerIds);
      updateRoomActivity(roomCode);
      
      // Notify all players that new game started
      room.players.forEach(player => {
        if (player.connected && player.socketId) {
          const playerGameState = gameState.getPlayerGameState(room.gameState, player.id);
          io.to(player.socketId).emit('gameStarted', {
            gameState: playerGameState,
            newGame: true
          });
        }
      });
      
      console.log(`New game started in room ${roomCode} with ${playerIds.length} players`);
    } catch (error) {
      console.error('Error starting new game:', error);
      socket.emit('error', { message: 'Failed to start new game' });
    }
  });
});

// Basic route for health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    rooms: rooms.size,
    timestamp: new Date().toISOString()
  });
});

// Serve the frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3030;
server.listen(PORT, () => {
  console.log(`Hanabi server running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
}); 