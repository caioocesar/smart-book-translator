# 🪟 Windows Installation & Startup Guide

## Quick Start (Recommended)

### Option 1: Using the Launcher Script (Easiest)

1. **Open the project folder**: `D:\smart-book-translator`

2. **Double-click one of these files**:
   - `START-APP-SIMPLE.bat` - Simplest way to start
   - `launch.bat` - Alternative launcher
   - `smart-book-translator.bat` - Another launcher option

3. **Wait for the app to start** (first time may take 1-2 minutes)

4. **Access the app**: Browser will open automatically at `http://localhost:5173`

---

## Option 2: Manual Installation (Full Control)

### Step 1: Install Prerequisites

#### 1.1 Install Node.js (Required)

1. Download Node.js 18+ from: https://nodejs.org/
2. Run the installer
3. Verify installation:
   ```powershell
   node --version
   npm --version
   ```

#### 1.2 Install Docker Desktop (Optional - for Local Translation)

1. Download from: https://www.docker.com/products/docker-desktop/
2. Run installer
3. Restart computer if prompted
4. Start Docker Desktop
5. Wait for Docker to be running (whale icon in system tray)

### Step 2: Install Dependencies

Open PowerShell in the project folder and run:

```powershell
cd D:\smart-book-translator
npm run install:all
```

This installs dependencies for:
- Backend (Node.js server)
- Frontend (React UI)
- Electron (Desktop app)

### Step 3: Start the Application

#### Option A: Web Version (Browser)

1. **Start backend and frontend**:
   ```powershell
   npm run dev
   ```

2. **Access the app**: Open browser to `http://localhost:5173`

#### Option B: Desktop Version (Electron)

1. **Build frontend first**:
   ```powershell
   npm run build:frontend
   ```

2. **Start Electron app**:
   ```powershell
   npm run electron
   ```

---

## Option 3: Build Installer (For Distribution)

### Build Windows Installer

```powershell
# Build NSIS installer (recommended)
npm run build:installer:win

# Build portable version (no installation required)
npm run build:installer:win:portable

# Build both
npm run build:installer:all
```

**Output files** (in `electron/dist/`):
- `Smart-Book-Translator-Setup-1.0.0.exe` - Full installer
- `Smart-Book-Translator-1.0.0-Portable.exe` - Portable version

### Install from Installer

1. Double-click `Smart-Book-Translator-Setup-1.0.0.exe`
2. Follow the installation wizard:
   - Choose installation directory
   - Select desktop shortcut option
   - Click Install
3. Launch from Start Menu or Desktop shortcut

---

## Setting Up Local Translation (Optional)

### Install LibreTranslate (Free, Unlimited)

**Automatic Installation**:
1. Make sure Docker Desktop is running
2. Start the app
3. Go to Translation tab
4. Select "⭐ Local (LibreTranslate) - FREE & PRIVATE"
5. Click "▶️ Start LibreTranslate" in the panel
6. Wait 30-60 seconds for Docker to download and start

**Manual Installation**:
```powershell
docker run -d -p 5001:5000 libretranslate/libretranslate
```

---

## Setting Up LLM Enhancement Layer (Optional)

### Install Ollama (AI Enhancement)

**Automatic Installation**:
1. Open PowerShell as Administrator
2. Navigate to project folder:
   ```powershell
   cd D:\smart-book-translator
   ```
3. Run installation script:
   ```powershell
   .\scripts\install-ollama-windows.ps1
   ```
4. Follow the prompts

**Manual Installation**:
1. Download from: https://ollama.com/download
2. Run `OllamaSetup.exe`
3. Ollama will start automatically

### Download AI Model

**Option 1: Via App UI**:
1. Start the app
2. Go to Translation tab
3. Select "⭐ Local (LibreTranslate)"
4. Enable "🤖 Use LLM Enhancement Layer"
5. Click "⬇️ Download Model" in Ollama Panel
6. Wait for download (~2GB)

**Option 2: Via Command**:
```powershell
ollama pull llama3.2:3b
```

**Option 3: Via Script**:
```powershell
npm run setup:ollama
```

---

## File Structure

```
D:\smart-book-translator\
├── START-APP-SIMPLE.bat      ← Double-click to start (easiest)
├── launch.bat                 ← Alternative launcher
├── smart-book-translator.bat  ← Another launcher
├── backend\                   ← Node.js server
├── frontend\                  ← React UI
├── electron\                  ← Desktop app
├── scripts\                   ← Installation scripts
│   ├── install-ollama-windows.ps1
│   └── setup-ollama-model.js
└── outputs\                   ← Translated documents appear here
```

---

## Common Commands

### Development

```powershell
# Start backend only
npm run dev:backend

# Start frontend only
npm run dev:frontend

# Start both (recommended)
npm run dev

# Start Electron app
npm run electron
```

### Building

```powershell
# Build frontend
npm run build:frontend

# Build Windows installer
npm run build:installer:win

# Build portable version
npm run build:installer:win:portable

# Build all formats
npm run build:installer:all
```

### Ollama

```powershell
# Check Ollama status
ollama --version

# List installed models
ollama list

# Download model
ollama pull llama3.2:3b

# Start Ollama service
ollama serve

# Setup model via script
npm run setup:ollama
```

### Docker

```powershell
# Check Docker status
docker --version
docker ps

# Start LibreTranslate manually
docker run -d -p 5001:5000 libretranslate/libretranslate

# Stop LibreTranslate
docker stop $(docker ps -q --filter ancestor=libretranslate/libretranslate)

# View LibreTranslate logs
docker logs $(docker ps -q --filter ancestor=libretranslate/libretranslate)
```

---

## Troubleshooting

### App Won't Start

**Problem**: "Port already in use" error

**Solution**:
```powershell
# Find what's using port 5000
netstat -ano | findstr :5000

# Kill the process (replace PID with actual number)
taskkill /PID <PID> /F
```

### Docker Issues

**Problem**: Docker not starting

**Solution**:
1. Open Docker Desktop
2. Wait for it to fully start (whale icon should be steady)
3. Try starting LibreTranslate again

**Problem**: "Docker daemon not running"

**Solution**:
1. Start Docker Desktop from Start Menu
2. Wait 30-60 seconds
3. Retry

### Ollama Issues

**Problem**: Ollama not found

**Solution**:
1. Restart PowerShell/Terminal
2. Or run: `$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine")`
3. Verify: `ollama --version`

**Problem**: Model download fails

**Solution**:
1. Check internet connection
2. Free up disk space (need ~5GB)
3. Try again: `ollama pull llama3.2:3b`

### Build Issues

**Problem**: Build fails with "out of memory"

**Solution**:
```powershell
# Increase Node.js memory limit
$env:NODE_OPTIONS="--max-old-space-size=4096"
npm run build:frontend
```

---

## Performance Tips

### For Best Performance

1. **Use SSD**: Install on SSD drive
2. **Close Background Apps**: Free up RAM
3. **Use GPU**: NVIDIA GPU significantly improves LLM speed
4. **Docker Resources**: Allocate more resources in Docker Desktop settings
5. **Disable Antivirus**: Temporarily for Docker/Node.js folders

### System Requirements

**Minimum**:
- Windows 10/11
- 4 GB RAM
- 5 GB free disk space
- Dual-core processor

**Recommended**:
- Windows 10/11
- 16 GB RAM
- 20 GB free disk space (SSD)
- Quad-core processor
- NVIDIA GPU (for LLM enhancement)

---

## Next Steps

After installation:

1. ✅ **Test the app**: Upload a small document
2. ✅ **Configure settings**: Add API keys if using paid services
3. ✅ **Create glossary**: Add technical terms for your domain
4. ✅ **Try local translation**: Use LibreTranslate for free translations
5. ✅ **Enable LLM layer**: For enhanced translation quality

---

## Support

**Documentation**:
- [Main README](README.md) - Overview and features
- [Ollama Setup](OLLAMA_SETUP.md) - Detailed Ollama installation
- [LLM Layer Guide](LLM_LAYER_GUIDE.md) - How to use LLM enhancement
- [Installation Guide](INSTALLATION_GUIDE.md) - General installation

**Getting Help**:
- Check documentation first
- Open GitHub issue with:
  - Windows version
  - Error messages
  - Steps to reproduce
  - System specs

---

## Summary: Fastest Way to Start

1. **Install Node.js** (if not installed)
2. **Double-click** `START-APP-SIMPLE.bat`
3. **Wait** for browser to open
4. **Start translating!**

For local translation:
- Install Docker Desktop
- App will auto-start LibreTranslate

For LLM enhancement:
- Run `scripts\install-ollama-windows.ps1` as Administrator
- Download model via app UI

**That's it! Happy translating! 🚀**
