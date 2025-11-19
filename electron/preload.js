const { contextBridge, ipcRenderer } = require('electron');

// Expose safe APIs via contextBridge
contextBridge.exposeInMainWorld('desktopAPI', {
  // Database operations
  getNotes: () => ipcRenderer.invoke('db:getAllNotes'),
  getNote: (id) => ipcRenderer.invoke('db:getNote', id),
  createNote: (data) => ipcRenderer.invoke('db:createNote', data),
  updateNote: (id, updates) => ipcRenderer.invoke('db:updateNote', id, updates),
  deleteNote: (id) => ipcRenderer.invoke('db:deleteNote', id),
  getNotesByTag: (tag) => ipcRenderer.invoke('db:getNotesByTag', tag),
  searchNotesByText: (query) => ipcRenderer.invoke('db:searchNotesByText', query),
  getAllTags: () => ipcRenderer.invoke('db:getAllTags'),
  
  // Embedding operations
  generateEmbedding: (text) => ipcRenderer.invoke('embeddings:generate', text),
  semanticSearch: (queryEmbedding) => ipcRenderer.invoke('embeddings:semanticSearch', queryEmbedding),
  
  // Placeholder for future APIs
  // File operations: will be added later
});

