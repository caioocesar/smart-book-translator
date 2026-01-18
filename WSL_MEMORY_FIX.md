# 🔧 WSL Memory Usage Fix Guide

## What is `vmmemWSL`?

`vmmemWSL` is the Windows process that represents the WSL2 (Windows Subsystem for Linux) virtual machine. When you use Docker Desktop on Windows, it runs inside WSL2, and this process manages the memory allocated to WSL2.

**The Problem:**
- WSL2 doesn't automatically release memory back to Windows
- Docker containers continue running even after closing your application
- Memory can accumulate and stay allocated even when not needed

## 🚀 Quick Fix

### Option 1: Use the Stop Script (Easiest)

Run the provided PowerShell script to stop all Docker containers and free WSL memory:

```powershell
.\stop-docker.ps1
```

This script will:
- ✅ Stop all LibreTranslate containers
- ✅ Stop docker-compose services
- ✅ Shutdown WSL2 to free memory
- ✅ Show remaining containers

### Option 2: Manual Commands

**Stop Docker containers:**
```powershell
# Stop LibreTranslate container
docker stop libretranslate
docker rm libretranslate

# Or stop all containers
docker stop $(docker ps -q)

# Stop docker-compose services
docker-compose down
```

**Free WSL memory:**
```powershell
# Shutdown WSL2 (frees memory)
wsl --shutdown
```

**Note:** WSL will restart automatically when you use Docker again.

## ⚙️ Permanent Solution: Limit WSL Memory

### Step 1: Create WSL Config File

1. Open File Explorer
2. Navigate to: `C:\Users\YourUsername\`
3. Create a file named `.wslconfig` (note the dot at the beginning)
4. Copy the contents from `.wslconfig` in this project

**Or use PowerShell:**
```powershell
# Copy the config file to your user directory
Copy-Item ".wslconfig" "$env:USERPROFILE\.wslconfig"
```

### Step 2: Configure Memory Limit

Edit `.wslconfig` and set the memory limit based on your system:

```ini
# For 8GB total RAM
memory=2GB

# For 16GB total RAM (recommended)
memory=4GB

# For 32GB+ total RAM
memory=8GB
```

### Step 3: Restart WSL

After creating/editing `.wslconfig`, restart WSL:

```powershell
wsl --shutdown
```

The next time you start Docker, WSL will use the new memory limit.

## 📊 Verify Memory Usage

**Check current WSL memory:**
```powershell
# In PowerShell
wsl -- cat /proc/meminfo | Select-String "MemTotal"

# Or in WSL terminal
cat /proc/meminfo | grep MemTotal
```

**Check Windows Task Manager:**
1. Press `Ctrl + Shift + Esc`
2. Look for `vmmemWSL` process
3. Check memory usage (should be within your configured limit)

## 🔍 Troubleshooting

### Memory Still High After Stopping Containers

1. **Check for running containers:**
   ```powershell
   docker ps -a
   ```

2. **Stop all containers:**
   ```powershell
   docker stop $(docker ps -q)
   ```

3. **Shutdown WSL:**
   ```powershell
   wsl --shutdown
   ```

4. **Check Docker Desktop:**
   - Open Docker Desktop
   - Go to Settings → Resources
   - Check memory allocation (should match `.wslconfig`)

### WSL Won't Shutdown

If `wsl --shutdown` doesn't work:

1. **Close Docker Desktop completely:**
   - Right-click Docker icon in system tray
   - Click "Quit Docker Desktop"

2. **Shutdown WSL:**
   ```powershell
   wsl --shutdown
   ```

3. **If still stuck, restart WSL service:**
   ```powershell
   # Run as Administrator
   Restart-Service LxssManager
   ```

### Config File Not Working

1. **Verify file location:**
   - Must be in `C:\Users\YourUsername\.wslconfig`
   - File name must start with a dot (`.wslconfig`)

2. **Check file format:**
   - Use plain text (not Word/Notepad++)
   - No BOM (Byte Order Mark)
   - Use LF or CRLF line endings

3. **Restart WSL after changes:**
   ```powershell
   wsl --shutdown
   ```

## 💡 Best Practices

1. **Always stop containers when done:**
   ```powershell
   .\stop-docker.ps1
   ```

2. **Set reasonable memory limits:**
   - Don't allocate more than 50% of your total RAM to WSL
   - Leave at least 4GB for Windows and other applications

3. **Monitor memory usage:**
   - Check Task Manager regularly
   - Use `docker stats` to see container memory usage

4. **Use docker-compose down:**
   ```powershell
   docker-compose down
   ```
   This stops and removes containers properly.

## 📝 Additional Resources

- [WSL2 Documentation](https://docs.microsoft.com/en-us/windows/wsl/)
- [Docker Desktop WSL2 Backend](https://docs.docker.com/desktop/windows/wsl/)
- [WSL2 Memory Management](https://docs.microsoft.com/en-us/windows/wsl/wsl-config#memory)

## 🎯 Summary

**Quick Fix:**
```powershell
.\stop-docker.ps1
```

**Permanent Fix:**
1. Copy `.wslconfig` to `C:\Users\YourUsername\.wslconfig`
2. Set `memory=4GB` (adjust for your system)
3. Run `wsl --shutdown`
4. Restart Docker Desktop

**Prevention:**
- Always run `.\stop-docker.ps1` when done with the application
- Or use `docker-compose down` before closing PowerShell
