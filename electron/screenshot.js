const { desktopCapturer, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');
const { app, screen } = require('electron');

// Safe logging utility to prevent EPIPE errors
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

/**
 * Capture screenshot of the entire screen
 * @param {string} noteId - Note ID to use as filename
 * @returns {Promise<string | null>} - Absolute path to saved screenshot, or null if failed
 */
async function captureScreenshot(noteId) {
  try {
    console.log('[screenshot] Starting screenshot capture for note:', noteId);
    
    // Get screenshots directory in userData/videos/screenshots (like game saves)
    const userDataPath = app.getPath('userData');
    const videosDir = path.join(userDataPath, 'videos');
    const screenshotsDir = path.join(videosDir, 'screenshots');
    
    console.log('[screenshot] User data path:', userDataPath);
    console.log('[screenshot] Videos directory:', videosDir);
    console.log('[screenshot] Screenshots directory:', screenshotsDir);
    
    // Create directories if they don't exist (videos first, then screenshots inside)
    if (!fs.existsSync(videosDir)) {
      fs.mkdirSync(videosDir, { recursive: true });
      console.log('[screenshot] Created videos directory:', videosDir);
    }
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
      console.log('[screenshot] Created screenshots directory:', screenshotsDir);
    }

    // Get primary display bounds
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;
    
    console.log('[screenshot] Primary display size:', width, 'x', height);
    
    // Get all available screen sources
    console.log('[screenshot] Getting screen sources...');
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width, height } // Full resolution
    });

    console.log('[screenshot] Found', sources?.length || 0, 'screen sources');

    if (!sources || sources.length === 0) {
      console.error('[screenshot] No screen sources available');
      return null;
    }

    // Find the primary display source (usually the first one or the one matching primary display)
    const primarySource = sources.find(s => s.display_id === primaryDisplay.id.toString()) || sources[0];
    
    console.log('[screenshot] Using source:', primarySource.name, 'display_id:', primarySource.display_id);
    
    if (!primarySource.thumbnail) {
      console.error('[screenshot] No thumbnail available from source');
      return null;
    }

    // Convert thumbnail to PNG buffer (thumbnail is already at full resolution)
    const image = primarySource.thumbnail;
    const pngBuffer = image.toPNG();
    
    console.log('[screenshot] PNG buffer size:', pngBuffer.length, 'bytes');

    // Save to file
    const filename = `${noteId}.png`;
    const filePath = path.join(screenshotsDir, filename);
    
    fs.writeFileSync(filePath, pngBuffer);
    console.log('[screenshot] ✓ Screenshot saved successfully to:', filePath);
    console.log('[screenshot] File exists:', fs.existsSync(filePath));

    // Return absolute path
    return filePath;
  } catch (error) {
    safeError('[screenshot] ✗ Failed to capture screenshot:', error);
    safeError('[screenshot] Error stack:', error.stack);
    return null;
  }
}

module.exports = { captureScreenshot };

