// === Patch console globally to avoid EPIPE crashes ===
// This MUST be at the very top, before ANY console.log() calls
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn
};

console.log = (...args) => {
  try {
    if (process.stdout.writable && !process.stdout.destroyed) {
      originalConsole.log(...args);
    }
  } catch (_) { }
};

console.error = (...args) => {
  try {
    if (process.stderr.writable && !process.stderr.destroyed) {
      originalConsole.error(...args);
    }
  } catch (_) { }
};

console.warn = (...args) => {
  try {
    if (process.stdout.writable && !process.stdout.destroyed) {
      originalConsole.warn(...args);
    }
  } catch (_) { }
};
// =====================================================

// Load environment variables from .env.local
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Try multiple possible locations for .env.local
const possiblePaths = [
  path.join(__dirname, '../.env.local'),  // From electron/ folder
  path.join(process.cwd(), '.env.local'),  // From project root
  path.resolve(process.cwd(), '.env.local'), // Absolute from cwd
];

let envLoaded = false;
let loadedPath = null;
for (const envPath of possiblePaths) {
  if (fs.existsSync(envPath)) {
    console.log('[env] Attempting to load from:', envPath);
    const result = dotenv.config({ path: envPath, override: true });
    if (result.error) {
      console.error('[env] Error loading:', result.error);
    } else {
      console.log('[env] ✓ Loaded environment variables from:', envPath);
      console.log('[env] Parsed keys:', Object.keys(result.parsed || {}));
      envLoaded = true;
      loadedPath = envPath;
      break;
    }
  } else {
    console.log('[env] File not found:', envPath);
  }
}

if (!envLoaded) {
  console.error('[env] ✗ ERROR: .env.local not found in any location!');
  console.error('[env] Tried:', possiblePaths);
  console.error('[env] Current working directory:', process.cwd());
  console.error('[env] __dirname:', __dirname);
} else {
  console.log('[env] ✓ Environment file loaded successfully from:', loadedPath);
}

// Force set the API key if it exists in the file but wasn't parsed
if (!process.env.OPENAI_API_KEY && loadedPath) {
  try {
    const envContent = fs.readFileSync(loadedPath, 'utf8');
    const match = envContent.match(/^OPENAI_API_KEY=(.+)$/m);
    if (match && match[1]) {
      process.env.OPENAI_API_KEY = match[1].trim();
      console.log('[env] ✓ Manually extracted OPENAI_API_KEY from file');
    }
  } catch (e) {
    console.error('[env] Error reading .env.local:', e);
  }
}

console.log('[env] OPENAI_API_KEY loaded:', !!process.env.OPENAI_API_KEY);
if (process.env.OPENAI_API_KEY) {
  console.log('[env] OPENAI_API_KEY length:', process.env.OPENAI_API_KEY.length);
  console.log('[env] OPENAI_API_KEY starts with:', process.env.OPENAI_API_KEY.substring(0, 10) + '...');
} else {
  console.error('[env] ✗ CRITICAL: OPENAI_API_KEY is not set!');
  console.error('[env] Create .env.local in project root with: OPENAI_API_KEY=your-key');
}

console.log('[main] ===== ELECTRON STARTING =====');
try {
  console.log('[main] Electron version:', process.versions?.electron || 'N/A');
  console.log('[main] Node version:', process.versions?.node || 'N/A');
  console.log('[main] Platform:', process.platform || 'N/A');
} catch (e) {
  console.error('[main] Error logging versions:', e);
}

const { app, BrowserWindow, ipcMain, globalShortcut, screen, dialog } = require('electron');

// Set app name for dock/taskbar
app.setName('Noteshot');

// Safe logging utility to prevent EPIPE errors
// Note: console.log/error/warn are already patched at the top of the file
function safeLog(...args) {
  try {
    if (process.stdout.writable && !process.stdout.destroyed) {
      console.log(...args);
    }
  } catch (e) {
    // Silently ignore EPIPE and other write errors
  }
}

function safeError(...args) {
  try {
    if (process.stderr.writable && !process.stderr.destroyed) {
      console.error(...args);
    }
  } catch (e) {
    // Silently ignore EPIPE and other write errors
  }
}

try {
  console.log('[main] App path:', app.getAppPath());
  console.log('[main] User data path:', app.getPath('userData'));
} catch (e) {
  console.error('[main] Error getting app paths:', e);
}
const db = require('./db/index');
const { generateEmbedding } = require('./ai/embeddings');
const { cosineSimilarity } = require('./ai/vector');
const { generateNoteTitle } = require('./ai/title-generator');
const { generateNoteTags } = require('./ai/tag-generator');
const { captureScreenshot } = require('./screenshot');
const settingsManager = require('./settings');

// Store references to windows
let mainWindow = null;
let quickCaptureWindow = null;
let pendingQuickNoteId = null; // Store note ID created with screenshot

function createWindow() {
  // Guard: Reuse existing main window if it exists and isn't destroyed
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    return mainWindow;
  }

  // Verify preload path - try multiple possible locations
  const fs = require('fs');
  const possiblePaths = [
    path.join(__dirname, 'preload.js'),
    path.join(process.cwd(), 'electron', 'preload.js'),
    path.resolve(__dirname, 'preload.js'),
  ];

  console.log('[main] ===== PRELOAD VERIFICATION =====');
  console.log('[main] __dirname:', __dirname);
  console.log('[main] Current working directory:', process.cwd());
  console.log('[main] Testing possible preload paths...');

  let preloadPath = null;
  for (const testPath of possiblePaths) {
    console.log('[main] Testing:', testPath);
    if (fs.existsSync(testPath)) {
      preloadPath = testPath;
      console.log('[main] ✓ Found preload at:', preloadPath);
      break;
    } else {
      console.log('[main] ✗ Not found');
    }
  }

  if (!preloadPath) {
    console.error('[main] ===== CRITICAL ERROR =====');
    console.error('[main] Preload not found in any location!');
    console.error('[main] Tried:', possiblePaths);
    console.error('[main] Check that electron/preload.js exists');
    // Use the first path anyway - Electron will show the error
    preloadPath = possiblePaths[0];
  }

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: path.join(__dirname, 'icon.png'),
    title: 'Noteshot',
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allow local file access
    },
  });

  // Add error handlers - MUST be before loadURL
  win.webContents.on('did-start-loading', () => {
    console.log('[main] Window started loading:', win.webContents.getURL());
  });

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('[main] Window failed to load:', errorCode, errorDescription, validatedURL);
  });

  win.webContents.on('preload-error', (event, preloadPath, error) => {
    console.error('[main] ===== PRELOAD ERROR =====');
    console.error('[main] Path:', preloadPath);
    console.error('[main] Error:', error);
    if (error && error.message) {
      console.error('[main] Error message:', error.message);
    }
    if (error && error.stack) {
      console.error('[main] Error stack:', error.stack);
    }
  });

  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (message.includes('[preload]') || message.includes('[test]')) {
      console.log('[renderer]', message);
    }
  });

  // Add DOM ready test - runs before did-finish-load
  win.webContents.once('dom-ready', () => {
    console.log('[main] DOM ready - testing preload...');
    win.webContents.executeJavaScript(`
      console.log('[test] Window DOM ready');
      console.log('[test] __IS_ELECTRON__:', window.__IS_ELECTRON__);
      console.log('[test] desktopAPI:', typeof window.desktopAPI);
      console.log('[test] All window keys:', Object.keys(window).filter(k => k.includes('IS_') || k.includes('desktop')));
      
      // Also log to main console for visibility
      if (window.__IS_ELECTRON__ && window.desktopAPI) {
        console.log('[test] ✅ SUCCESS: Preload script is working!');
        console.log('[test] ✅ Electron flag:', window.__IS_ELECTRON__);
        console.log('[test] ✅ desktopAPI methods:', Object.keys(window.desktopAPI));
      } else {
        console.error('[test] ❌ FAILED: Preload script not working!');
        console.error('[test] __IS_ELECTRON__:', window.__IS_ELECTRON__);
        console.error('[test] desktopAPI:', typeof window.desktopAPI);
      }
    `).catch(err => console.error('[test] Failed to execute test:', err));
  });

  win.webContents.on('did-finish-load', () => {
    console.log('[main] Window finished loading');
    // Check if preload script executed and desktopAPI is available
    win.webContents.executeJavaScript(`
      (function() {
        const isElectron = window.__IS_ELECTRON__ === true;
        const hasDesktopAPI = typeof window.desktopAPI !== 'undefined';
        
        console.log('[main] Electron flag:', isElectron);
        console.log('[main] desktopAPI available:', hasDesktopAPI);
        
        if (isElectron && !hasDesktopAPI) {
          console.error('[main] ERROR: Preload script ran but desktopAPI failed to expose!');
          return { error: 'contextBridge failed', isElectron: true, hasDesktopAPI: false };
        }
        
        return { isElectron, hasDesktopAPI };
      })()
    `).then((result) => {
      if (result.error) {
        console.error('[main] ✗ Preload verification failed:', result);
        console.error('[main] Preload script executed but contextBridge.exposeInMainWorld failed');
        console.error('[main] Check electron/preload.js for errors in contextBridge');
      } else {
        if (result.isElectron && result.hasDesktopAPI) {
          console.log('[main] ✓ Preload verification: Electron detected, desktopAPI available');
        } else if (result.isElectron && !result.hasDesktopAPI) {
          console.error('[main] ✗ Preload verification: Electron detected but desktopAPI missing');
        } else {
          console.log('[main] Preload verification: Not in Electron (browser mode)');
        }
      }
    }).catch((err) => {
      console.error('[main] Error checking preload status:', err);
    });
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
    mainWindow = null;  // Clear the reference when window is closed
  });

  mainWindow = win;
  return win;
}

// Quick Capture Window - Simple white window for quick notes
function createQuickCaptureWindow() {
  if (quickCaptureWindow && !quickCaptureWindow.isDestroyed()) {
    quickCaptureWindow.show();
    quickCaptureWindow.focus();
    return quickCaptureWindow;
  }

  const fs = require('fs');
  const possiblePaths = [
    path.join(__dirname, 'preload.js'),
    path.join(process.cwd(), 'electron', 'preload.js'),
    path.resolve(__dirname, 'preload.js'),
  ];

  let preloadPath = null;
  for (const testPath of possiblePaths) {
    if (fs.existsSync(testPath)) {
      preloadPath = testPath;
      break;
    }
  }

  if (!preloadPath) {
    preloadPath = possiblePaths[0];
  }

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const windowWidth = 400;
  const windowHeight = 400;
  const x = Math.floor((width - windowWidth) / 2);
  const y = Math.floor((height - windowHeight) / 2);

  const win = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: x,
    y: y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    show: false,  // keep hidden until ready
    backgroundColor: '#00000000',
    icon: path.join(__dirname, 'icon.png'),
    title: 'Noteshot - Quick Capture',
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  quickCaptureWindow = win;

  const isDev = !app.isPackaged;
  const devUrl = "http://localhost:3000/quick-capture";
  const prodUrl = `file://${path.join(__dirname, "../out/quick-capture.html")}`;

  win.loadURL(isDev ? devUrl : prodUrl);

  // Show ONLY after ready - prevents double-window and Mac timing issues
  win.once("ready-to-show", () => {
    if (!win.isDestroyed()) {
      win.show();
      win.focus();
    }
  });

  win.on("closed", () => {
    quickCaptureWindow = null;
    pendingQuickNoteId = null;
  });

  return win;
}

let isQuickCaptureOpening = false;

// Quick Capture: Capture screenshot, create note, then open window
async function openQuickCapture() {
  // Only work on Mac
  // if (process.platform !== 'darwin') {
  //   safeLog('[main] Quick capture only available on Mac');
  //   return;
  // }

  // prevent double-trigger if shortcut is pressed twice quickly
  if (isQuickCaptureOpening) {
    safeLog('[main] Quick capture already in progress, ignoring second trigger');
    return;
  }
  isQuickCaptureOpening = true;

  safeLog('[main] Quick capture triggered - capturing screenshot first...');

  try {
    // Step 1: Generate note ID first
    const { randomUUID } = require('crypto');
    const noteId = randomUUID();

    // Step 2: Capture screenshot with note ID (if enabled)
    const autoScreenshot = settingsManager.get('autoScreenshot');
    let screenshotPath = null;

    if (autoScreenshot) {
      screenshotPath = await captureScreenshot(noteId);
      if (!screenshotPath) {
        safeLog('[main] Screenshot capture failed, continuing without screenshot');
      }
    } else {
      safeLog('[main] Auto-screenshot disabled, skipping capture');
    }

    // Step 3: Create note with screenshot
    const now = Date.now();

    // If screenshot exists, add it to content
    const initialContent = screenshotPath ? `![Screenshot](file://${screenshotPath})\n\n` : '';

    await db.createNote({
      id: noteId,
      title: 'untitled',
      content: initialContent,
      tags: JSON.stringify([]),
      createdAt: now,
      updatedAt: now,
      embedding: null,
      screenshotPath: screenshotPath || null,
      coverImagePath: screenshotPath || null, // Set screenshot as cover image
      autoGeneratedTitle: 0,
      autoGeneratedTags: 0,
    });

    safeLog('[main] Quick note created with ID', noteId, 'screenshot:', screenshotPath ? 'yes' : 'no');

    // Step 3: Store note ID and open window
    pendingQuickNoteId = noteId;

    // Open the window - createQuickCaptureWindow handles showing via ready-to-show event
    createQuickCaptureWindow();
  } catch (err) {
    safeError('[main] Quick capture error:', err);
  } finally {
    isQuickCaptureOpening = false;
  }
}



// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  safeLog('[main] ===== APP READY =====');
  safeLog('[main] Creating window...');
  createWindow();

  // Register global shortcut for quick capture (All platforms)
  // if (process.platform === 'darwin') {
  const shortcut = 'Control+Shift+Space';
  const ret = globalShortcut.register(shortcut, () => {
    safeLog('[main] Quick capture hotkey pressed');
    openQuickCapture();
  });

  if (!ret) {
    safeError('[main] Failed to register quick capture hotkey');
  } else {
    safeLog('[main] ✓ Quick capture hotkey registered: Control+Shift+Space');
  }
  // }

  // Unregister all shortcuts when app quits
  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
  });

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
  safeLog('[IPC] Received createNote request');
  safeLog('[IPC] Note data:', {
    id: data.id,
    title: data.title,
    hasEmbedding: !!data.embedding,
    embeddingType: data.embedding ? (Array.isArray(data.embedding) ? 'array' : typeof data.embedding) : 'null'
  });
  const result = await db.createNote(data);
  safeLog('[IPC] Note created successfully');
  return result;
});

ipcMain.handle('db:updateNote', async (_, id, updates) => {
  const result = await db.updateNote(id, updates);
  return result;
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
    safeLog('[IPC] Received embedding generation request, text length:', text.length);
    const embedding = await generateEmbedding(text);
    safeLog('[IPC] Generated embedding, length:', embedding.length);
    return embedding;
  } catch (error) {
    safeError('[IPC] Failed to generate embedding:', error);
    throw error;
  }
});

// AI title generation
ipcMain.handle('ai:generateTitle', async (_, content) => {
  try {
    safeLog('[IPC] Received title generation request, content length:', content.length);
    const title = await generateNoteTitle(content);
    safeLog('[IPC] Generated title:', title);
    return title;
  } catch (error) {
    safeError('[IPC] Failed to generate title:', error);
    throw error;
  }
});

// AI tag generation
ipcMain.handle('ai:generateTags', async (_, content) => {
  try {
    safeLog('[IPC] Received tag generation request, content length:', content.length);
    const tags = await generateNoteTags(content);
    safeLog('[IPC] Generated tags:', tags);
    return tags;
  } catch (error) {
    safeError('[IPC] Failed to generate tags:', error);
    throw error;
  }
});


// Screenshot IPC handler
ipcMain.handle('screenshot:capture', async (_, noteId) => {
  try {
    safeLog('[main] Screenshot capture requested for note', noteId);
    const screenshotPath = await captureScreenshot(noteId);
    return screenshotPath;
  } catch (error) {
    safeError('[main] Screenshot capture failed:', error);
    return null;
  }
});


// Settings IPC handlers
ipcMain.handle('settings:get', async (_, key) => {
  if (key) return settingsManager.get(key);
  return settingsManager.getAll();
});

ipcMain.handle('settings:set', async (_, key, value) => {
  return settingsManager.set(key, value);
});

// Quick Capture IPC handlers
ipcMain.handle('quick-capture:updateNote', async (_, content) => {
  try {
    if (!pendingQuickNoteId) {
      throw new Error('No pending quick note to update');
    }

    if (!content || content.trim().length === 0) {
      throw new Error('Content cannot be empty');
    }

    safeLog('[main] Updating quick note', pendingQuickNoteId, 'with content length:', content.length);

    // Update the note with content
    await db.updateNote(pendingQuickNoteId, {
      content: content.trim(),
      updatedAt: Date.now(),
    });

    safeLog('[main] Quick note updated successfully');

    // Save note ID before clearing
    const noteId = pendingQuickNoteId;
    pendingQuickNoteId = null;

    // Close the window
    if (quickCaptureWindow && !quickCaptureWindow.isDestroyed()) {
      quickCaptureWindow.setAlwaysOnTop(false);
      quickCaptureWindow.hide();
      setTimeout(() => {
        if (quickCaptureWindow && !quickCaptureWindow.isDestroyed()) {
          quickCaptureWindow.destroy();
          quickCaptureWindow = null;
        }
      }, 50);
    }

    // Trigger async AI processing (title, tags, embedding)
    const { generateNoteTitle } = require('./ai/title-generator');
    const { generateNoteTags } = require('./ai/tag-generator');
    const { generateEmbedding } = require('./ai/embeddings');

    Promise.all([
      generateNoteTitle(content).catch(err => {
        safeError('[main] Failed to generate title:', err);
        return 'untitled';
      }),
      generateNoteTags(content).catch(err => {
        safeError('[main] Failed to generate tags:', err);
        return [];
      }),
      generateEmbedding(content).catch(err => {
        safeError('[main] Failed to generate embedding:', err);
        return null;
      }),
    ]).then(([title, tags, embedding]) => {
      const tagsJson = JSON.stringify(tags);
      const embeddingJson = embedding ? JSON.stringify(embedding) : null;

      db.updateNote(noteId, {
        title,
        tags: tagsJson,
        embedding: embeddingJson,
        autoGeneratedTitle: 1,
        autoGeneratedTags: 1,
        updatedAt: Date.now(),
      }).then(() => {
        safeLog('[main] Quick note updated with AI-generated content');
        // Notify main window to refresh
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('note:updated', { id: noteId });
        }
      }).catch(err => {
        safeError('[main] Failed to update note with AI content:', err);
      });
    });

    return { success: true, id: noteId };
  } catch (error) {
    safeError('[main] Quick capture: failed to update note:', error);
    throw error;
  }
});

ipcMain.handle('quick-capture:close', () => {
  if (quickCaptureWindow && !quickCaptureWindow.isDestroyed()) {
    quickCaptureWindow.setAlwaysOnTop(false);
    quickCaptureWindow.hide();
    setTimeout(() => {
      if (quickCaptureWindow && !quickCaptureWindow.isDestroyed()) {
        quickCaptureWindow.destroy();
        quickCaptureWindow = null;
      }
    }, 50);
  }
  // Clear pending note ID if window is closed without saving
  pendingQuickNoteId = null;
});

ipcMain.handle('quick-capture:getPendingNote', async () => {
  if (!pendingQuickNoteId) return null;
  return await db.getNote(pendingQuickNoteId);
});


// Semantic search
ipcMain.handle('embeddings:semanticSearch', async (_, queryEmbedding) => {
  try {
    safeLog('[IPC] Received semantic search request');
    safeLog('[IPC] Query embedding type:', Array.isArray(queryEmbedding) ? 'array' : typeof queryEmbedding);
    safeLog('[IPC] Query embedding length:', queryEmbedding.length);

    const allNotes = await db.getAllNotes();
    safeLog('=== Semantic Search Debug ===');
    safeLog('Total notes in database:', allNotes.length);
    safeLog('Query embedding length:', queryEmbedding.length);

    // Analyze notes and their embeddings
    const notesWithEmbeddings = allNotes.filter(n => {
      if (!n.embedding) {
        return false;
      }
      try {
        const parsed = JSON.parse(n.embedding);
        if (!Array.isArray(parsed)) {
          safeLog('Note', n.id, 'has embedding that is not an array');
          return false;
        }
        if (parsed.length === 0) {
          safeLog('Note', n.id, 'has empty embedding array');
          return false;
        }
        if (parsed.length !== queryEmbedding.length) {
          safeLog('Note', n.id, 'has embedding with wrong length:', parsed.length, 'expected:', queryEmbedding.length);
          return false;
        }
        return true;
      } catch (e) {
        safeLog('Failed to parse embedding for note', n.id, ':', e.message);
        return false;
      }
    });

    safeLog('Notes with valid embeddings:', notesWithEmbeddings.length);

    if (notesWithEmbeddings.length === 0) {
      safeLog('⚠️  WARNING: No notes with valid embeddings found!');
      safeLog('   - This means no notes have embeddings generated yet');
      safeLog('   - Create or update notes to generate embeddings');
      safeLog('   - Sample of first note embedding:', allNotes[0]?.embedding ? JSON.parse(allNotes[0].embedding).slice(0, 3) : 'null');
      return [];
    }

    const ranked = allNotes
      .map(note => {
        let embedding = [];
        if (note.embedding) {
          try {
            embedding = JSON.parse(note.embedding);
            if (!Array.isArray(embedding) || embedding.length === 0) {
              return null;
            }
          } catch (e) {
            safeLog('Failed to parse embedding for note', note.id, e);
            return null;
          }
        } else {
          return null;
        }

        return {
          ...note,
          embedding,
        };
      })
      .filter(note => note !== null && note.embedding && note.embedding.length > 0);

    safeLog('Notes with valid embeddings after filtering:', ranked.length);

    if (ranked.length === 0) {
      safeLog('⚠️  All notes were filtered out during processing');
      return [];
    }

    const scored = ranked.map(note => {
      try {
        const score = cosineSimilarity(queryEmbedding, note.embedding);
        return {
          ...note,
          score,
        };
      } catch (e) {
        safeError('Error calculating similarity for note', note.id, ':', e);
        return null;
      }
    }).filter(note => note !== null);

    const sorted = scored.sort((a, b) => b.score - a.score);
    safeLog('Top 3 results:');
    sorted.slice(0, 3).forEach((r, i) => {
      safeLog(`  ${i + 1}. ${r.title} (score: ${r.score.toFixed(4)})`);
    });
    safeLog('=== End Semantic Search Debug ===');

    // Return results with all note fields plus score
    // The frontend will convert these using sqliteToNote
    return sorted;
  } catch (error) {
    safeError('Semantic search failed:', error);
    throw error;
  }
});

// Cover Image IPC handlers
ipcMain.handle('cover-image:selectFile', async () => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  } catch (error) {
    safeError('[main] Cover image file selection failed:', error);
    return null;
  }
});

ipcMain.handle('cover-image:saveFile', async (_, sourcePath, noteId) => {
  try {
    if (!sourcePath || !noteId) {
      safeError('[main] Cover image save: missing sourcePath or noteId');
      return null;
    }

    // Get cover images directory
    const userDataPath = app.getPath('userData');
    const coverImagesDir = path.join(userDataPath, 'cover-images');

    // Create directory if it doesn't exist
    if (!fs.existsSync(coverImagesDir)) {
      fs.mkdirSync(coverImagesDir, { recursive: true });
      safeLog('[main] Created cover-images directory:', coverImagesDir);
    }

    // Get file extension from source file
    const ext = path.extname(sourcePath).toLowerCase() || '.png';

    // Generate destination filename: {noteId}.{ext}
    const filename = `${noteId}${ext}`;
    const destPath = path.join(coverImagesDir, filename);

    // Copy file
    fs.copyFileSync(sourcePath, destPath);
    safeLog('[main] Cover image saved to:', destPath);

    return destPath;
  } catch (error) {
    safeError('[main] Cover image save failed:', error);
    return null;
  }
});


ipcMain.handle('cover-image:deleteFile', async (_, imagePath) => {
  try {
    if (!imagePath) {
      return false;
    }

    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
      safeLog('[main] Cover image deleted:', imagePath);
      return true;
    }

    return false;
  } catch (error) {
    safeError('[main] Cover image delete failed:', error);
    return false;
  }
});

// App Logo handlers
ipcMain.handle('app-logo:upload', async () => {
  try {
    // Select file
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return null;
    }

    const sourcePath = result.filePaths[0];
    const ext = path.extname(sourcePath);
    const destPath = path.join(app.getPath('userData'), `app-logo${ext}`);

    // Copy file
    fs.copyFileSync(sourcePath, destPath);
    safeLog('[main] App logo saved to:', destPath);

    return destPath;
  } catch (error) {
    safeError('[main] App logo upload failed:', error);
    return null;
  }
});

ipcMain.handle('app-logo:get', async () => {
  try {
    const userDataPath = app.getPath('userData');
    const possibleExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

    for (const ext of possibleExtensions) {
      const logoPath = path.join(userDataPath, `app-logo.${ext}`);
      if (fs.existsSync(logoPath)) {
        return logoPath;
      }
    }

    return null;
  } catch (error) {
    safeError('[main] App logo get failed:', error);
    return null;
  }
});

// Note Icon handler (reuses cover image infrastructure)
ipcMain.handle('note-icon:save', async (_, sourcePath, noteId) => {
  try {
    if (!sourcePath || !noteId) {
      safeError('[main] Note icon save: missing sourcePath or noteId');
      return null;
    }

    const userDataPath = app.getPath('userData');
    const noteIconsDir = path.join(userDataPath, 'note-icons');

    // Create directory if it doesn't exist
    if (!fs.existsSync(noteIconsDir)) {
      fs.mkdirSync(noteIconsDir, { recursive: true });
    }

    const ext = path.extname(sourcePath);
    const destPath = path.join(noteIconsDir, `${noteId}${ext}`);

    // Copy file
    fs.copyFileSync(sourcePath, destPath);
    safeLog('[main] Note icon saved to:', destPath);

    return destPath;
  } catch (error) {
    safeError('[main] Note icon save failed:', error);
    return null;
  }
});

// Generic Image Saving (for editor content)
ipcMain.handle('image:save', async (_, arrayBuffer, filename) => {
  try {
    if (!arrayBuffer || !filename) {
      safeError('[main] Image save: missing data or filename');
      return null;
    }

    // Get images directory
    const userDataPath = app.getPath('userData');
    const imagesDir = path.join(userDataPath, 'images');

    // Create directory if it doesn't exist
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
      safeLog('[main] Created images directory:', imagesDir);
    }

    // Generate unique filename to prevent collisions
    const ext = path.extname(filename).toLowerCase() || '.png';
    const name = path.basename(filename, ext);
    const { randomUUID } = require('crypto');
    const uniqueFilename = `${name}-${randomUUID()}${ext}`;
    const destPath = path.join(imagesDir, uniqueFilename);

    // Write file
    fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
    safeLog('[main] Image saved to:', destPath);

    // Return the absolute path (or a protocol URL if we set up a custom protocol later)
    // For now, returning absolute path which Electron can load if webSecurity is false
    return destPath;
  } catch (error) {
    safeError('[main] Image save failed:', error);
    return null;
  }
});


