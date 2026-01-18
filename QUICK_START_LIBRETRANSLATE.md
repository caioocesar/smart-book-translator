# LibreTranslate Quick Start Guide

## 🚀 First Time Setup (5 minutes)

### Step 1: Install Docker Desktop
1. Download: https://www.docker.com/get-started
2. Install and restart your computer
3. Open Docker Desktop and wait for it to start

### Step 2: Start Smart Book Translator
1. Run `smart-book-translator.bat` (or start manually)
2. LibreTranslate will auto-start automatically
3. Wait 30-60 seconds for first-time setup
4. Look for green "🟢 Online" indicator

### Step 3: Test It
1. Go to Translation tab
2. Click "🧪 Test Translation"
3. See "Hello, world!" → "Olá, mundo!"
4. ✅ Ready to translate books!

---

## ⚡ Daily Use

### Starting the App
Just run `smart-book-translator.bat` - LibreTranslate starts automatically!

**What you'll see:**
```
🐳 Checking LibreTranslate status...
🚀 Auto-starting LibreTranslate...
✅ LibreTranslate started successfully!
   📍 Running at: http://localhost:5001
   🌍 Available languages: 45
```

### If Something Goes Wrong
The app now **automatically fixes** common issues:
- ✅ Removes old containers
- ✅ Clears port conflicts  
- ✅ Retries failed starts
- ✅ Shows helpful error messages

---

## 🔧 Manual Control

### Start LibreTranslate Manually
```bash
docker run -d -p 5001:5000 --name libretranslate libretranslate/libretranslate
```

### Stop LibreTranslate
```bash
docker stop libretranslate
docker rm libretranslate
```

### Check Status
```bash
# Is it running?
docker ps | findstr libretranslate

# View logs
docker logs libretranslate

# Test in browser
start http://localhost:5001
```

---

## ❓ Common Questions

### "Port 5001 is already allocated"
**Fixed automatically!** The app now removes old containers before starting.

### "Docker is not running"
1. Open Docker Desktop
2. Wait for it to start (whale icon steady)
3. Restart Smart Book Translator

### "Health check failed"
**Normal on first run!** LibreTranslate is downloading language models.
- Takes 2-5 minutes first time
- Subsequent starts: 5-10 seconds
- The app will keep checking automatically

### Disable Auto-Start
If you prefer manual control:
1. Settings → Uncheck "Auto-start LibreTranslate"
2. Start manually from Local Translation panel when needed

---

## 📊 System Requirements

| Requirement | Minimum | Recommended |
|------------|---------|-------------|
| Docker Desktop | Latest | Latest |
| RAM | 2GB free | 4GB free |
| Disk Space | 5GB free | 10GB free |
| Port 5001 | Available | Available |

---

## 🎯 Troubleshooting

### Quick Fixes
1. **Restart Docker Desktop** - Fixes 90% of issues
2. **Restart the app** - Automatic cleanup runs
3. **Check Docker is running** - Look for whale icon

### Still Not Working?
See detailed guide: [LIBRETRANSLATE_TROUBLESHOOTING.md](./LIBRETRANSLATE_TROUBLESHOOTING.md)

### Debug Information
Visit in browser: `http://localhost:5000/api/local-translation/containers`
Shows:
- Docker status
- Port availability
- Container information

---

## 💡 Tips

### Speed Up Startup
LibreTranslate loads all languages by default. To load only what you need:

```bash
docker run -d -p 5001:5000 --name libretranslate \
  -e LT_LOAD_ONLY=en,pt,es,fr,de \
  libretranslate/libretranslate
```

### Save Memory
```bash
docker run -d -p 5001:5000 --name libretranslate \
  --memory=2g \
  libretranslate/libretranslate
```

### Keep Running Between Restarts
```bash
docker run -d -p 5001:5000 --name libretranslate \
  --restart unless-stopped \
  libretranslate/libretranslate
```

---

## ✨ What's New

This version includes major improvements:

✅ **Automatic container cleanup** - No more port conflicts!  
✅ **Self-healing startup** - Fixes common issues automatically  
✅ **Better error messages** - Know exactly what to do  
✅ **Docker status checks** - Detects if Docker isn't running  
✅ **Progress feedback** - See what's happening  
✅ **Debug endpoint** - Easy troubleshooting  

---

## 🎉 Success!

When everything is working, you'll see:

**In Console:**
```
✅ LibreTranslate started successfully!
   📍 Running at: http://localhost:5001
   🌍 Available languages: 45
```

**In App:**
- 🟢 Green "Online" indicator
- Language list populated
- Test translation works
- Ready to translate books!

---

**Need Help?** Check [LIBRETRANSLATE_TROUBLESHOOTING.md](./LIBRETRANSLATE_TROUBLESHOOTING.md) for detailed solutions.

**Want Details?** See [IMPROVEMENTS_LIBRETRANSLATE_STARTUP.md](./IMPROVEMENTS_LIBRETRANSLATE_STARTUP.md) for technical info.
