// At the very top - this proves the file loaded
console.log('[preload] SCRIPT FILE LOADED');

console.log('[preload] ===== PRELOAD SCRIPT STARTING =====');

try {
  console.log('[preload] Preload script loading...');

  const { contextBridge, ipcRenderer } = require('electron');

  console.log('[preload] Electron modules loaded');
  console.log('[preload] Exposing desktopAPI and Electron flag via contextBridge...');

  // Expose safe APIs via contextBridge
  try {
    // Expose Electron flag first
    contextBridge.exposeInMainWorld('__IS_ELECTRON__', true);
    console.log('[preload] Electron flag exposed');
    
    // Expose desktopAPI
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
      
      // AI operations
      generateNoteTitle: (content) => ipcRenderer.invoke('ai:generateTitle', content),
      generateNoteTags: (content) => ipcRenderer.invoke('ai:generateTags', content),
      
      // Screenshot operations
      captureScreenshot: (noteId) => ipcRenderer.invoke('screenshot:capture', noteId),
      
      // Quick Capture operations
      updateQuickNote: (content) => ipcRenderer.invoke('quick-capture:updateNote', content),
      closeQuickCapture: () => ipcRenderer.invoke('quick-capture:close'),
      
      // Cover Image operations
      selectCoverImage: () => ipcRenderer.invoke('cover-image:selectFile'),
      saveCoverImage: (sourcePath, noteId) => ipcRenderer.invoke('cover-image:saveFile', sourcePath, noteId),
      deleteCoverImage: (imagePath) => ipcRenderer.invoke('cover-image:deleteFile', imagePath),
    });
    
    console.log('[preload] desktopAPI exposed successfully');
    console.log('[preload] Available methods:', [
      'getNotes',
      'getNote',
      'createNote',
      'updateNote',
      'deleteNote',
      'getNotesByTag',
      'searchNotesByText',
      'getAllTags',
      'generateEmbedding',
      'semanticSearch',
      'generateNoteTitle',
      'generateNoteTags',
      'captureScreenshot',
      'updateQuickNote',
      'closeQuickCapture',
      'selectCoverImage',
      'saveCoverImage',
      'deleteCoverImage'
    ]);
  } catch (error) {
    console.error('[preload] ERROR: Failed to expose APIs:', error);
    console.error('[preload] Error stack:', error.stack);
    throw error;
  }
  
  console.log('[preload] ===== PRELOAD SCRIPT COMPLETE =====');
} catch (error) {
  console.error('[preload] ===== PRELOAD SCRIPT FAILED =====');
  console.error('[preload] Error:', error);
  console.error('[preload] Stack:', error.stack);
  throw error;
}

