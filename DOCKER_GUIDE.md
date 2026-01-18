# 🐳 Docker Guide - Smart Book Translator

## Why Use Docker?

Docker provides the **easiest** way to run Smart Book Translator with a single command:

✅ **One command** to start everything  
✅ **Cross-platform** - works identically on Windows, Linux, and Mac  
✅ **No Node.js required** - everything runs in containers  
✅ **Isolated environment** - no conflicts with your system  
✅ **Includes LibreTranslate** - local translation ready out of the box  

---

## Prerequisites

### Install Docker Desktop

**Windows & Mac:**
1. Download from: https://www.docker.com/get-started
2. Run the installer
3. Restart your computer
4. Launch Docker Desktop
5. Wait for Docker to start (whale icon in system tray)

**Linux:**
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to docker group (no sudo needed)
sudo usermod -aG docker $USER
# Log out and log back in for this to take effect
```

### Verify Installation

```bash
docker --version
docker-compose --version
```

You should see version numbers for both commands.

---

## Quick Start

### 1. Start the Application

**Windows (CMD or PowerShell):**
```cmd
docker-compose up
```

**Linux/Mac:**
```bash
docker-compose up
```

### 2. Wait for Startup

First time will take 2-5 minutes (downloading images):
- LibreTranslate image: ~2GB
- Building backend: ~1 minute
- Building frontend: ~1 minute

Subsequent starts: **10-20 seconds**

### 3. Access the Application

Open your browser to: **http://localhost:3000**

### 4. Stop the Application

Press `Ctrl+C` in the terminal, then:

```bash
docker-compose down
```

---

## Docker Commands

### Basic Operations

```bash
# Start in foreground (see logs)
docker-compose up

# Start in background (detached)
docker-compose up -d

# Stop everything
docker-compose down

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f libretranslate

# Restart a service
docker-compose restart backend

# Rebuild and start (after code changes)
docker-compose up --build
```

### Maintenance

```bash
# Stop and remove all data (fresh start)
docker-compose down -v

# Remove old images
docker system prune -a

# Check running containers
docker ps

# Check all containers (including stopped)
docker ps -a
```

---

## Architecture

The Docker setup includes 3 services:

```
┌─────────────────────────────────────────┐
│  Frontend (nginx:80 → localhost:3000)  │
│  - React UI                             │
│  - Proxies API calls to backend         │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  Backend (node:5000 → localhost:5000)  │
│  - Express API                          │
│  - SQLite database                      │
│  - Translation logic                    │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  LibreTranslate (5000 → localhost:5001) │
│  - Local translation service            │
│  - No API key needed                    │
└─────────────────────────────────────────┘
```

---

## Data Persistence

Your data is **automatically persisted** in these locations:

- **Database**: `./backend/database/` (on your host machine)
- **Outputs**: `./backend/outputs/` (translated files)

Even if you run `docker-compose down`, your data is safe!

To completely reset:
```bash
docker-compose down -v  # Removes volumes
rm -rf backend/database/*.db  # Delete database
rm -rf backend/outputs/*  # Delete outputs
```

---

## Troubleshooting

### Port Already in Use

**Error**: `port is already allocated`

**Solution**:
```bash
# Find what's using the port
# Windows:
netstat -ano | findstr :3000
netstat -ano | findstr :5000
netstat -ano | findstr :5001

# Linux/Mac:
lsof -i :3000
lsof -i :5000
lsof -i :5001

# Stop the conflicting service or change ports in docker-compose.yml
```

### Docker Not Running

**Error**: `Cannot connect to the Docker daemon`

**Solution**:
- **Windows/Mac**: Start Docker Desktop
- **Linux**: `sudo systemctl start docker`

### Out of Disk Space

**Error**: `no space left on device`

**Solution**:
```bash
# Remove unused images and containers
docker system prune -a

# Remove all volumes (WARNING: deletes data)
docker volume prune
```

### Container Won't Start

**Solution**:
```bash
# Check logs
docker-compose logs backend
docker-compose logs frontend

# Force rebuild
docker-compose down
docker-compose up --build

# Nuclear option (fresh start)
docker-compose down -v
docker system prune -a
docker-compose up --build
```

### LibreTranslate Slow to Start

**Normal behavior**: First start takes 30-60 seconds to initialize.

Check status:
```bash
docker-compose logs -f libretranslate
```

Wait for: `Application startup complete`

---

## Customization

### Change Ports

Edit `docker-compose.yml`:

```yaml
services:
  frontend:
    ports:
      - "8080:80"  # Change 3000 to 8080
  
  backend:
    ports:
      - "8000:5000"  # Change 5000 to 8000
  
  libretranslate:
    ports:
      - "5002:5000"  # Change 5001 to 5002
```

### Limit LibreTranslate Languages

Edit `docker-compose.yml`:

```yaml
  libretranslate:
    environment:
      - LT_LOAD_ONLY=en,pt,es,fr,de  # Only these languages
```

### Resource Limits

Add to `docker-compose.yml`:

```yaml
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
```

---

## Production Deployment

### Using Docker Compose

```bash
# Build for production
docker-compose -f docker-compose.yml build

# Start in production mode
docker-compose up -d

# Enable auto-restart
docker-compose up -d --restart unless-stopped
```

### Using Docker Swarm (Advanced)

```bash
docker swarm init
docker stack deploy -c docker-compose.yml smart-translator
```

---

## Comparison with Other Methods

| Method | Startup Time | Ease of Use | Cross-Platform | Includes LibreTranslate |
|--------|--------------|-------------|----------------|-------------------------|
| **Docker** | ⭐⭐⭐⭐ (10-20s) | ⭐⭐⭐⭐⭐ (1 command) | ⭐⭐⭐⭐⭐ (identical) | ✅ Yes |
| **Electron** | ⭐⭐⭐⭐⭐ (instant) | ⭐⭐⭐⭐⭐ (double-click) | ⭐⭐⭐⭐ (build needed) | ✅ Yes (if Docker installed) |
| **npm start** | ⭐⭐⭐ (30s) | ⭐⭐⭐ (1 command) | ⭐⭐⭐⭐ (Node.js needed) | ⚠️ Manual setup |
| **Manual** | ⭐⭐ (60s+) | ⭐⭐ (multiple commands) | ⭐⭐⭐ (platform-specific) | ⚠️ Manual setup |

---

## Next Steps

1. ✅ Start with Docker: `docker-compose up`
2. 📖 Read [USAGE_GUIDE.md](USAGE_GUIDE.md) for features
3. 🔧 Configure API keys in Settings tab (optional)
4. 🌍 Try local translation with LibreTranslate (no API key!)
5. 📚 Build a glossary for consistent translations

---

## Support

- **Documentation**: [README.md](README.md)
- **Quick Start**: [QUICK_START.md](QUICK_START.md)
- **Usage Guide**: [USAGE_GUIDE.md](USAGE_GUIDE.md)

**Happy Translating!** 📚✨
