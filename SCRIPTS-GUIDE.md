# 📜 Scripts Guide - Smart Book Translator

Complete guide to all batch scripts for easy management of the application.

---

## 🚀 Quick Start Scripts

### `START-APP-SIMPLE.bat`
**Purpose:** Start the Smart Book Translator application  
**Usage:** Double-click to run  
**What it does:**
- Starts backend server (Node.js)
- Starts frontend (React/Vite)
- Opens browser automatically
- Shows real-time logs

**When to use:** Every time you want to use the app

---

## 🔧 Installation Scripts

### `INSTALL-DOCKER.bat` ⭐
**Purpose:** Install Docker Desktop for Windows  
**Usage:** Right-click → Run as administrator  
**What it does:**
- Downloads Docker Desktop installer (~500MB)
- Installs Docker with quiet mode
- Prompts for computer restart

**When to use:** 
- First time setup
- If LibreTranslate won't work (needs Docker)
- If Docker is corrupted or missing

**Requirements:** Administrator privileges

---

### `INSTALL-OLLAMA.bat` ⭐
**Purpose:** Install Ollama for LLM enhancements  
**Usage:** Right-click → Run as administrator  
**What it does:**
- Downloads Ollama installer
- Runs installation wizard
- Verifies installation
- Starts Ollama service

**When to use:**
- If you want LLM enhancement features
- Optional - not required for basic translation

**Requirements:** Administrator privileges

---

### `INSTALL-CLEAN.bat`
**Purpose:** Clean install of all dependencies  
**Usage:** Double-click to run  
**What it does:**
- Removes old node_modules
- Installs fresh dependencies
- Fixes corrupted installations

**When to use:**
- After database changes
- If npm install errors occur
- Fresh start needed

---

### `INSTALL-AND-BUILD.bat` ⭐
**Purpose:** Install dependencies AND build installer  
**Usage:** Right-click → Run as administrator  
**What it does:**
- Cleans old installer files
- Installs dependencies (if needed)
- Builds frontend
- Creates Windows installer (NSIS + Portable)
- Opens dist folder

**When to use:**
- Building installer for distribution
- One-click build process

**Requirements:** Administrator privileges (for symlinks)

---

## 🔄 Restart Scripts

### `RESTART-LIBRETRANSLATE.bat` ⭐
**Purpose:** Restart LibreTranslate Docker container  
**Usage:** Double-click to run  
**What it does:**
- Stops all LibreTranslate containers
- Removes old containers
- Starts fresh container
- Waits for initialization (90 seconds)
- Shows container status

**When to use:**
- LibreTranslate shows "STOPPED" but should be running
- LibreTranslate is stuck or not responding
- After Docker restart
- To fix connection issues

**Requirements:** Docker Desktop must be running

---

### `RESTART-OLLAMA.bat` ⭐
**Purpose:** Restart Ollama service  
**Usage:** Double-click to run  
**What it does:**
- Stops all Ollama processes
- Starts Ollama service in background
- Verifies service is responding
- Shows installed models

**When to use:**
- Ollama not responding
- After computer restart
- LLM enhancements not working
- To refresh Ollama service

**Requirements:** Ollama must be installed

---

### `RESTART-ALL-SERVICES.bat` ⭐⭐⭐
**Purpose:** Restart BOTH LibreTranslate and Ollama  
**Usage:** Double-click to run  
**What it does:**
- Restarts LibreTranslate (if Docker available)
- Restarts Ollama (if installed)
- Waits for full initialization (60 seconds)
- Shows status summary

**When to use:**
- After computer restart
- Both services not working
- Quick fix for all services
- **Recommended for troubleshooting**

**Requirements:** 
- Docker Desktop running (for LibreTranslate)
- Ollama installed (for LLM features)

---

## 🏗️ Build Scripts

### `BUILD-INSTALLER.bat`
**Purpose:** Build installer only (no dependency install)  
**Usage:** Double-click to run  
**What it does:**
- Checks if dependencies installed
- Builds Windows installer
- Opens dist folder

**When to use:**
- Dependencies already installed
- Quick rebuild needed
- Testing installer changes

---

## 📋 Script Comparison

| Script | Admin Required | Time | Purpose |
|--------|---------------|------|---------|
| `START-APP-SIMPLE.bat` | No | 30-60s | Start app |
| `INSTALL-DOCKER.bat` | Yes | 10-15min | Install Docker |
| `INSTALL-OLLAMA.bat` | Yes | 2-5min | Install Ollama |
| `INSTALL-CLEAN.bat` | No | 2-5min | Clean install deps |
| `INSTALL-AND-BUILD.bat` | Yes | 5-10min | Install + build |
| `RESTART-LIBRETRANSLATE.bat` | No | 2-3min | Restart LibreTranslate |
| `RESTART-OLLAMA.bat` | No | 5-10s | Restart Ollama |
| `RESTART-ALL-SERVICES.bat` | No | 2-3min | Restart both |
| `BUILD-INSTALLER.bat` | No | 3-5min | Build installer |

---

## 🎯 Common Scenarios

### Scenario 1: First Time Setup
```
1. INSTALL-DOCKER.bat (as admin)
2. Restart computer
3. INSTALL-OLLAMA.bat (as admin) [optional]
4. Restart computer
5. START-APP-SIMPLE.bat
```

### Scenario 2: LibreTranslate Not Working
```
1. Check Docker Desktop is running
2. RESTART-LIBRETRANSLATE.bat
3. Wait 2-3 minutes
4. START-APP-SIMPLE.bat
```

### Scenario 3: Ollama Not Working
```
1. RESTART-OLLAMA.bat
2. Wait 10 seconds
3. START-APP-SIMPLE.bat
```

### Scenario 4: Nothing Works
```
1. RESTART-ALL-SERVICES.bat
2. Wait 3 minutes
3. START-APP-SIMPLE.bat
```

### Scenario 5: Build Installer for Distribution
```
1. INSTALL-AND-BUILD.bat (as admin)
2. Wait 5-10 minutes
3. Find installer in: electron\dist\
4. Test on clean Windows machine
```

### Scenario 6: After Computer Restart
```
1. Wait 1 minute (Docker auto-starts)
2. RESTART-ALL-SERVICES.bat
3. Wait 2-3 minutes
4. START-APP-SIMPLE.bat
```

---

## 🔍 Troubleshooting

### Script Won't Run
- **Right-click → Properties → Unblock** (if downloaded from internet)
- Run as administrator if needed
- Check antivirus isn't blocking it

### "Docker not running" Error
1. Open Docker Desktop
2. Wait for Docker to fully start (whale icon in system tray)
3. Run script again

### "Ollama not found" Error
1. Install Ollama: `INSTALL-OLLAMA.bat`
2. Restart computer
3. Run script again

### Script Hangs or Freezes
- Press `Ctrl+C` to cancel
- Close terminal window
- Try again

### Permission Errors
- Right-click script
- Select "Run as administrator"
- Try again

---

## 📝 Script Details

### What "Run as Administrator" Means
- Right-click the `.bat` file
- Select "Run as administrator" from menu
- Click "Yes" on UAC prompt
- Required for: installing software, creating symlinks

### What Each Script Creates

**INSTALL-DOCKER.bat:**
- Downloads to: `%TEMP%\docker-install\`
- Installs to: `C:\Program Files\Docker\`
- Requires restart: Yes

**INSTALL-OLLAMA.bat:**
- Downloads to: `%TEMP%\ollama-install\`
- Installs to: `C:\Program Files\Ollama\` or `%LOCALAPPDATA%\Programs\Ollama\`
- Requires restart: Yes (for PATH update)

**RESTART-LIBRETRANSLATE.bat:**
- Creates Docker container: `libretranslate`
- Port: `5001` (host) → `5000` (container)
- Image: `libretranslate/libretranslate:latest`

**INSTALL-AND-BUILD.bat:**
- Creates: `electron\dist\Smart Book Translator-Setup-1.0.0.exe`
- Creates: `electron\dist\Smart Book Translator-1.0.0-Portable.exe`
- Size: ~200-300 MB each

---

## 🎓 Best Practices

### Daily Use
1. Start Docker Desktop (if not auto-started)
2. Run `START-APP-SIMPLE.bat`
3. Wait 2-3 minutes for services to initialize
4. Start translating!

### After Restart
1. Wait 1-2 minutes for Docker to auto-start
2. Run `RESTART-ALL-SERVICES.bat`
3. Wait 2-3 minutes
4. Run `START-APP-SIMPLE.bat`

### Before Building Installer
1. Test app works: `START-APP-SIMPLE.bat`
2. Test LibreTranslate: Translate something
3. Test Ollama: Try LLM enhancement
4. Build: `INSTALL-AND-BUILD.bat` (as admin)
5. Test installer on clean machine

### Maintenance
- **Weekly:** Restart services if running 24/7
- **Monthly:** Update Docker images
- **As needed:** Clean install dependencies

---

## 📞 Support

### Script Errors
- Check `QUICK-FIX-ISSUES.md` for solutions
- Read error messages carefully
- Try running as administrator

### Service Issues
- Use `RESTART-ALL-SERVICES.bat` first
- Check Docker Desktop is running
- Verify Ollama is installed

### Build Issues
- Ensure dependencies installed
- Run as administrator
- Enable Developer Mode (Windows Settings)

---

## ✅ Quick Reference

**Need to start the app?**
→ `START-APP-SIMPLE.bat`

**Services not working?**
→ `RESTART-ALL-SERVICES.bat`

**Need to install Docker?**
→ `INSTALL-DOCKER.bat` (as admin)

**Need to install Ollama?**
→ `INSTALL-OLLAMA.bat` (as admin)

**Need to build installer?**
→ `INSTALL-AND-BUILD.bat` (as admin)

**LibreTranslate stuck?**
→ `RESTART-LIBRETRANSLATE.bat`

**Ollama not responding?**
→ `RESTART-OLLAMA.bat`

---

**Last Updated:** 2026-01-18  
**Version:** 1.0.0
