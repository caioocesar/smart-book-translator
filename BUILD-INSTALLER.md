# 🏗️ How to Build Windows Installer

> **🚀 NEW:** Use `INSTALL-AND-BUILD.bat` for one-click installation including optional Ollama!  
> See `INSTALL-WITH-OLLAMA.md` for details.

## Quick Guide - 3 Steps

### Step 1: Install Dependencies (First Time Only)

Open PowerShell in this folder and run:

```powershell
npm run install:all
```

This will install all required packages for backend, frontend, and electron.

**Wait time**: 2-5 minutes (depending on internet speed)

---

### Step 2: Build the Installer

After dependencies are installed, run:

```powershell
npm run build:installer:win
```

This will:
1. ✅ Build the frontend (React app)
2. ✅ Package everything with Electron
3. ✅ Create NSIS installer (next-next-finish style)
4. ✅ Create portable version (no installation needed)

**Wait time**: 3-5 minutes

---

### Step 3: Find Your Installer

The installers will be in:

```
D:\smart-book-translator\electron\dist\
```

You'll find:
- **`Smart Book Translator-Setup-1.0.0.exe`** ⭐ **INSTALLER** (click next-next-finish)
- **`Smart Book Translator-1.0.0-Portable.exe`** 📦 **PORTABLE** (no installation)

---

## 🎯 What You Asked For

> "simple instalator for windows for example to click in next and generate the electron app easy"

**The NSIS installer** (`Smart Book Translator-Setup-1.0.0.exe`) is exactly what you asked for!

### Features:
- ✅ **Next-Next-Finish** installation
- ✅ Choose installation directory
- ✅ Desktop shortcut created
- ✅ Start menu shortcut created
- ✅ Auto-launch after installation
- ✅ Proper uninstaller
- ✅ File associations (.epub, .pdf, .docx)

---

## 📋 Complete Process

### Option A: All-in-One Script (Easiest) ⭐ **NEW**

**Just double-click**: `INSTALL-AND-BUILD.bat`

It will:
1. Clean old installer files
2. Check if dependencies installed (install if needed)
3. Build frontend
4. Build installer (NSIS + portable)
5. Open the folder with the installer

**This is the recommended way!** One script does everything.

### Option B: Using Build Script Only

**Just double-click**: `BUILD-INSTALLER.bat`

It will:
1. Check if dependencies are installed
2. Build the installer
3. Open the folder with the installer

### Option C: Manual Commands

```powershell
# 1. Install dependencies (first time only)
npm run install:all

# 2. Build Windows installer
npm run build:installer:win

# 3. Find installer in electron\dist\
```

---

## 🎨 What Gets Installed

When user runs the installer:

```
C:\Program Files\Smart Book Translator\
├── Smart Book Translator.exe  ← Main executable
├── resources\
│   ├── app.asar              ← Your app (backend + frontend)
│   ├── backend\              ← Node.js backend
│   └── scripts\              ← Setup scripts
└── uninstall.exe             ← Uninstaller
```

**Desktop Shortcut**: `Smart Book Translator.lnk`

**Start Menu**: `Programs > Smart Book Translator`

---

## 🚀 How Users Install Your App

1. **Download** `Smart Book Translator-Setup-1.0.0.exe`
2. **Double-click** the installer
3. **Click "Next"** → Choose folder → Click "Next" → Click "Install"
4. **Click "Finish"** → App launches automatically
5. **Done!** Desktop icon created, ready to use

---

## 📦 Installer Types Available

### 1. NSIS Installer (Recommended)
```powershell
npm run build:installer:win
```
- Creates: `Smart Book Translator-Setup-1.0.0.exe`
- Size: ~200-300 MB
- Type: Traditional Windows installer
- Features: Next-next-finish, shortcuts, uninstaller

### 2. Portable Version
```powershell
npm run build:installer:win:portable
```
- Creates: `Smart Book Translator-1.0.0-Portable.exe`
- Size: ~200-300 MB
- Type: Single executable (no installation)
- Features: Run from USB, no admin rights needed

### 3. Both (Recommended for Distribution)
```powershell
npm run build:installer:win
```
This creates BOTH installer and portable versions automatically!

---

## 🐧 Linux Installers

```powershell
npm run build:installer:linux
```

Creates:
- **AppImage**: `Smart Book Translator-1.0.0.AppImage` (universal)
- **DEB**: `smart-book-translator-electron_1.0.0_amd64.deb` (Ubuntu/Debian)

---

## ⚠️ Common Issues

### Issue 1: "vite is not recognized"
**Solution**: Install dependencies first
```powershell
npm run install:all
```

### Issue 2: Build fails with "Cannot find module"
**Solution**: Clean and reinstall
```powershell
Remove-Item -Recurse -Force backend\node_modules, frontend\node_modules, electron\node_modules
npm run install:all
```

### Issue 3: Installer is too large
**Normal!** The installer includes:
- Electron runtime (~100 MB)
- Node.js backend
- React frontend
- All dependencies

**Size**: 200-300 MB is normal for Electron apps.

---

## 🎯 Distribution Checklist

Before distributing your installer:

- [ ] Test installer on clean Windows machine
- [ ] Verify desktop shortcut works
- [ ] Verify start menu shortcut works
- [ ] Test uninstaller
- [ ] Check file associations (.epub, .pdf, .docx)
- [ ] Test app launches correctly
- [ ] Verify LibreTranslate setup works
- [ ] Test Ollama integration (optional)

---

## 📝 Version Management

To change version number:

1. Edit `electron/package.json`:
```json
{
  "version": "1.0.0"  ← Change this
}
```

2. Rebuild:
```powershell
npm run build:installer:win
```

New installer will be: `Smart Book Translator-Setup-1.0.1.exe`

---

## 🎉 Success!

After building, you'll have a professional Windows installer that:
- ✅ Installs with next-next-finish
- ✅ Creates desktop shortcut
- ✅ Creates start menu entry
- ✅ Associates with .epub, .pdf, .docx files
- ✅ Includes proper uninstaller
- ✅ Launches automatically after install

**Just like any professional Windows application!**

---

## 📚 Additional Resources

- **Electron Builder Docs**: https://www.electron.build/
- **NSIS Installer**: https://nsis.sourceforge.io/
- **Code Signing** (optional): For production, consider signing your installer

---

## 🤝 Need Help?

If build fails:
1. Check error message in PowerShell
2. Verify Node.js version: `node --version` (should be >= 18)
3. Verify npm version: `npm --version`
4. Try clean reinstall (see Issue 2 above)
