/**
 * WebSocket Service Provider
 * Provides access to WebSocket manager without using global variables
 */
class WebSocketProvider {
  wsManager: any;

  constructor() {
    this.wsManager = null;
  }

  /**
   * Set the WebSocket manager instance
   * @param {Object} wsManager - WebSocket manager instance
   */
  setManager(wsManager: any) {
    this.wsManager = wsManager;
  }

  /**
   * Get the WebSocket manager instance
   * @returns {Object|null} WebSocket manager or null if not set
   */
  getManager() {
    return this.wsManager;
  }

  /**
   * Broadcast file created event
   * @param {Object} fileData - File creation data
   */
  broadcastFileCreated(fileData) {
    if (this.wsManager && typeof this.wsManager.broadcastFileCreated === 'function') {
      this.wsManager.broadcastFileCreated(fileData);
    }
  }

  /**
   * Broadcast file deleted event
   * @param {string} filePath - Path of deleted file
   */
  broadcastFileDeleted(filePath) {
    if (this.wsManager && typeof this.wsManager.broadcastFileDeleted === 'function') {
      this.wsManager.broadcastFileDeleted(filePath);
    }
  }

  /**
   * Check if WebSocket manager is available
   * @returns {boolean} True if manager is available
   */
  isAvailable() {
    return this.wsManager !== null;
  }
}

// Export singleton instance
export default new WebSocketProvider();