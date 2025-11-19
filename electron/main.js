const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const db = require('./db/index');
const { generateEmbedding } = require('./ai/embeddings');
const { cosineSimilarity } = require('./ai/vector');

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allow local file access
    },
  });

  // Determine if we're in development or production
  const isDev = !app.isPackaged;
  
  // URLs for dev and production
  const devUrl = "http://localhost:3000";
  const prodUrl = `file://${path.join(__dirname, "../out/index.html")}`;
  
  if (isDev) {
    // In development, open dev tools
    win.webContents.openDevTools();
  }

  // Load from Next.js dev server or production build
  win.loadURL(isDev ? devUrl : prodUrl);

  // Handle window closed
  win.on('closed', () => {
    // Dereference the window object
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  // On macOS, re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers for database operations
ipcMain.handle('db:getAllNotes', async () => {
  return await db.getAllNotes();
});

ipcMain.handle('db:getNote', async (_, id) => {
  return await db.getNote(id);
});

ipcMain.handle('db:createNote', async (_, data) => {
  return await db.createNote(data);
});

ipcMain.handle('db:updateNote', async (_, id, updates) => {
  return await db.updateNote(id, updates);
});

ipcMain.handle('db:deleteNote', async (_, id) => {
  return await db.deleteNote(id);
});

ipcMain.handle('db:getNotesByTag', async (_, tag) => {
  return await db.getNotesByTag(tag);
});

ipcMain.handle('db:searchNotesByText', async (_, query) => {
  return await db.searchNotesByText(query);
});

ipcMain.handle('db:getAllTags', async () => {
  return await db.getAllTags();
});

// Embedding operations
ipcMain.handle('embeddings:generate', async (_, text) => {
  try {
    return await generateEmbedding(text);
  } catch (error) {
    console.error('Failed to generate embedding:', error);
    throw error;
  }
});

// Semantic search
ipcMain.handle('embeddings:semanticSearch', async (_, queryEmbedding) => {
  try {
    const allNotes = await db.getAllNotes();
    
    const ranked = allNotes
      .map(note => {
        let embedding = [];
        if (note.embedding) {
          try {
            embedding = JSON.parse(note.embedding);
          } catch (e) {
            console.warn('Failed to parse embedding for note', note.id, e);
            embedding = [];
          }
        }
        return {
          ...note,
          embedding,
        };
      })
      .filter(note => note.embedding && note.embedding.length > 0)
      .map(note => {
        const score = cosineSimilarity(queryEmbedding, note.embedding);
        return {
          ...note,
          score,
        };
      })
      .sort((a, b) => b.score - a.score);
    
    return ranked;
  } catch (error) {
    console.error('Semantic search failed:', error);
    throw error;
  }
});

