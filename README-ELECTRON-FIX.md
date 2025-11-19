# Fixing Electron + better-sqlite3 Issues

## Issue 1: better-sqlite3 Module Version Mismatch

The error indicates that `better-sqlite3` was compiled for a different Node.js version than Electron uses.

### Solution (Already Applied):

**Electron has been downgraded to version 33.2.0** which is compatible with `better-sqlite3@12.4.1`.

If you still encounter issues:

1. **Rebuild better-sqlite3:**
   ```bash
   npm run rebuild:electron
   ```

2. **If that doesn't work, reinstall:**
   ```bash
   rm -rf node_modules
   npm install
   ```

## Issue 2: OPENAI_API_KEY Not Set

### Solution:

1. **Create `.env.local` file in the project root:**
   ```
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

2. **Get your API key from:**
   https://platform.openai.com/api-keys

3. **Restart Electron after creating the file**

## Alternative: Use Environment Variables Directly

If `.env.local` doesn't work, you can set the environment variable directly:

**Windows (PowerShell):**
```powershell
$env:OPENAI_API_KEY="sk-your-key-here"
npm run desktop:dev
```

**Windows (CMD):**
```cmd
set OPENAI_API_KEY=sk-your-key-here
npm run desktop:dev
```

**macOS/Linux:**
```bash
export OPENAI_API_KEY=sk-your-key-here
npm run desktop:dev
```

## Verifying the Fix

After applying the fixes, check the Electron console (DevTools) for:
- "OPENAI_API_KEY loaded: true"
- No more "NODE_MODULE_VERSION" errors

