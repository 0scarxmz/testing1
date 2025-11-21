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

const { app, BrowserWindow, ipcMain, globalShortcut, screen } = require('electron');

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

// Store references to windows
let mainWindow = null;
let quickCaptureWindow = null;

// Store pending screenshot for quick capture (captured when window opens)
let pendingQuickCaptureScreenshot = null;

function createWindow() {
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
    // Dereference the window object
  });

  mainWindow = win;
  return win;
}

// Quick Capture Window
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
  const windowWidth = 500;
  const windowHeight = 240;
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
    show: false,
    backgroundColor: '#00000000',
    vibrancy: 'popover', // macOS glass effect
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  // Determine if we're in development or production
  const isDev = !app.isPackaged;
  const devUrl = "http://localhost:3000/quick-capture";
  const prodUrl = `file://${path.join(__dirname, "../out/quick-capture.html")}`;

  win.loadURL(isDev ? devUrl : prodUrl);

  win.once('ready-to-show', () => {
    win.show();
    win.focus();
  });

  win.on('closed', () => {
    // Clear pending screenshot if window is closed without creating note
    if (pendingQuickCaptureScreenshot) {
      const fs = require('fs');
      try {
        if (fs.existsSync(pendingQuickCaptureScreenshot.path)) {
          fs.unlinkSync(pendingQuickCaptureScreenshot.path);
          console.log('[main] Cleaned up pending screenshot:', pendingQuickCaptureScreenshot.path);
        }
      } catch (err) {
        console.error('[main] Failed to clean up pending screenshot:', err);
      }
      pendingQuickCaptureScreenshot = null;
    }
    quickCaptureWindow = null;
  });

  quickCaptureWindow = win;
  return win;
}

async function toggleQuickCaptureWindow() {
  if (quickCaptureWindow && !quickCaptureWindow.isDestroyed() && quickCaptureWindow.isVisible()) {
    quickCaptureWindow.hide();
    // Clear pending screenshot if window is closed without creating note
    pendingQuickCaptureScreenshot = null;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.focus();
    }
  } else {
    // Capture screenshot BEFORE opening window
    console.log('[main] Capturing screenshot before opening quick capture window...');
    const { randomUUID } = require('crypto');
    const tempId = randomUUID();
    
    // Capture screenshot in background (don't block window opening)
    captureScreenshot(tempId).then(screenshotPath => {
      if (screenshotPath) {
        console.log('[main] Screenshot captured for quick capture:', screenshotPath);
        pendingQuickCaptureScreenshot = {
          tempId: tempId,
          path: screenshotPath
        };
      } else {
        console.warn('[main] Screenshot capture failed, continuing without screenshot');
        pendingQuickCaptureScreenshot = null;
      }
    }).catch(err => {
      console.error('[main] Screenshot capture error:', err);
      pendingQuickCaptureScreenshot = null;
    });
    
    // Open window immediately (don't wait for screenshot)
    if (quickCaptureWindow && !quickCaptureWindow.isDestroyed()) {
      quickCaptureWindow.show();
      quickCaptureWindow.focus();
    } else {
      createQuickCaptureWindow();
    }
  }
}

// Async processing function for quick capture notes
async function processQuickNoteAsync(noteId, content, existingScreenshotPath = null) {
  try {
    console.log('[main] Starting async processing for quick note', noteId);
    
    // Only capture screenshot if we don't already have one (from quick capture window opening)
    if (!existingScreenshotPath) {
      // This is for regular notes, not quick capture
      captureScreenshot(noteId).then(screenshotPath => {
        if (screenshotPath) {
          console.log('[main] Screenshot captured for note', noteId);
          db.updateNote(noteId, {
            screenshotPath: screenshotPath,
            updatedAt: Date.now(),
          }).then(() => {
            console.log('[main] Note updated with screenshot path:', screenshotPath);
            // Notify main window to refresh
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('note:updated', { id: noteId });
            }
          }).catch(err => {
            console.error('[main] Failed to update note with screenshot path:', err);
          });
        } else {
          console.warn('[main] Screenshot capture failed for note', noteId);
        }
      }).catch(err => {
        console.error('[main] Screenshot capture error:', err);
      });
    } else {
      console.log('[main] Note already has screenshot from quick capture, skipping capture');
    }
    
    // Generate title, tags, and embedding in parallel
    const [title, tags, embedding] = await Promise.all([
      generateNoteTitle(content).catch(err => {
        console.error('[main] Failed to generate title:', err);
        return 'untitled';
      }),
      generateNoteTags(content).catch(err => {
        console.error('[main] Failed to generate tags:', err);
        return [];
      }),
      generateEmbedding(content).catch(err => {
        console.error('[main] Failed to generate embedding:', err);
        return null;
      }),
    ]);

    console.log('[main] Generated:', { title, tags, hasEmbedding: !!embedding });

    // Update note with generated fields
    const tagsJson = JSON.stringify(tags);
    const embeddingJson = embedding ? JSON.stringify(embedding) : null;

    await db.updateNote(noteId, {
      title,
      tags: tagsJson,
      embedding: embeddingJson,
      autoGeneratedTitle: 1,
      autoGeneratedTags: 1,
      updatedAt: Date.now(),
    });

    console.log('[main] Successfully updated quick note', noteId, 'with AI-generated content');

    // Notify main window to refresh
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('note:updated', { id: noteId });
    }
  } catch (error) {
    console.error('[main] Error in async processing for quick note', noteId, ':', error);
  }
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  console.log('[main] ===== APP READY =====');
  console.log('[main] Creating window...');
  createWindow();

  // Register global shortcut for quick capture
  const ret = globalShortcut.register('CommandOrControl+Shift+Space', () => {
    console.log('[main] Quick capture hotkey pressed');
    toggleQuickCaptureWindow();
  });

  if (!ret) {
    console.error('[main] Failed to register quick capture hotkey');
  } else {
    console.log('[main] ✓ Quick capture hotkey registered: Ctrl+Shift+Space');
  }

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
  console.log('[IPC] Received createNote request');
  console.log('[IPC] Note data:', {
    id: data.id,
    title: data.title,
    hasEmbedding: !!data.embedding,
    embeddingType: data.embedding ? (Array.isArray(data.embedding) ? 'array' : typeof data.embedding) : 'null'
  });
  const result = await db.createNote(data);
  console.log('[IPC] Note created successfully');
  return result;
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
    console.log('[IPC] Received embedding generation request, text length:', text.length);
    const embedding = await generateEmbedding(text);
    console.log('[IPC] Generated embedding, length:', embedding.length);
    return embedding;
  } catch (error) {
    console.error('[IPC] Failed to generate embedding:', error);
    throw error;
  }
});

// AI title generation
ipcMain.handle('ai:generateTitle', async (_, content) => {
  try {
    console.log('[IPC] Received title generation request, content length:', content.length);
    const title = await generateNoteTitle(content);
    console.log('[IPC] Generated title:', title);
    return title;
  } catch (error) {
    console.error('[IPC] Failed to generate title:', error);
    throw error;
  }
});

// AI tag generation
ipcMain.handle('ai:generateTags', async (_, content) => {
  try {
    console.log('[IPC] Received tag generation request, content length:', content.length);
    const tags = await generateNoteTags(content);
    console.log('[IPC] Generated tags:', tags);
    return tags;
  } catch (error) {
    console.error('[IPC] Failed to generate tags:', error);
    throw error;
  }
});

// Quick Capture IPC handlers
ipcMain.handle('quick-capture:createNote', async (_, content) => {
  try {
    console.log('[main] Quick capture: creating note, content length:', content.length);
    
    if (!content || content.trim().length === 0) {
      throw new Error('Content cannot be empty');
    }

    // Generate UUID for note ID
    const { randomUUID } = require('crypto');
    const id = randomUUID();
    const now = Date.now();

    // Handle pending screenshot (captured when window opened)
    let screenshotPath = null;
    if (pendingQuickCaptureScreenshot) {
      const fs = require('fs');
      const path = require('path');
      
      // Rename screenshot file from temp ID to real note ID
      const oldPath = pendingQuickCaptureScreenshot.path;
      const screenshotsDir = path.dirname(oldPath);
      const newPath = path.join(screenshotsDir, `${id}.png`);
      
      try {
        if (fs.existsSync(oldPath)) {
          fs.renameSync(oldPath, newPath);
          screenshotPath = newPath;
          console.log('[main] Renamed screenshot from', pendingQuickCaptureScreenshot.tempId, 'to', id);
        } else {
          console.warn('[main] Pending screenshot file not found:', oldPath);
        }
      } catch (err) {
        console.error('[main] Failed to rename screenshot:', err);
        // Continue without screenshot
      }
      
      // Clear pending screenshot
      pendingQuickCaptureScreenshot = null;
    }

    // Create note with defaults (title="untitled", tags=[], embedding=null, screenshot if available)
    await db.createNote({
      id,
      title: 'untitled',
      content: content.trim(),
      tags: JSON.stringify([]),
      createdAt: now,
      updatedAt: now,
      embedding: null,
      screenshotPath: screenshotPath,
      autoGeneratedTitle: 0,
      autoGeneratedTags: 0,
    });

    console.log('[main] Quick capture: note created with ID', id, 'screenshot:', screenshotPath ? 'yes' : 'no');

    // Close quick capture window immediately
    if (quickCaptureWindow && !quickCaptureWindow.isDestroyed()) {
      quickCaptureWindow.hide();
    }

    // Trigger async AI processing in background (screenshot already attached, so don't capture again)
    processQuickNoteAsync(id, content, screenshotPath).catch(err => {
      console.error('[main] Failed to start async processing for quick note:', err);
    });

    return { success: true, id };
  } catch (error) {
    console.error('[main] Quick capture: failed to create note:', error);
    throw error;
  }
});

ipcMain.handle('quick-capture:close', () => {
  if (quickCaptureWindow && !quickCaptureWindow.isDestroyed()) {
    quickCaptureWindow.hide();
  }
});

// Screenshot IPC handler
ipcMain.handle('screenshot:capture', async (_, noteId) => {
  try {
    console.log('[main] Screenshot capture requested for note', noteId);
    const screenshotPath = await captureScreenshot(noteId);
    return screenshotPath;
  } catch (error) {
    console.error('[main] Screenshot capture failed:', error);
    return null;
  }
});

// Semantic search
ipcMain.handle('embeddings:semanticSearch', async (_, queryEmbedding) => {
  try {
    console.log('[IPC] Received semantic search request');
    console.log('[IPC] Query embedding type:', Array.isArray(queryEmbedding) ? 'array' : typeof queryEmbedding);
    console.log('[IPC] Query embedding length:', queryEmbedding.length);
    
    const allNotes = await db.getAllNotes();
    console.log('=== Semantic Search Debug ===');
    console.log('Total notes in database:', allNotes.length);
    console.log('Query embedding length:', queryEmbedding.length);
    
    // Analyze notes and their embeddings
    const notesWithEmbeddings = allNotes.filter(n => {
      if (!n.embedding) {
        return false;
      }
      try {
        const parsed = JSON.parse(n.embedding);
        if (!Array.isArray(parsed)) {
          console.warn('Note', n.id, 'has embedding that is not an array');
          return false;
        }
        if (parsed.length === 0) {
          console.warn('Note', n.id, 'has empty embedding array');
          return false;
        }
        if (parsed.length !== queryEmbedding.length) {
          console.warn('Note', n.id, 'has embedding with wrong length:', parsed.length, 'expected:', queryEmbedding.length);
          return false;
        }
        return true;
      } catch (e) {
        console.warn('Failed to parse embedding for note', n.id, ':', e.message);
        return false;
      }
    });
    
    console.log('Notes with valid embeddings:', notesWithEmbeddings.length);
    
    if (notesWithEmbeddings.length === 0) {
      console.warn('⚠️  WARNING: No notes with valid embeddings found!');
      console.warn('   - This means no notes have embeddings generated yet');
      console.warn('   - Create or update notes to generate embeddings');
      console.warn('   - Sample of first note embedding:', allNotes[0]?.embedding ? JSON.parse(allNotes[0].embedding).slice(0, 3) : 'null');
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
            console.warn('Failed to parse embedding for note', note.id, e);
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
    
    console.log('Notes with valid embeddings after filtering:', ranked.length);
    
    if (ranked.length === 0) {
      console.warn('⚠️  All notes were filtered out during processing');
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
        console.error('Error calculating similarity for note', note.id, ':', e);
        return null;
      }
    }).filter(note => note !== null);
    
    const sorted = scored.sort((a, b) => b.score - a.score);
    console.log('Top 3 results:');
    sorted.slice(0, 3).forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.title} (score: ${r.score.toFixed(4)})`);
    });
    console.log('=== End Semantic Search Debug ===');
    
    // Return results with all note fields plus score
    // The frontend will convert these using sqliteToNote
    return sorted;
  } catch (error) {
    console.error('Semantic search failed:', error);
    throw error;
  }
});

