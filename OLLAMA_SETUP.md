# 🤖 Ollama Setup Guide

This guide will help you install and configure Ollama for the LLM Enhancement Layer in Smart Book Translator.

## What is Ollama?

Ollama is a lightweight, easy-to-use tool for running large language models (LLMs) locally on your computer. Smart Book Translator uses Ollama to provide an optional post-processing layer that enhances translations with:

- **Formality adjustment** (informal/neutral/formal tone)
- **Text structure improvements** (cohesion, coherence, grammar)
- **Glossary term verification** (ensures technical terms are correctly translated)

## Benefits

✅ **100% Local** - All processing happens on your computer  
✅ **Privacy** - No data sent to external services  
✅ **Offline** - Works without internet (after initial model download)  
✅ **Free** - No API costs or subscriptions  
✅ **Quality** - Improves translation naturalness and accuracy  

⚠️ **Note**: Adds processing time (~2-20 seconds per page depending on hardware)

## System Requirements

### Minimum Requirements
- **CPU**: 4 cores or more
- **RAM**: 8 GB or more
- **Disk Space**: 5 GB free (for Ollama + model)
- **OS**: Windows 10/11, Ubuntu 20.04+, macOS 11+

### Recommended for Best Performance
- **CPU**: 8+ cores
- **RAM**: 16 GB or more
- **GPU**: NVIDIA GPU with 6GB+ VRAM (optional but highly recommended)
- **Disk Space**: 10 GB free

## Installation

### Windows

#### Option 1: Automated Installation (Recommended)

1. Open PowerShell as Administrator
2. Navigate to the Smart Book Translator directory
3. Run the installation script:

```powershell
cd D:\smart-book-translator
.\scripts\install-ollama-windows.ps1
```

The script will:
- Download the Ollama installer
- Install Ollama
- Start the Ollama service
- Verify the installation

#### Option 2: Manual Installation

1. Download Ollama from [ollama.com/download](https://ollama.com/download)
2. Run the installer (`OllamaSetup.exe`)
3. Follow the installation wizard
4. Ollama will start automatically after installation

### Linux

#### Option 1: Automated Installation (Recommended)

1. Open terminal
2. Navigate to the Smart Book Translator directory
3. Run the installation script:

```bash
cd ~/smart-book-translator
bash scripts/install-ollama-linux.sh
```

The script will:
- Download and install Ollama
- Configure the systemd service
- Start Ollama automatically
- Enable auto-start on boot

#### Option 2: Manual Installation

Run the official Ollama installation script:

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

This will:
- Install Ollama to `/usr/local/bin/ollama`
- Create a systemd service
- Start the service automatically

## Model Setup

After installing Ollama, you need to download a language model.

### Recommended Model: llama3.2:3b

This is the recommended model for Smart Book Translator:
- **Size**: ~2GB
- **Speed**: Fast (optimized for 3 billion parameters)
- **Quality**: Good balance of speed and accuracy
- **Hardware**: Works well on most modern computers

### Option 1: Download via Smart Book Translator UI

1. Open Smart Book Translator
2. Go to the Translation tab
3. Select "🏠 Local (LibreTranslate)" as the translation provider
4. Enable "🤖 Use LLM Enhancement Layer"
5. The Ollama Panel will appear
6. Click "⬇️ Download Model"
7. Wait for the download to complete (~2GB)

### Option 2: Download via Command Line

```bash
ollama pull llama3.2:3b
```

### Option 3: Download via Setup Script

```bash
npm run setup:ollama
```

## Verification

### Check Ollama Status

**Windows:**
```powershell
ollama --version
```

**Linux:**
```bash
ollama --version
systemctl status ollama
```

### Test Ollama

1. Open Smart Book Translator
2. Go to Translation tab
3. Select "Local (LibreTranslate)"
4. Enable "Use LLM Enhancement Layer"
5. Click "🧪 Test LLM" in the Ollama Panel

You should see a success message if everything is working correctly.

## Troubleshooting

### Ollama Service Not Running

**Windows:**
```powershell
# Start Ollama manually
ollama serve
```

**Linux:**
```bash
# Check service status
systemctl status ollama

# Start service
sudo systemctl start ollama

# Enable auto-start on boot
sudo systemctl enable ollama

# View logs
journalctl -u ollama -f
```

### Model Not Found

If you get a "model not found" error:

1. Check installed models:
```bash
ollama list
```

2. Download the recommended model:
```bash
ollama pull llama3.2:3b
```

### Connection Refused

If Smart Book Translator can't connect to Ollama:

1. Check if Ollama is running:
```bash
curl http://localhost:11434/api/tags
```

2. If not running, start it:
   - **Windows**: Run `ollama serve` in a terminal
   - **Linux**: `sudo systemctl start ollama`

### Slow Performance

If LLM processing is too slow:

1. **Check System Resources**: The Ollama Panel shows your system specs and performance estimate
2. **Consider GPU**: NVIDIA GPUs significantly improve performance
3. **Try a Smaller Model**: Use `llama3.2:1b` for faster processing (lower quality)
4. **Disable LLM Layer**: Uncheck "Use LLM Enhancement Layer" for faster translations

### Out of Memory

If you get memory errors:

1. **Close Other Applications**: Free up RAM
2. **Use Smaller Model**: Try `llama3.2:1b` instead of `llama3.2:3b`
3. **Increase Swap**: On Linux, increase swap space
4. **Upgrade RAM**: 16GB+ recommended for best experience

## Alternative Models

You can use other models if you prefer:

### Faster Models (Lower Quality)
- `llama3.2:1b` - ~1GB, very fast, lower quality
- `phi3:mini` - ~2GB, fast, good for simple tasks

### Better Quality (Slower)
- `llama3.2:7b` - ~4GB, slower, better quality
- `mistral:7b` - ~4GB, good balance
- `llama3:8b` - ~5GB, high quality

To use a different model:

1. Download it: `ollama pull <model-name>`
2. In Smart Book Translator, the model will be automatically detected
3. Or configure it in Settings tab

## Performance Tips

### For Best Performance

1. **Use GPU**: NVIDIA GPUs with CUDA support are much faster
2. **Close Background Apps**: Free up system resources
3. **Use SSD**: Install Ollama and models on an SSD
4. **Sufficient RAM**: 16GB+ recommended
5. **Latest Drivers**: Keep GPU drivers updated

### GPU Support

Ollama automatically uses GPU if available:

**NVIDIA GPUs:**
- Install latest NVIDIA drivers
- CUDA support is automatic
- Check GPU usage in Task Manager (Windows) or `nvidia-smi` (Linux)

**AMD GPUs:**
- ROCm support on Linux
- Limited support on Windows

**Intel GPUs:**
- Basic support via OpenCL
- Performance may vary

## Uninstallation

### Windows

1. Go to Settings > Apps
2. Find "Ollama" in the list
3. Click "Uninstall"

Or use the uninstaller:
```powershell
C:\Program Files\Ollama\Uninstall.exe
```

### Linux

```bash
# Stop service
sudo systemctl stop ollama
sudo systemctl disable ollama

# Remove Ollama
sudo rm /usr/local/bin/ollama
sudo rm /etc/systemd/system/ollama.service
sudo systemctl daemon-reload

# Remove models (optional)
rm -rf ~/.ollama
```

## Additional Resources

- **Official Website**: [ollama.com](https://ollama.com)
- **Model Library**: [ollama.com/library](https://ollama.com/library)
- **GitHub**: [github.com/ollama/ollama](https://github.com/ollama/ollama)
- **Documentation**: [github.com/ollama/ollama/tree/main/docs](https://github.com/ollama/ollama/tree/main/docs)

## Support

If you encounter issues:

1. Check this guide's Troubleshooting section
2. Check Ollama's official documentation
3. Open an issue on the Smart Book Translator GitHub repository
4. Include:
   - Your OS and version
   - Ollama version (`ollama --version`)
   - Error messages
   - System specs (CPU, RAM, GPU)
