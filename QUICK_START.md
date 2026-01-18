# 🚀 Quick Start Guide

Get up and running in 5 minutes!

## Step 1: Install (2 minutes)

### Ubuntu/Linux
```bash
chmod +x install-ubuntu.sh
./install-ubuntu.sh
```

### Windows
```powershell
.\install-windows.ps1
```

## Step 2: Get API Key (2 minutes)

Choose one or both:

**DeepL** (Best for European languages)
- Visit: https://www.deepl.com/pro-api
- Sign up (Free: 500k chars/month)
- Copy API key

**OpenAI** (Best for variety)
- Visit: https://platform.openai.com
- Create account
- API Keys → Create new key
- Copy and save securely

## Step 3: Launch (10 seconds)

### 🐳 Option A: Docker (Easiest)

```bash
docker-compose up
```

Browser opens to: http://localhost:3000

**First time**: 2-5 minutes (downloading images)  
**After that**: 10-20 seconds

---

### 🖥️ Option B: Electron (Desktop App)

1. Build once:
   ```bash
   npm run electron:build:win  # or :linux
   ```

2. Double-click the installed app

**Instant startup!**

---

### 📦 Option C: Single Server

```bash
npm start
```

Browser opens to: http://localhost:3000

---

### 🛠️ Option D: Development Mode

```bash
npm run dev
```

Both servers start with hot-reload.

---

### 💻 Option E: Manual (Windows)

If other methods fail:

1. Open Command Prompt (Win+R → `cmd` → Enter)
2. Paste:
```cmd
cd /d "C:\Users\YOUR_USER\path\to\smart-book-translator" && start "Backend" cmd /k "cd /d backend && npm start" && timeout /t 3 /nobreak >nul && start "Frontend" cmd /k "cd /d frontend && npm run dev" && timeout /t 10 /nobreak >nul && start http://localhost:3000
```

## Step 4: Configure (1 minute)

1. Click **⚙️ Settings** tab
2. Paste your API key
3. Click **Test** button
4. Click **💾 Save Settings**

## Step 5: Translate! (30 seconds)

1. Click **🌐 Translation** tab
2. Drag & drop your document
3. Select languages
4. Click **🚀 Start Translation**
5. Wait for completion
6. Click **⬇️ Download**

## Done! 🎉

Your translated document is ready!

## Next Steps

- 📖 Build a glossary for consistent terms
- ⚙️ Adjust chunk size for optimization  
- 📊 Monitor API usage to track costs
- 📚 Read [USAGE_GUIDE.md](USAGE_GUIDE.md) for advanced features

## Need Help?

- Check [README.md](README.md) for full documentation
- See [USAGE_GUIDE.md](USAGE_GUIDE.md) for detailed instructions
- Review troubleshooting section for common issues

---

**⚠️ Remember**: For personal use only. Respect copyright laws!



