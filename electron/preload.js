const { contextBridge } = require('electron');

// Expose safe APIs via contextBridge
contextBridge.exposeInMainWorld('desktopAPI', {
  // Placeholder API for testing
  ping: () => 'pong',
  
  // Placeholder for future APIs (to be implemented in Phase 5.3)
  // SQLite: will be added later
  // Embeddings: will be added later
  // File operations: will be added later
});

