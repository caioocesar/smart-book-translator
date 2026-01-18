# 🔧 Quick Fix for Current Issues

## Issue 1: LibreTranslate Shows "STOPPED" But Is Running

### Problem
The UI shows LibreTranslate as "STOPPED" but Docker shows it's running at high CPU usage.

### Cause
The health check is timing out because LibreTranslate is slow to respond (possibly still initializing).

### Solution
**Already Fixed!** I've increased the health check timeout from 5 seconds to 15 seconds.

**To apply the fix:**
1. Stop the app
2. Restart it with `START-APP-SIMPLE.bat`
3. Wait 30 seconds for LibreTranslate to fully start
4. The status should update to "RUNNING"

**If still showing STOPPED:**
1. Click the "🏠 Local" indicator in the header
2. This opens the status modal showing real-time info
3. Click "Refresh Status" button
4. If it shows running in the modal but not in the header, refresh the page

---

## Issue 2: Ollama Not Found

### Problem
Error: "O Windows não pode encontrar 'ollama'" (Windows cannot find 'ollama')

### Cause
Ollama is not installed on your system.

### Solution

**Option 1: One-Click Installation (Easiest)** ⭐

1. **Right-click** `INSTALL-OLLAMA.bat`
2. Select **"Run as administrator"**
3. Follow the installer wizard (click Next-Next-Finish)
4. **Restart your computer**
5. Restart the app

**If you get PowerShell errors:**
- Just use Option 2 (Manual Installation) instead
- It's simpler and works the same way

**Option 2: Manual Installation**

1. Visit https://ollama.com
2. Click "Download for Windows"
3. Run the installer
4. Restart your computer
5. Restart the app

**Option 3: Skip Ollama (For Now)**

If you don't need the LLM enhancement layer:
1. Just uncheck "🤖 Use LLM Enhancement Layer" in the translation settings
2. Translation will work fine without it
3. You can install Ollama later when needed

---

## Issue 3: Slow LibreTranslate Startup

### Problem
LibreTranslate takes a long time to start and uses high CPU.

### Cause
LibreTranslate is loading language models into memory (normal behavior).

### What's Happening
- **First 1-2 minutes:** High CPU usage (40-60%) - Loading models
- **After 2 minutes:** CPU drops to 5-10% - Ready to use
- **Status:** May show "STOPPED" during initialization

### Solution
**Just wait!** This is normal. LibreTranslate needs time to:
1. Start the Docker container
2. Load all language models into RAM
3. Initialize the translation engine

**Expected timeline:**
- 0-30s: Container starting
- 30s-2min: Loading models (high CPU)
- 2min+: Ready (low CPU)

**How to check if it's working:**
1. Open Docker Desktop
2. Look for "libretranslate" container
3. If it shows "Running" - it's working!
4. Wait for CPU to drop below 10%
5. Refresh the app status

---

## Testing After Fixes

### Test LibreTranslate
1. Restart the app
2. Wait 2-3 minutes
3. Click "🏠 Local" in header
4. Status modal should show "Running"
5. Try a small translation

### Test Ollama (After Installing)
1. Open Command Prompt
2. Type: `ollama --version`
3. Should show version number
4. In the app, go to Settings → LLM Enhancement
5. Should show "✓ Installed"
6. Click "Download Model" if needed
7. Wait 2-5 minutes for download
8. Status should show "✓ Ready"

---

## Still Having Issues?

### LibreTranslate Won't Start

**Easy Way:**
- Double-click `RESTART-LIBRETRANSLATE.bat`
- Wait 2-3 minutes
- Restart the app

**Manual Way:**
1. Check Docker Desktop is running
2. Stop all libretranslate containers:
   ```bash
   docker stop $(docker ps -q --filter ancestor=libretranslate/libretranslate)
   docker rm $(docker ps -aq --filter ancestor=libretranslate/libretranslate)
   ```
3. Restart the app
4. Click "Start LibreTranslate" in Settings

**If Docker is not installed:**
- Right-click `INSTALL-DOCKER.bat` → Run as administrator
- Follow the installer
- Restart your computer

### Ollama Won't Start

**Easy Way:**
- Double-click `RESTART-OLLAMA.bat`
- Wait a few seconds
- Restart the app

**Manual Way:**
1. Check if installed: `ollama --version`
2. Try manual start: `ollama serve`
3. If error, reinstall Ollama
4. Make sure Windows Defender isn't blocking it

**If Ollama is not installed:**
- Right-click `INSTALL-OLLAMA.bat` → Run as administrator
- Follow the installer
- Restart your computer

### App Won't Connect
1. Close the app completely
2. Stop all Docker containers
3. Restart Docker Desktop
4. Wait 30 seconds
5. Start the app again

---

## Quick Commands

### Check Ollama
```cmd
ollama --version
ollama list
ollama serve
```

### Check LibreTranslate
```cmd
docker ps
docker logs libretranslate
curl http://localhost:5001/languages
```

### Restart Everything

**Easy Way:**
```cmd
# Restart all services at once
RESTART-ALL-SERVICES.bat

# Then start the app
START-APP-SIMPLE.bat
```

**Manual Way:**
```cmd
# Stop app
# Stop Docker containers
docker stop $(docker ps -q)

# Restart Docker Desktop
# Wait 30 seconds

# Start app
START-APP-SIMPLE.bat
```

---

## Summary

✅ **LibreTranslate:** Fixed - just wait 2-3 minutes for full startup
✅ **Ollama:** Not installed - install from ollama.com or use the script
✅ **Both:** Auto-start is enabled - they'll start automatically when you open the app

**Next time you start the app:**
1. Wait 2-3 minutes
2. Both services should auto-start
3. Status will update automatically
4. You're ready to translate!
