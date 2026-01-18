# 🚀 Complete Installation Guide (with Ollama)

## What This Does

The `INSTALL-AND-BUILD.bat` script now includes **optional Ollama installation** during the build process!

When you run the script, it will:
1. ✅ Clean old installer files
2. ✅ Install all Node.js dependencies
3. ✅ **Ask if you want to install Ollama** (optional)
4. ✅ Build the frontend
5. ✅ Create Windows installers (NSIS + Portable)
6. ✅ Open the dist folder

---

## 🎯 Quick Start

### **Right-click** `INSTALL-AND-BUILD.bat` → **Run as administrator**

The script will guide you through everything!

---

## 📋 Installation Flow

### Step 1: Dependencies
```
Checking dependencies...
[OK] Dependencies already installed
```
Or if not installed:
```
Installing dependencies... This will take 2-5 minutes.
[1/3] Installing backend dependencies...
[2/3] Installing frontend dependencies...
[3/3] Installing electron dependencies...
```

### Step 2: Ollama Installation (NEW!)
```
========================================
 Step 3: Installing Ollama (Optional)
========================================

Ollama enhances translations with AI (formality, structure, glossary).
This is OPTIONAL but recommended for better translation quality.

[!] Ollama is not installed yet.

Do you want to install Ollama now? (Recommended) (Y/N)?
```

**Choose Y (Yes):**
- Downloads Ollama installer (~100MB)
- Runs the installation wizard
- Waits for you to complete installation
- Continues with build process

**Choose N (No):**
- Skips Ollama installation
- You can install it later with `INSTALL-OLLAMA.bat`
- Build process continues normally

### Step 3: Build Frontend
```
Building React frontend...
[OK] Frontend built successfully!
```

### Step 4: Build Installer
```
Building Windows Installer...
This will create:
 1. NSIS Installer (next-next-finish style)
 2. Portable version (no installation needed)

Please wait 3-5 minutes...
```

### Step 5: Done!
```
========================================
 [SUCCESS] All Done!
========================================

Your installers are ready in:
 electron\dist\

Files created:
 - Smart Book Translator-Setup-1.0.0.exe  (INSTALLER)
 - Smart Book Translator-1.0.0-Portable.exe  (PORTABLE)

[INFO] If you installed Ollama, remember to:
       - Restart your computer for PATH update
       - Open the app and download AI model (Settings > LLM Enhancement)
```

---

## 🤖 About Ollama

### What is it?
Ollama is a **free, offline AI tool** that enhances translations:
- ✨ Adjusts formality (formal/informal/neutral)
- 📝 Improves text structure and coherence
- 🔍 Verifies glossary terms
- 🎯 Makes translations more natural

### Why install it?
- ✅ **Free** - Completely free and open-source
- ✅ **Offline** - Runs 100% on your computer
- ✅ **Optional** - App works fine without it
- ✅ **Recommended** - Significantly improves translation quality

### When to skip it?
- ❌ Limited disk space (needs ~3GB)
- ❌ Older/slower computer (may be slow)
- ❌ Don't need AI enhancements
- ❌ Can install later if needed

---

## ⚠️ Important Notes

### After Installing Ollama:

1. **Restart your computer** (critical!)
   - Windows needs to refresh PATH environment variables
   - Without restart, Ollama won't be detected

2. **Download AI model** (first time only)
   - Open Smart Book Translator
   - Go to Settings → LLM Enhancement
   - Click "Download Model" button
   - Wait 2-5 minutes (~2GB download)

3. **Start using AI enhancements**
   - Enable "Use LLM Enhancement" when translating
   - Choose formality level
   - Enjoy better translations!

---

## 🔧 Troubleshooting

### "Ollama not found" after installation

**Cause:** Windows PATH not updated

**Solution:**
1. **Restart your computer** (not just the app!)
2. Open Smart Book Translator
3. Should now detect Ollama

### Installation wizard doesn't appear

**Cause:** Download failed or blocked by antivirus

**Solution:**
1. Check internet connection
2. Temporarily disable antivirus
3. Try again or use manual installation:
   - Run `INSTALL-OLLAMA.bat` separately
   - Or download from https://ollama.com/download

### Want to skip Ollama but script keeps asking

**Solution:**
- Just press **N** when asked
- Script will continue without Ollama
- You can install it later anytime

### Already have Ollama installed

**No problem!**
- Script detects existing installation
- Skips installation automatically
- Continues with build process

---

## 📊 Comparison: With vs Without Ollama

| Feature | Without Ollama | With Ollama |
|---------|---------------|-------------|
| Basic Translation | ✅ Yes | ✅ Yes |
| Speed | ⚡ Fast | 🟡 Slower (AI processing) |
| Quality | ✅ Good | ✨ Excellent |
| Formality Control | ❌ No | ✅ Yes |
| Structure Improvement | ❌ No | ✅ Yes |
| Glossary Verification | ⚠️ Basic | ✅ AI-verified |
| Disk Space | ~500MB | ~3.5GB |
| Internet Required | Only for API calls | Only for API calls + model download |

---

## 🎯 Recommended Workflow

### For Developers (Building Installer):
```bash
1. Right-click INSTALL-AND-BUILD.bat → Run as admin
2. Choose Y to install Ollama (recommended)
3. Wait for build to complete
4. Restart computer (if Ollama was installed)
5. Test the installer
6. Distribute to users
```

### For End Users (Using the App):
```bash
1. Run Smart Book Translator-Setup-1.0.0.exe
2. Follow installation wizard
3. If Ollama prompt appears, click "Download Ollama"
4. Restart computer
5. Open app → Settings → LLM Enhancement
6. Download AI model
7. Start translating!
```

---

## 📝 Alternative Installation Methods

### Method 1: All-in-One (Recommended)
```bash
INSTALL-AND-BUILD.bat
# Includes Ollama installation option
```

### Method 2: Separate Steps
```bash
# Step 1: Build without Ollama
INSTALL-AND-BUILD.bat
# Choose N when asked about Ollama

# Step 2: Install Ollama later
INSTALL-OLLAMA.bat
```

### Method 3: Manual Everything
```bash
# Install dependencies
npm run install:all

# Install Ollama manually
# Download from https://ollama.com/download

# Build frontend
npm run build:frontend

# Build installer
cd electron && npm run dist:win
```

---

## ❓ FAQ

**Q: Is Ollama required?**
A: No! The app works perfectly without it. Ollama just adds AI enhancements.

**Q: Can I install Ollama later?**
A: Yes! Just run `INSTALL-OLLAMA.bat` anytime or download from https://ollama.com

**Q: Will it slow down my build?**
A: Only if you choose to install Ollama (~2-3 minutes extra). Otherwise, no impact.

**Q: Can I uninstall Ollama?**
A: Yes! Standard Windows uninstall via Settings → Apps → Ollama.

**Q: Do I need admin privileges?**
A: Yes, for both the build script and Ollama installation.

**Q: What if I skip Ollama during build?**
A: No problem! Users can still install it later from the app's prompt or manually.

---

## 🎉 Summary

The `INSTALL-AND-BUILD.bat` script now offers **one-click installation** of everything you need:

✅ Node.js dependencies
✅ Ollama AI enhancement (optional)
✅ Frontend build
✅ Windows installers (NSIS + Portable)

**Just run it as administrator and follow the prompts!** 🚀

---

## 🔗 Related Files

- `INSTALL-AND-BUILD.bat` - Main build script (with Ollama option)
- `INSTALL-OLLAMA.bat` - Standalone Ollama installer
- `OLLAMA-INSTALLATION-GUIDE.md` - Detailed Ollama guide
- `BUILD-INSTALLER.md` - Build process documentation
- `QUICK-START-INSTALLER.md` - Quick start guide
