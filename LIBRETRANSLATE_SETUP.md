# LibreTranslate Setup Guide

## 🏠 What is LibreTranslate?

LibreTranslate is a **free, open-source, self-hosted** translation API. It provides:

- ✅ **100% Free** - No API costs, unlimited translations
- ✅ **Complete Privacy** - Your texts never leave your computer
- ✅ **No Rate Limits** - Translate as much as you want
- ✅ **Offline Capable** - Works without internet (after initial setup)
- ⚠️ **Quality Note**: Translation quality is ~70% of DeepL, but constantly improving

## 📋 Requirements

- **Docker Desktop** (recommended) OR Python 3.8+
- **2-4GB RAM** per language model
- **5-10GB disk space** for models

---

## 🚀 Quick Start (Recommended: Docker)

### Step 1: Install Docker

**Windows:**
1. Download [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
2. Run the installer
3. Restart your computer
4. Open Docker Desktop and wait for it to start

**Mac:**
1. Download [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/)
2. Drag to Applications folder
3. Open Docker Desktop

**Linux:**
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
# Log out and back in for group changes to take effect
```

### Step 2: Start LibreTranslate

**Option A: From Smart Book Translator (Automatic)**

1. Open Smart Book Translator
2. Go to Translation tab
3. Select "🏠 Local (LibreTranslate) - FREE" as API Provider
4. Click "▶️ Start LibreTranslate"
5. Wait 30-60 seconds for first-time setup
6. Click "🧪 Test Translation" to verify

**Option B: Manual Command**

Open terminal/PowerShell and run:

```bash
docker run -d -p 5001:5000 --name libretranslate libretranslate/libretranslate
```

**What this does:**
- `-d`: Run in background
- `-p 5001:5000`: Map port 5001 (your computer) to 5000 (container)
- `--name libretranslate`: Give it a friendly name
- `libretranslate/libretranslate`: The official image

### Step 3: Verify It's Running

Open your browser and go to: http://localhost:5001

You should see the LibreTranslate web interface.

---

## 🛠️ Advanced Setup

### Custom Port

If port 5001 is already in use:

```bash
docker run -d -p 5002:5000 --name libretranslate libretranslate/libretranslate
```

Then update the URL in Smart Book Translator settings to `http://localhost:5002`

### Specific Language Pairs

To save disk space, download only specific languages:

```bash
docker run -d -p 5001:5000 \
  -e LT_LOAD_ONLY=en,pt,es,fr \
  --name libretranslate \
  libretranslate/libretranslate
```

Available codes: `en`, `pt`, `es`, `fr`, `de`, `it`, `ru`, `ja`, `zh`, `ar`, `nl`, `pl`, `tr`, `ko`

### GPU Acceleration (NVIDIA only)

For 5-10x faster translations:

```bash
docker run -d -p 5001:5000 \
  --gpus all \
  --name libretranslate \
  libretranslate/libretranslate
```

**Requirements:**
- NVIDIA GPU
- [NVIDIA Docker runtime](https://github.com/NVIDIA/nvidia-docker)

### Persistent Storage

To keep models between container restarts:

```bash
docker run -d -p 5001:5000 \
  -v libretranslate-data:/home/libretranslate/.local \
  --name libretranslate \
  libretranslate/libretranslate
```

---

## 🐍 Alternative: Python Installation (Without Docker)

### Step 1: Install LibreTranslate

```bash
pip install libretranslate
```

### Step 2: Start the Server

```bash
libretranslate --host 0.0.0.0 --port 5001
```

**Note:** First run will download ~2GB of language models. This may take 10-30 minutes.

### Step 3: Keep It Running

**Linux/Mac (background):**
```bash
nohup libretranslate --host 0.0.0.0 --port 5001 &
```

**Windows (new terminal):**
Just keep the terminal window open, or use Task Scheduler to run at startup.

---

## 📊 Managing LibreTranslate

### Check if Running

```bash
docker ps | grep libretranslate
```

Or open: http://localhost:5001

### Stop LibreTranslate

```bash
docker stop libretranslate
```

### Start Again

```bash
docker start libretranslate
```

### Remove Completely

```bash
docker stop libretranslate
docker rm libretranslate
```

### View Logs

```bash
docker logs libretranslate
```

### Update to Latest Version

```bash
docker stop libretranslate
docker rm libretranslate
docker pull libretranslate/libretranslate
docker run -d -p 5001:5000 --name libretranslate libretranslate/libretranslate
```

---

## 🔧 Troubleshooting

### "Docker is not installed"

**Solution:** Install Docker Desktop from https://www.docker.com/get-started

### "Port 5001 is already in use"

**Solution:** Use a different port:
```bash
docker run -d -p 5002:5000 --name libretranslate libretranslate/libretranslate
```

Update Smart Book Translator settings to use `http://localhost:5002`

### "Cannot connect to Docker daemon"

**Windows/Mac:** Make sure Docker Desktop is running (check system tray)

**Linux:**
```bash
sudo systemctl start docker
sudo usermod -aG docker $USER
# Log out and back in
```

### "Translation is very slow"

**Causes:**
- First translation downloads models (~2GB) - wait 10-30 minutes
- CPU-only mode is slower - consider GPU acceleration
- Large texts take longer - try smaller chunks

**Solutions:**
1. Wait for models to download (check `docker logs libretranslate`)
2. Use GPU acceleration (if you have NVIDIA GPU)
3. Reduce chunk size in Smart Book Translator settings

### "Out of memory" / Container crashes

**Solution:** Increase Docker memory limit:

**Docker Desktop:**
1. Open Docker Desktop
2. Settings → Resources
3. Increase Memory to at least 4GB
4. Click "Apply & Restart"

### "Models not found" / "Language not supported"

**Solution:** Restart container to download models:
```bash
docker restart libretranslate
docker logs -f libretranslate  # Watch download progress
```

---

## 💡 Performance Tips

### 1. Use GPU Acceleration

5-10x faster with NVIDIA GPU. See "GPU Acceleration" section above.

### 2. Increase Batch Size

In Smart Book Translator settings, increase sentence batch size to 1500-2000 characters.

### 3. Pre-download Models

On first run, LibreTranslate downloads models. Do a test translation before starting a big job:

1. Select "Local (LibreTranslate)" in Smart Book Translator
2. Click "🧪 Test Translation"
3. Wait for it to complete (may take 2-5 minutes first time)
4. Now start your actual translation

### 4. Use Specific Languages

Only load languages you need to save RAM and disk space:

```bash
docker run -d -p 5001:5000 \
  -e LT_LOAD_ONLY=en,pt \
  --name libretranslate \
  libretranslate/libretranslate
```

---

## 🆚 LibreTranslate vs Paid APIs

| Feature | LibreTranslate | DeepL | OpenAI | Google |
|---------|---------------|-------|--------|--------|
| **Cost** | FREE | $5-25/book | $2-50/book | FREE (limited) |
| **Quality** | Good (70%) | Excellent (100%) | Very Good (85%) | Good (75%) |
| **Privacy** | 100% Local | Cloud | Cloud | Cloud |
| **Rate Limits** | None | 500k chars/month (free) | Pay-per-use | Soft limits |
| **Offline** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **Setup** | 5 minutes | 2 minutes | 2 minutes | 0 minutes |

**Recommendation:**
- **For best quality:** Use DeepL (paid) or OpenAI GPT-4
- **For free unlimited:** Use LibreTranslate (local)
- **For quick tests:** Use Google Translate

---

## 📚 Additional Resources

- **Official Docs:** https://github.com/LibreTranslate/LibreTranslate
- **Docker Hub:** https://hub.docker.com/r/libretranslate/libretranslate
- **Web Demo:** https://libretranslate.com
- **Report Issues:** https://github.com/LibreTranslate/LibreTranslate/issues

---

## 🎯 Quick Reference Commands

```bash
# Start LibreTranslate
docker run -d -p 5001:5000 --name libretranslate libretranslate/libretranslate

# Stop
docker stop libretranslate

# Start again
docker start libretranslate

# Check status
docker ps | grep libretranslate

# View logs
docker logs libretranslate

# Remove completely
docker stop libretranslate && docker rm libretranslate

# Update to latest
docker pull libretranslate/libretranslate
```

---

## ✅ Success Checklist

- [ ] Docker Desktop installed and running
- [ ] LibreTranslate container started
- [ ] http://localhost:5001 opens in browser
- [ ] Test translation works in Smart Book Translator
- [ ] First translation completed (models downloaded)
- [ ] Ready to translate books! 🎉

---

**Need Help?** Check the troubleshooting section above or open an issue in the Smart Book Translator repository.
