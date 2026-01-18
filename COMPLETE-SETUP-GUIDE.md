# 🎯 Complete Setup Guide - Smart Book Translator

## 📋 Table of Contents

1. [Quick Answer](#quick-answer)
2. [For Developers (Building Installer)](#for-developers-building-installer)
3. [For Users (Installing App)](#for-users-installing-app)
4. [Features Overview](#features-overview)
5. [Troubleshooting](#troubleshooting)

---

## Quick Answer

### "What do I need to do to build the installer?"

**Answer**: Double-click `INSTALL-AND-BUILD.bat` and wait 5-10 minutes. That's it!

**Or** if dependencies are already installed: Double-click `BUILD-INSTALLER.bat`

### "What do I need to do to run the app?"

**Answer**: Double-click `START-APP-SIMPLE.bat` and wait 30-60 seconds. That's it!

---

## For Developers (Building Installer)

### 🎯 Goal: Create Windows Installer

You want to create a professional Windows installer (next-next-finish style) for distribution.

### ✅ Solution: Already Configured!

Everything is ready. Just follow these steps:

#### Step 1: Install Dependencies (First Time Only)

Open PowerShell in `D:\smart-book-translator`:

```powershell
npm run install:all
```

**Wait**: 2-5 minutes

**What it does**: Installs all required packages for backend, frontend, and Electron.

#### Step 2: Build the Installer

**Option A: All-in-One Script (Easiest)** ⭐ **NEW**

Double-click: `INSTALL-AND-BUILD.bat`

This will:
- Clean old installer files
- Install dependencies (if needed)
- Build frontend
- Build installer
- Open dist folder

**One script does everything!**

**Option B: Build Script Only** (If dependencies already installed)

```
Double-click: BUILD-INSTALLER.bat
```

**Option B: PowerShell**

```powershell
npm run build:installer:win
```

**Wait**: 3-5 minutes

**What it does**:
1. Builds React frontend
2. Packages with Electron
3. Creates NSIS installer
4. Creates portable version

#### Step 3: Find Your Installer

```
electron\dist\Smart Book Translator-Setup-1.0.0.exe
```

**Size**: ~200-300 MB (normal for Electron apps)

**Type**: NSIS installer (next-next-finish wizard)

### 🎉 Done!

You now have a professional Windows installer that:
- ✅ Installs with next-next-finish wizard
- ✅ Creates desktop shortcut
- ✅ Creates start menu entry
- ✅ Includes proper uninstaller
- ✅ Associates with .epub, .pdf, .docx files
- ✅ Launches automatically after installation

---

## For Users (Installing App)

### 🎯 Goal: Install and Use the App

#### Option 1: Using Installer (Recommended)

1. **Download**: `Smart Book Translator-Setup-1.0.0.exe`
2. **Double-click** the installer
3. **Follow wizard**: Next → Choose folder → Next → Install → Finish
4. **Done!** App launches automatically

**Result**:
- Desktop shortcut created
- Start menu entry created
- Can be uninstalled from Control Panel

#### Option 2: Portable Version

1. **Download**: `Smart Book Translator-1.0.0-Portable.exe`
2. **Double-click** to run
3. **Done!** No installation needed

**Result**:
- Runs from anywhere (USB, Downloads folder, etc.)
- No admin rights needed
- No installation/uninstallation

#### Option 3: Running from Source (Developers)

1. **Open folder**: `D:\smart-book-translator`
2. **Double-click**: `START-APP-SIMPLE.bat`
3. **Wait**: 30-60 seconds
4. **Browser opens**: `http://localhost:5173`

**Result**:
- Runs in development mode
- Can modify code
- Hot reload enabled

---

## Features Overview

### 🌟 Main Features

1. **Document Translation**
   - Supports: EPUB, PDF, DOCX
   - Multiple providers: Google, DeepL, OpenAI, Anthropic, **Local (LibreTranslate)**
   - Preserves formatting

2. **Local Translation (FREE & PRIVATE)** ⭐
   - Uses LibreTranslate (Docker)
   - No API keys needed
   - No internet required (after setup)
   - No usage limits
   - Complete privacy

3. **Glossary Management**
   - Define custom term translations
   - Automatic term replacement
   - Supports multiple language pairs
   - **Fully respected in local mode** ✅

4. **LLM Enhancement Layer** (Optional)
   - Uses Ollama (local LLM)
   - Improves translation quality
   - Adjusts formality (formal/neutral/informal)
   - Fixes text structure (cohesion, coherence, grammar)
   - Verifies glossary terms
   - **Preserves HTML formatting** ✅

5. **HTML Formatting Preservation**
   - Toggle to keep text formatting
   - Works with LibreTranslate HTML mode
   - LLM respects HTML tags
   - Perfect for styled documents

### 🔧 Technical Features

- **Resource Monitoring**: Shows CPU, RAM, GPU usage
- **Progress Tracking**: Real-time translation progress
- **Batch Processing**: Efficient sentence batching
- **Error Recovery**: Automatic retry on failures
- **Job Management**: View and manage translation jobs
- **Settings Persistence**: Saves your preferences

---

## Troubleshooting

### Building Installer

#### "vite is not recognized"

**Problem**: Dependencies not installed

**Solution**:
```powershell
npm run install:all
```

#### "Cannot find module"

**Problem**: Corrupted node_modules

**Solution**:
```powershell
Remove-Item -Recurse -Force backend\node_modules, frontend\node_modules, electron\node_modules
npm run install:all
```

#### "gyp ERR! find VS" (Build Tools Error)

**Problem**: This error is now **FIXED**! ✅

**Solution**: The app now uses `sql.js` (pure JavaScript database) instead of `better-sqlite3`, so no Visual Studio Build Tools are needed.

Just reinstall:
```powershell
Remove-Item -Recurse -Force backend\node_modules -ErrorAction SilentlyContinue
npm run install:all
```

See `DATABASE-CHANGE.md` for details.

#### Build fails with error

**Solution**:
1. Check Node.js version: `node --version` (need >= 18)
2. Update npm: `npm install -g npm@latest`
3. Clean reinstall (see above)

### Running the App

#### "Port 5173 already in use"

**Problem**: Another instance running

**Solution**:
1. Close other instances
2. Or change port in `frontend/vite.config.js`

#### "Cannot connect to backend"

**Problem**: Backend not started

**Solution**:
1. Check if backend is running
2. Restart using `START-APP-SIMPLE.bat`

#### LibreTranslate not working

**Problem**: Docker not running or container not started

**Solution**:
1. Install Docker Desktop
2. Start Docker
3. In app: Translation tab → Local Translation → Click "Start LibreTranslate"
4. Wait 2-3 minutes for download and startup

#### Ollama not working

**Problem**: Ollama not installed or model not downloaded

**Solution**:
1. In app: Translation tab → LLM Enhancement → Follow installation instructions
2. Or manually: Run `scripts/install-ollama-windows.ps1`
3. Download model: `npm run setup:ollama`

---

## 📁 File Structure

### Important Files

```
D:\smart-book-translator\
│
├── START-APP-SIMPLE.bat          ← Run this to start app
├── BUILD-INSTALLER.bat           ← Run this to build installer
├── launch.bat                    ← Alternative launcher
│
├── QUICK-START-INSTALLER.md      ← How to build installer
├── INSTALLER-ANSWER.md           ← Quick answer to your question
├── BUILD-INSTALLER.md            ← Detailed build guide
├── WINDOWS_INSTALLATION_GUIDE.md ← User installation guide
├── GLOSSARY_VERIFICATION.md      ← Glossary feature explanation
├── OLLAMA_SETUP.md              ← Ollama setup guide
├── LLM_LAYER_GUIDE.md           ← LLM enhancement guide
│
├── backend\                      ← Node.js backend
│   ├── server.js                ← Main server
│   ├── services\                ← Translation services
│   │   ├── localTranslationService.js  ← LibreTranslate
│   │   └── ollamaService.js            ← Ollama LLM
│   └── routes\                  ← API routes
│
├── frontend\                     ← React frontend
│   ├── src\
│   │   ├── components\
│   │   │   ├── TranslationTab.jsx      ← Main translation UI
│   │   │   ├── LocalTranslationPanel.jsx ← LibreTranslate UI
│   │   │   └── OllamaPanel.jsx         ← Ollama UI
│   │   └── App.jsx
│   └── dist\                    ← Built frontend (after build)
│
├── electron\                     ← Electron wrapper
│   ├── main.js                  ← Electron main process
│   ├── package.json             ← Electron config (installer settings)
│   └── dist\                    ← Built installers (after build)
│       ├── Smart Book Translator-Setup-1.0.0.exe    ← INSTALLER
│       └── Smart Book Translator-1.0.0-Portable.exe ← PORTABLE
│
└── scripts\                      ← Setup scripts
    ├── install-ollama-windows.ps1  ← Ollama installer (Windows)
    ├── install-ollama-linux.sh     ← Ollama installer (Linux)
    └── setup-ollama-model.js       ← Ollama model setup
```

---

## 🎯 Quick Reference

### For Developers

| Task | Command | Time |
|------|---------|------|
| Install dependencies | `npm run install:all` | 2-5 min |
| Run app (dev mode) | `START-APP-SIMPLE.bat` | 30-60 sec |
| Build installer | `BUILD-INSTALLER.bat` | 3-5 min |
| Build frontend only | `npm run build:frontend` | 1-2 min |
| Setup Ollama model | `npm run setup:ollama` | 2-5 min |

### For Users

| Task | Action | Time |
|------|--------|------|
| Install app | Double-click installer → Next-Next-Finish | 1-2 min |
| Run app | Desktop shortcut or Start menu | 5-10 sec |
| Setup LibreTranslate | In app: Translation → Local → Start | 2-3 min |
| Setup Ollama | In app: Translation → LLM → Follow guide | 5-10 min |
| Translate document | Upload → Select options → Translate | Varies |

---

## 🎉 Success Checklist

### Building Installer ✅

- [ ] Dependencies installed (`npm run install:all`)
- [ ] Build completed without errors
- [ ] Installer file exists: `electron\dist\Smart Book Translator-Setup-1.0.0.exe`
- [ ] File size is ~200-300 MB
- [ ] Double-clicking installer opens wizard
- [ ] Installation works (test on your machine)
- [ ] Desktop shortcut created after install
- [ ] App launches successfully

### Running App ✅

- [ ] App starts without errors
- [ ] Browser opens automatically
- [ ] UI loads correctly
- [ ] Can upload documents
- [ ] Translation works (test with any provider)
- [ ] Settings persist after restart

### Optional Features ✅

- [ ] LibreTranslate: Docker running, container started
- [ ] Ollama: Installed, model downloaded, service running
- [ ] Glossary: Terms added, respected in translation
- [ ] LLM Enhancement: Enabled, improves translation quality
- [ ] HTML Formatting: Enabled, formatting preserved

---

## 📞 Need More Help?

### Documentation Files

1. **INSTALLER-ANSWER.md** - Direct answer to "what do I need to do?"
2. **QUICK-START-INSTALLER.md** - Quick guide to build installer
3. **BUILD-INSTALLER.md** - Detailed technical guide
4. **WINDOWS_INSTALLATION_GUIDE.md** - For end users
5. **GLOSSARY_VERIFICATION.md** - Glossary feature explained
6. **OLLAMA_SETUP.md** - Ollama installation guide
7. **LLM_LAYER_GUIDE.md** - LLM enhancement guide

### Quick Actions

**Just want to build installer?**
→ Double-click `BUILD-INSTALLER.bat`

**Just want to run the app?**
→ Double-click `START-APP-SIMPLE.bat`

**Just want to test translation?**
→ Run app → Upload document → Select provider → Translate

---

## 🚀 Final Words

**Everything is ready!**

You have:
- ✅ Professional Windows installer (NSIS)
- ✅ Portable version (no installation)
- ✅ Complete documentation
- ✅ One-click build scripts
- ✅ One-click run scripts
- ✅ All features implemented
- ✅ Glossary fully working
- ✅ LLM enhancement ready
- ✅ HTML formatting preserved

**What you need to do**:
1. To build installer: `BUILD-INSTALLER.bat`
2. To run app: `START-APP-SIMPLE.bat`

**That's it!** 🎊

---

**Made with ❤️ for easy document translation**

**Version**: 1.0.0  
**Last Updated**: 2026-01-18
