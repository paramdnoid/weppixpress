export function createWebSocketBroadcasters(wsManager) {
  return {
    broadcastFileUpdate: (file) => {
      wsManager.broadcastFileUpdated(file);
    },

    broadcastFileCreated: (file) => {
      wsManager.broadcastFileCreated(file);
    },

    broadcastFileDeleted: (filePath) => {
      wsManager.broadcastFileDeleted(filePath);
    },

    broadcastFolderChanged: (folderPath) => {
      wsManager.broadcastFolderChanged(folderPath);
    }
  };
}