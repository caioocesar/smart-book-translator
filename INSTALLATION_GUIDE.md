# 📦 Complete Installation Guide

## For New Users (Plug and Play!)

### Windows Users

1. **Download or clone the project**
   ```powershell
   # If you have git
   git clone <repository-url>
   cd smart-book-translator
   
   # Or download ZIP and extract
   ```

2. **Run the installer**
   ```powershell
   # Right-click install-windows.ps1
   # Select "Run with PowerShell"
   
   # Or from PowerShell:
   .\install-windows.ps1
   ```

3. **Wait for installation** (5-10 minutes)
   - Checks Node.js version
   - Installs all dependencies
   - Creates desktop shortcut
   - Sets up launcher scripts

4. **Start the app**
   - Double-click "Smart Book Translator" on desktop
   - Or run `run.bat` from the folder
   - Browser opens automatically to http://localhost:5173

5. **Start translating!**
   - No API key needed - use Google Translate (free!)
   - Or add DeepL/OpenAI keys in Settings

**That's it! Truly plug and play!** ✨

---

### Ubuntu/Linux Users

1. **Download or clone the project**
   ```bash
   # If you have git
   git clone <repository-url>
   cd smart-book-translator
   
   # Or download ZIP and extract
   # Then: cd /path/to/smart-book-translator
   ```

2. **Run the installer**
   ```bash
   chmod +x install-ubuntu.sh
   ./install-ubuntu.sh
   ```

3. **Wait for installation** (5-10 minutes)
   - Checks Node.js version
   - Installs all dependencies
   - Creates desktop launcher
   - Sets up scripts

4. **Start the app**
   ```bash
   ./run.sh
   
   # Or search for "Smart Book Translator" in your applications menu
   ```

5. **Start translating!**
   - Browser opens to http://localhost:5173
   - Use Google Translate (free, no key needed!)
   - Or configure API keys in Settings

**Done! Super easy!** ✨

---

## Updating Existing Installation

### For Windows

```powershell
# In the smart-book-translator folder
.\update.ps1
```

### For Ubuntu/Linux

```bash
# In the smart-book-translator folder
./update.sh
```

**What happens during update:**
- ✅ Backs up your database
- ✅ Pulls latest changes (if git repo)
- ✅ Updates all dependencies
- ✅ Preserves your data
- ✅ Tests everything works
- ⚠️ Takes 2-5 minutes

**Your data is safe!** Settings, glossary, and translation history are preserved.

---

## Troubleshooting

### "Node.js not found"

**Problem**: Installation script says Node.js is missing

**Solution**:
1. Install Node.js from https://nodejs.org/
2. Choose LTS version (18.x or higher)
3. Restart terminal/PowerShell
4. Run installer again

### "npm install failed"

**Problem**: Dependencies won't install

**Solution**:
```bash
# Clear cache and try again
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### "Port 5000 already in use"

**Problem**: Backend won't start

**Solution**:
```bash
# Find what's using port 5000
# Linux:
lsof -i :5000

# Windows:
netstat -ano | findstr :5000

# Kill the process or change port in backend/.env
PORT=5001
```

### "Cannot find module"

**Problem**: Import errors when starting

**Solution**:
```bash
# Reinstall dependencies
cd backend
rm -rf node_modules package-lock.json
npm install

cd ../frontend
rm -rf node_modules package-lock.json
npm install
```

### "Permission denied"

**Problem**: Can't run scripts on Linux

**Solution**:
```bash
chmod +x install-ubuntu.sh
chmod +x update.sh
chmod +x run.sh
```

---

## System Requirements

### Minimum

- **OS**: Windows 10, Ubuntu 20.04, or macOS 10.15+
- **RAM**: 2 GB
- **Disk**: 500 MB free space
- **CPU**: Dual-core processor
- **Internet**: Required for API calls

### Recommended

- **OS**: Windows 11, Ubuntu 22.04, or latest macOS
- **RAM**: 4 GB+
- **Disk**: 2 GB free space
- **CPU**: Quad-core processor
- **Internet**: Broadband connection

---

## What Gets Installed

### Backend (Node.js)
- Express server (Port 5000)
- SQLite database
- Translation services
- Document parsers
- ~50 MB of dependencies

### Frontend (React)
- Vite dev server (Port 5173)
- React UI
- WebSocket client
- ~150 MB of dependencies

### Total Size
- Installation: ~200 MB
- Runtime: Uses ~100-300 MB RAM

---

## First Time Setup

After installation:

1. **Open the app** (localhost:5173)

2. **Try Google Translate** (no setup needed!)
   - Go to Translation tab
   - Select "Google Translate" as API
   - Upload a document
   - Translate!

3. **Or configure paid APIs** (optional)
   - Go to Settings tab
   - Enter DeepL or OpenAI API key
   - Click "Test" to verify
   - Save settings

4. **Build a glossary** (optional)
   - Go to Glossary tab
   - Add custom terms
   - Or import CSV file

5. **Start translating!**

---

## Uninstallation

### Windows

```powershell
# Delete the folder
Remove-Item -Path "C:\path\to\smart-book-translator" -Recurse -Force

# Remove desktop shortcut
Remove-Item -Path "$env:USERPROFILE\Desktop\Smart Book Translator.lnk"
```

### Linux

```bash
# Delete the folder
rm -rf /path/to/smart-book-translator

# Remove desktop entry
rm ~/.local/share/applications/smart-book-translator.desktop
```

---

## Need Help?

1. **Check README.md** - Comprehensive documentation
2. **Check USAGE_GUIDE.md** - Detailed usage instructions
3. **Check QUICK_START.md** - 5-minute quick start
4. **Check troubleshooting above**
5. **Run system tests** - Click "🔧 System Status" in app
6. **Check terminal/console** - Look for error messages

---

## Success Indicators

You'll know installation worked when:

✅ No errors in installation output
✅ Desktop shortcut created
✅ Backend starts (port 5000)
✅ Frontend starts (port 5173)
✅ Browser opens automatically
✅ Green "🟢 Online" indicator in app
✅ All system tests pass (check System Status)
✅ Google Translate works without API key!

**Enjoy translating!** 📚✨

