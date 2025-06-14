/**
 * Abstract base class that defines the interface for game implementations
 * All specific card games must extend this class and implement its methods
 */
class GameImplementation {
  constructor() {
    if (this.constructor === GameImplementation) {
      throw new Error('GameImplementation is abstract and cannot be instantiated directly');
    }
  }

  /**
   * Get the game configuration (player limits, game-specific settings)
   * @returns {Object} Game configuration object
   */
  getGameConfig() {
    return {
      minPlayers: 2,
      maxPlayers: 5,
      name: 'Generic Card Game',
      version: '1.0.0'
    };
  }

  /**
   * Create the initial game state when a game starts
   * @param {Array} playerIds - Array of player IDs in turn order
   * @param {Object} gameConfig - Game-specific configuration
   * @returns {Object} Initial game state
   */
  createInitialState(playerIds, gameConfig = {}) {
    throw new Error('createInitialState must be implemented by game');
  }

  /**
   * Validate if a player action is legal in the current game state
   * @param {Object} action - The action to validate
   * @param {Object} gameState - Current game state
   * @param {string} playerId - ID of the player attempting the action
   * @returns {Object} { valid: boolean, error?: string }
   */
  validateAction(action, gameState, playerId) {
    throw new Error('validateAction must be implemented by game');
  }

  /**
   * Process a validated player action and update the game state
   * @param {Object} action - The action to process
   * @param {Object} gameState - Current game state (will be mutated)
   * @param {string} playerId - ID of the player performing the action
   * @returns {Object} Action result with any effects/notifications
   */
  processAction(action, gameState, playerId) {
    throw new Error('processAction must be implemented by game');
  }

  /**
   * Check if the game has ended and determine the result
   * @param {Object} gameState - Current game state
   * @returns {Object} { ended: boolean, result?: Object }
   */
  checkEndConditions(gameState) {
    throw new Error('checkEndConditions must be implemented by game');
  }

  /**
   * Get a player-specific view of the game state (hiding private information)
   * @param {Object} gameState - Full game state
   * @param {string} playerId - ID of the player requesting the view
   * @returns {Object} Player-specific game state
   */
  getPlayerView(gameState, playerId) {
    // Default implementation returns the full state
    // Games with hidden information should override this
    return gameState;
  }

  /**
   * Handle player disconnection during a game
   * @param {Object} gameState - Current game state
   * @param {string} playerId - ID of the disconnected player
   * @returns {Object} { shouldPause: boolean, shouldEnd: boolean, message?: string }
   */
  handlePlayerDisconnection(gameState, playerId) {
    // Default implementation pauses the game
    return {
      shouldPause: true,
      shouldEnd: false,
      message: 'Game paused due to player disconnection'
    };
  }

  /**
   * Handle player reconnection during a game
   * @param {Object} gameState - Current game state
   * @param {string} playerId - ID of the reconnected player
   * @returns {Object} { shouldResume: boolean, message?: string }
   */
  handlePlayerReconnection(gameState, playerId) {
    // Default implementation resumes the game
    return {
      shouldResume: true,
      message: 'Game resumed - player reconnected'
    };
  }

  /**
   * Get available actions for a player in the current game state
   * @param {Object} gameState - Current game state
   * @param {string} playerId - ID of the player
   * @returns {Array} Array of available action objects
   */
  getAvailableActions(gameState, playerId) {
    // Default implementation returns empty array
    // Games can override to provide action hints to clients
    return [];
  }

  /**
   * Calculate the final score/result for the game
   * @param {Object} gameState - Final game state
   * @returns {Object} Score/result object
   */
  calculateFinalResult(gameState) {
    // Default implementation returns basic result
    return {
      gameEnded: true,
      timestamp: Date.now()
    };
  }

  /**
   * Serialize game state for storage/transmission
   * @param {Object} gameState - Game state to serialize
   * @returns {Object} Serialized game state
   */
  serializeGameState(gameState) {
    // Default implementation returns state as-is
    return gameState;
  }

  /**
   * Deserialize game state from storage
   * @param {Object} serializedState - Serialized game state
   * @returns {Object} Deserialized game state
   */
  deserializeGameState(serializedState) {
    // Default implementation returns state as-is
    return serializedState;
  }
}

module.exports = GameImplementation; 