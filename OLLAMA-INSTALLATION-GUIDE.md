# 🤖 Ollama Installation Guide

## What is Ollama?

Ollama is a **free, offline AI tool** that enhances your translations by:
- ✨ Adjusting formality (formal/informal/neutral)
- 📝 Improving text structure and coherence
- 🔍 Verifying glossary terms
- 🎯 Making translations more natural

**Best part:** Runs completely offline on your computer after installation!

---

## 🚀 Quick Installation (Windows)

### Method 1: Use the Install Script (Easiest)

1. **Right-click** `INSTALL-OLLAMA.bat` → **Run as administrator**
2. Wait for download (takes ~2 minutes)
3. Follow the installation wizard
4. **Restart your computer** (important!)
5. Open Smart Book Translator

### Method 2: Manual Installation

1. Download from: https://ollama.com/download
2. Run `OllamaSetup.exe`
3. Follow the installation wizard
4. **Restart your computer**
5. Open Smart Book Translator

---

## ✅ What Happens After Installation

### Automatic Detection
When you start Smart Book Translator after installing Ollama:

1. ✅ App automatically detects Ollama is installed
2. ✅ Auto-starts Ollama service (if enabled in settings)
3. ✅ Shows "Ollama is running" in Settings → LLM Enhancement
4. ✅ Ready to download AI models!

### First-Time Setup Prompt
If Ollama is **not installed**, the app will show a friendly prompt:

- 🕐 Appears 5 seconds after app startup
- 💡 Explains benefits of Ollama
- 📥 Provides download link
- ⏭️ Can dismiss with "Don't Show Again"

---

## 📥 Downloading AI Models

After installing Ollama, you need to download an AI model:

### Recommended Model: llama3.2:3b

**Why this model?**
- ⚡ Fast (processes ~500 words in 5-10 seconds)
- 💾 Small (only ~2GB download)
- 🎯 Good quality for translation enhancement
- 🖥️ Works on most computers

### How to Download:

1. Open Smart Book Translator
2. Go to **Settings** → **LLM Enhancement**
3. Click **"Download Model"** button
4. Wait 2-5 minutes (downloads ~2GB)
5. Model is ready to use!

---

## 🔧 Troubleshooting

### "Ollama not found" Error

**Cause:** Ollama is not installed or PATH not updated

**Solution:**
1. Install Ollama using `INSTALL-OLLAMA.bat`
2. **Restart your computer** (critical step!)
3. Open Smart Book Translator

### "Ollama not responding" Error

**Cause:** Ollama service is not running

**Solution 1 (Automatic):**
- Just wait 10-15 seconds
- App will auto-start Ollama service

**Solution 2 (Manual):**
1. Open Command Prompt
2. Run: `ollama serve`
3. Keep window open

**Solution 3 (Restart Script):**
- Double-click `RESTART-OLLAMA.bat`

### Installation Completed but Still Not Found

**Cause:** Windows PATH not refreshed

**Solution:**
1. **Restart your computer** (not just the app!)
2. Windows needs to refresh environment variables
3. After restart, Ollama will be available

### Model Download Fails

**Cause:** Network issues or insufficient disk space

**Solution:**
1. Check internet connection
2. Ensure you have 3GB+ free disk space
3. Try again - downloads can resume
4. Or use manual command: `ollama pull llama3.2:3b`

---

## 💡 Usage Tips

### When to Use LLM Enhancement

✅ **Good for:**
- Formal documents (business, academic)
- Technical translations with glossary
- Improving natural language flow
- Adjusting tone (formal/informal)

❌ **Skip for:**
- Quick, casual translations
- Very short texts (1-2 sentences)
- When speed is critical

### Performance Expectations

| Hardware | Speed | Recommendation |
|----------|-------|----------------|
| GPU (NVIDIA) | ⚡ Fast (2-3s per page) | Excellent |
| CPU (8+ cores, 16GB RAM) | 🟡 Medium (8-12s per page) | Good |
| CPU (4 cores, 8GB RAM) | 🔴 Slow (15-20s per page) | Acceptable |

### Resource Usage

- **CPU:** 50-100% during processing (normal)
- **RAM:** 2-4GB for llama3.2:3b model
- **GPU:** Used automatically if available (much faster)

---

## 🎯 App Integration Features

### Auto-Start on App Launch
- ✅ Ollama starts automatically when you open the app
- ✅ No manual intervention needed
- ✅ Can disable in Settings if you prefer

### Installation Prompt
- 💡 Shows once if Ollama not installed
- ⏭️ Can dismiss permanently with "Don't Show Again"
- 🔄 Can reset by clearing browser localStorage

### Status Monitoring
- 🟢 Real-time status in Settings → LLM Enhancement
- 📊 System info (CPU, RAM, GPU detection)
- ⏱️ Performance estimates based on hardware

---

## 📝 Technical Details

### Installation Paths (Windows)
Ollama is typically installed in:
- `C:\Program Files\Ollama\`
- `%LOCALAPPDATA%\Programs\Ollama\`
- `%USERPROFILE%\AppData\Local\Programs\Ollama\`

### Service Management
- **Start:** `ollama serve` (runs in background)
- **Check status:** Visit http://localhost:11434
- **Stop:** Close terminal or use Task Manager

### Model Storage
Models are stored in:
- Windows: `%USERPROFILE%\.ollama\models\`
- Linux/Mac: `~/.ollama/models/`

---

## ❓ FAQ

**Q: Is Ollama free?**
A: Yes! Completely free and open-source.

**Q: Does it require internet?**
A: Only for initial download. After that, runs 100% offline.

**Q: How much disk space needed?**
A: ~3GB for Ollama + llama3.2:3b model.

**Q: Can I use other models?**
A: Yes! Any Ollama model works. See https://ollama.com/library

**Q: Will it slow down my computer?**
A: Only when actively processing. Otherwise, minimal resource usage.

**Q: Can I uninstall it?**
A: Yes! Standard Windows uninstall via Settings → Apps.

**Q: Do I need a GPU?**
A: No, but GPU (especially NVIDIA) makes it much faster.

---

## 🔗 Useful Links

- **Ollama Official Site:** https://ollama.com
- **Model Library:** https://ollama.com/library
- **Documentation:** https://github.com/ollama/ollama
- **Support:** https://github.com/ollama/ollama/issues

---

## 🎉 Summary

1. **Install Ollama:** Right-click `INSTALL-OLLAMA.bat` → Run as admin
2. **Restart Computer:** Important for PATH update
3. **Open App:** Smart Book Translator auto-detects Ollama
4. **Download Model:** Settings → LLM Enhancement → Download Model
5. **Start Translating:** Enable "Use LLM Enhancement" in translation options

That's it! Enjoy AI-enhanced translations! 🚀
