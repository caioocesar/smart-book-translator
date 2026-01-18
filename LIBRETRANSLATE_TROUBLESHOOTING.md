# LibreTranslate Troubleshooting Guide

## Common Issues and Solutions

### 🔴 Issue: "Port 5001 is already allocated"

**Cause:** Another LibreTranslate container or service is already using port 5001.

**Solution 1: Stop existing containers (Automatic)**
The app now automatically detects and removes conflicting containers. Just restart the app.

**Solution 2: Manual cleanup**
```bash
# List all LibreTranslate containers
docker ps -a | findstr libretranslate

# Remove all LibreTranslate containers
docker rm -f $(docker ps -a --filter "ancestor=libretranslate/libretranslate" -q)

# Or remove by name
docker rm -f libretranslate
```

**Solution 3: Check what's using the port**
```bash
# Windows
netstat -ano | findstr :5001

# Kill the process (replace PID with the actual process ID)
taskkill /PID <PID> /F
```

---

### 🔴 Issue: "Docker is not running"

**Cause:** Docker Desktop is installed but not started.

**Solution:**
1. Open Docker Desktop application
2. Wait for it to fully start (whale icon should be steady, not animated)
3. Restart Smart Book Translator

---

### 🔴 Issue: "Health check failed: socket hang up"

**Cause:** Container started but LibreTranslate service inside isn't responding yet.

**Solution:**
This is usually temporary. The app will retry automatically. If it persists:

```bash
# Check container logs
docker logs libretranslate

# If you see errors, restart the container
docker restart libretranslate

# Wait 30 seconds and try again
```

---

### 🔴 Issue: "Container started but health check failed"

**Cause:** LibreTranslate is downloading language models (first run only).

**Solution:**
- **First time:** This can take 2-5 minutes while downloading models
- **Check progress:** `docker logs -f libretranslate`
- **Wait for:** "Running on http://0.0.0.0:5000" message
- The app will automatically detect when it's ready

---

### 🔴 Issue: Auto-start fails every time

**Cause:** Various reasons - Docker issues, port conflicts, or system resources.

**Solution: Disable auto-start and start manually**

1. In the app, go to Settings
2. Uncheck "Auto-start LibreTranslate on app launch"
3. Start LibreTranslate manually when needed from the Local Translation panel

**Or start via command line:**
```bash
docker run -d -p 5001:5000 --name libretranslate libretranslate/libretranslate
```

---

## Verification Commands

### Check if LibreTranslate is running
```bash
# Check container status
docker ps | findstr libretranslate

# Check if responding
curl http://localhost:5001/languages

# Or open in browser
start http://localhost:5001
```

### View LibreTranslate logs
```bash
# View all logs
docker logs libretranslate

# Follow logs in real-time
docker logs -f libretranslate

# View last 50 lines
docker logs --tail 50 libretranslate
```

### Restart LibreTranslate
```bash
# Restart existing container
docker restart libretranslate

# Or stop and remove, then start fresh
docker rm -f libretranslate
docker run -d -p 5001:5000 --name libretranslate libretranslate/libretranslate
```

---

## Understanding the Startup Process

When you start the app, here's what happens:

1. **Check Docker** - Is Docker installed and running?
2. **Check existing containers** - Are there old LibreTranslate containers?
3. **Cleanup** - Remove any existing containers to prevent conflicts
4. **Start new container** - Launch fresh LibreTranslate instance
5. **Wait for initialization** - Give it 3-5 seconds to start
6. **Health check** - Verify it's responding (up to 3 attempts)
7. **Ready** - Green indicator shows it's working

**Total time:**
- First run: 30-60 seconds (downloading Docker image)
- Subsequent runs: 5-10 seconds

---

## Advanced: Manual Docker Commands

### Start with specific options
```bash
# Basic start
docker run -d -p 5001:5000 --name libretranslate libretranslate/libretranslate

# With specific languages only (faster startup, less memory)
docker run -d -p 5001:5000 --name libretranslate \
  -e LT_LOAD_ONLY=en,pt,es,fr,de \
  libretranslate/libretranslate

# With more memory (if you have RAM to spare)
docker run -d -p 5001:5000 --name libretranslate \
  --memory=4g \
  libretranslate/libretranslate
```

### Clean up everything
```bash
# Remove all LibreTranslate containers
docker ps -a | findstr libretranslate | ForEach-Object { docker rm -f $_.Split()[0] }

# Remove LibreTranslate image (will re-download on next start)
docker rmi libretranslate/libretranslate

# Clean up Docker system (careful - removes all unused containers/images)
docker system prune -a
```

---

## System Requirements

- **Docker Desktop:** Latest version recommended
- **RAM:** 2-4GB per language model
- **Disk Space:** 5-10GB for models
- **Port 5001:** Must be available (not used by other services)

---

## Still Having Issues?

1. **Check Docker Desktop is running** - Look for whale icon in system tray
2. **Restart Docker Desktop** - Sometimes it gets stuck
3. **Restart your computer** - Classic but effective
4. **Check Docker logs** - `docker logs libretranslate`
5. **Try manual start** - Use the command line commands above
6. **Disable auto-start** - Start manually when needed

---

## What's New in This Version

✅ **Automatic container cleanup** - No more port conflicts!
✅ **Better error messages** - Know exactly what went wrong
✅ **Docker daemon check** - Detects if Docker isn't running
✅ **Port conflict detection** - Identifies what's using port 5001
✅ **Retry logic** - Automatically retries failed starts
✅ **Health check improvements** - More reliable startup detection

---

**Need more help?** Check the main [LIBRETRANSLATE_SETUP.md](./LIBRETRANSLATE_SETUP.md) guide or open an issue on GitHub.
