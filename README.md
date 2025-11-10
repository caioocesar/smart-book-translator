# 📚 Smart Book Translator

A powerful desktop application for translating documents (EPUB, DOCX, PDF) using AI translation services like DeepL and OpenAI. Features include intelligent document splitting, glossary management, progress tracking, and automatic retry on failures.

## ⚠️ Important Copyright Notice

**THIS SOFTWARE IS FOR PERSONAL USE ONLY**

- ✅ **Allowed**: Translating documents you own or have permission to translate for personal use
- ❌ **Not Allowed**: 
  - Commercial use or redistribution
  - Translating copyrighted material without permission
  - Violating intellectual property rights
  - Circumventing DRM or access controls

**You are responsible for complying with all applicable laws and respecting copyright holders' rights.**

## 🔒 Privacy & Local Storage

**Your data stays on your computer:**

- ✅ **100% Local Storage**: All translations, settings, and API keys are stored in an SQLite database on your device
- ✅ **No Cloud Sync**: Your documents never leave your computer (except when sent to translation APIs you configure)
- ✅ **No Telemetry**: We don't track usage, collect analytics, or send any data to external servers
- ✅ **Encrypted Keys**: API keys are encrypted with AES-256 before storage
- ✅ **Full Control**: You can delete all data by removing the database file at any time

**Data Location:**
- Database: `backend/database/translations.db`
- Uploads: `backend/uploads/`
- Outputs: `backend/outputs/`

**What gets sent to external services:**
- Only the text chunks you choose to translate are sent to your selected translation API (DeepL, OpenAI, or Google)
- API keys are transmitted directly to the respective services for authentication
- No other data leaves your computer

## 🔐 Security Features

**NEW in v1.0.0**: Enhanced security for your API keys!

- **🔒 AES-256 Encryption**: All API keys encrypted before storage
- **🔌 Connection Testing**: Test API keys before saving
- **🧪 Automated Tests**: System health checks on startup
- **🛡️ Secure Storage**: SQLite with encrypted sensitive data
- **👁️ System Monitoring**: Real-time health and test status
- **🔐 Password Fields**: Keys never visible in UI

See [SECURITY.md](SECURITY.md) for complete security documentation.

## ✨ Features

### 🌐 Translation
- **Multiple Format Support**: EPUB, DOCX, PDF input and output
- **AI-Powered Translation**: DeepL, OpenAI (GPT-3.5/GPT-4), and **Google Translate (FREE!)** integration
- **🆓 No API Key Required**: Use Google Translate for free without registration
- **Smart Document Splitting**: Automatically chunks large documents respecting API limits
- **Progress Tracking**: Real-time progress updates with WebSocket support
- **Automatic Retry**: Failed chunks are cached and can be retried
- **API Limit Monitoring**: Track usage and avoid exceeding rate limits

### 📖 Glossary Management
- **Custom Glossary**: Define your own term translations
- **CSV Import/Export**: Easy bulk management of glossary entries
- **Language-Specific**: Separate glossaries for different language pairs
- **Category Organization**: Organize terms by category
- **Automatic Application**: Glossary terms are automatically used during translation

### ⚙️ Settings
- **API Configuration**: Save and test API credentials
- **Model Selection**: Choose between different OpenAI models
- **Output Directory**: Configure where translated documents are saved
- **Chunk Size Adjustment**: Optimize translation performance

### 💾 Caching & Reliability
- **SQLite Database**: All data stored locally
- **Translation Cache**: Resume interrupted translations
- **Error Handling**: Graceful degradation on API errors
- **Rate Limit Management**: Automatic delays to respect API limits

## 🧪 Built-in Testing

The application includes comprehensive automated tests that run on startup:

- ✅ Database connectivity and schema validation
- ✅ Encryption/decryption functionality  
- ✅ Settings CRUD operations
- ✅ API key encryption verification
- ✅ Glossary operations
- ✅ Translation job management
- ✅ Document parsing
- ✅ API usage tracking

**View test results**: Click "🔧 System Status" button in the header

## 🚀 Installation & Updates

### First-Time Installation

#### Prerequisites

- **Node.js 18+** ([Download here](https://nodejs.org/))
- Internet connection for API calls
- **Optional**: API keys from DeepL and/or OpenAI (Google Translate is FREE!)

### Ubuntu/Linux Installation

```bash
# Clone or download the repository
cd smart-book-translator

# Run the installation script
chmod +x install-ubuntu.sh
./install-ubuntu.sh

# Start the application
./run.sh
```

The installer will:
- Check Node.js and npm versions
- Install all dependencies
- Create necessary directories
- Generate launcher scripts
- Create a desktop shortcut

#### Windows Installation

```powershell
# Open PowerShell as Administrator
cd smart-book-translator

# Enable script execution (if needed)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Run the installation script
.\install-windows.ps1

# Start the application
.\run.bat
# or
.\run.ps1
```

The installer will:
- Check Node.js and npm versions
- Install all dependencies
- Create necessary directories
- Generate launcher scripts
- Create a desktop shortcut

### Updating to Latest Version

Already have the app installed? Update easily:

**Ubuntu/Linux:**
```bash
./update.sh
```

**Windows:**
```powershell
.\update.ps1
```

The update script will:
- ✅ Backup your database (translations, glossary, settings)
- ✅ Pull latest code changes (if using git)
- ✅ Update all dependencies
- ✅ Preserve your data and API keys
- ✅ Run tests to verify everything works

**Note**: Your settings, glossary, and translation history are preserved during updates!

#### Manual Installation

If the automatic installer doesn't work:

```bash
# Install backend dependencies
cd backend
npm install
cp .env.example .env
mkdir -p uploads outputs data temp
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..

# Start backend (in one terminal)
cd backend
npm start

# Start frontend (in another terminal)
cd frontend
npm run dev
```

## 🎯 Usage

### Quick Start

1. **Launch the Application**
   - Ubuntu: Run `./launch.sh` or click "Smart Book Translator" in your applications menu
   - Windows: Double-click the desktop shortcut or run `run.bat`
   - The application will open in your browser automatically

> **💡 Tip**: If you see "Backend Offline", make sure you're accessing the correct URL. After starting, the terminal will show the correct URLs (usually `http://localhost:3002` for the frontend and `http://localhost:5000` for the backend). Always refresh your browser after restarting the application!

2. **Configure API Settings** (First Time)
   - Go to the **Settings** tab
   - Enter your DeepL and/or OpenAI API key
   - Test the connection
   - Save settings

3. **Translate a Document**
   - Go to the **Translation** tab
   - Upload your document (drag & drop or click to browse)
   - Select source and target languages
   - Choose translation API
   - Enter API key (or use saved one)
   - Click "Start Translation"
   - Monitor progress in real-time
   - Download when complete

### Getting API Keys

#### 🆓 Google Translate (FREE - Recommended for Testing!)
**No API key needed!** Just select "Google Translate" in the app and start translating.

**Perfect for**:
- Testing the application
- Occasional translations
- Learning how it works
- Users without API accounts

**Limitations**:
- May be rate-limited for very heavy usage
- Not recommended for large-scale production use
- Free service with no guarantees

#### DeepL API
1. Visit [deepl.com/pro-api](https://www.deepl.com/pro-api)
2. Sign up for a free or paid account
3. Go to account settings
4. Copy your authentication key
5. Free tier: 500,000 characters/month

#### OpenAI API
1. Visit [platform.openai.com](https://platform.openai.com)
2. Create an account
3. Navigate to API Keys section
4. Create a new secret key
5. Copy and save securely
6. Pricing: Pay per token used

### Using the Glossary

1. **Manual Entry**
   - Go to **Glossary** tab
   - Enter source and target terms
   - Select languages
   - Click "Add Entry"

2. **CSV Import**
   - Prepare CSV file with columns:
     ```
     Source Term, Target Term, Source Language, Target Language, Category
     hello,hola,en,es,Greetings
     world,mundo,en,es,Common
     ```
   - Click "Import CSV"
   - Select your file

3. **Export Glossary**
   - Click "Export CSV"
   - Use filters to export specific language pairs
   - Save for backup or sharing

### Managing Translations

- **View Progress**: Watch real-time updates as chunks are translated
- **Retry Failed Chunks**: If some chunks fail, click "Retry" to reprocess them
- **Download Results**: Click "Download" once translation is complete
- **Check API Usage**: Monitor your daily usage to avoid limits

## 🛠️ Configuration

### Environment Variables

Create `backend/.env`:

```env
PORT=5000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

### Output Directory

Configure in Settings tab or set default:
```
backend/outputs/
```

### Chunk Size

Adjust in Settings (default: 3000 characters):
- Smaller chunks = more API calls, better error handling
- Larger chunks = fewer API calls, risk hitting limits
- Recommended: 3000-5000

## 📊 API Limits & Pricing

### DeepL
- **Free**: 500,000 characters/month
- **Pro**: Starting at 5.99€/month for 1M characters
- **Rate Limits**: 20 requests/minute (Free)

### OpenAI
- **GPT-3.5 Turbo**: $0.0015 per 1K tokens (~750 words)
- **GPT-4**: $0.03 per 1K tokens (~750 words)
- **GPT-4 Turbo**: $0.01 per 1K tokens
- **Rate Limits**: Varies by account tier

### Cost Estimation

Example for a 100,000-word book:
- **DeepL**: ~€6-10 (depending on plan)
- **GPT-3.5**: ~$2-3
- **GPT-4**: ~$40-50

## 🏗️ Architecture

### Backend (Node.js + Express)
```
backend/
├── database/          # SQLite database initialization
├── models/           # Data models (Jobs, Glossary, Settings)
├── services/         # Document parsing, translation, building
├── routes/           # API endpoints
├── uploads/          # Temporary file storage
├── outputs/          # Translated documents
└── server.js         # Main server file
```

### Frontend (React + Vite)
```
frontend/
├── src/
│   ├── components/   # Tab components
│   ├── App.jsx       # Main application
│   └── App.css       # Styling
└── public/           # Static assets
```

### Database Schema
- `settings`: API keys and configuration
- `glossary`: Custom term translations
- `translation_jobs`: Job tracking
- `translation_chunks`: Individual text chunks with cache
- `api_usage`: Daily usage tracking

## 🔧 Development

### Running in Development Mode

```bash
# Backend (with auto-reload)
cd backend
npm run dev

# Frontend (with HMR)
cd frontend
npm run dev
```

### Building for Production

```bash
# Frontend
cd frontend
npm run build

# Backend stays the same (Node.js)
```

### Adding New Features

1. **New Translation API**
   - Add service to `backend/services/translationService.js`
   - Update frontend API provider options

2. **New Document Format**
   - Add parser to `backend/services/documentParser.js`
   - Add builder to `backend/services/documentBuilder.js`

## 🐛 Troubleshooting

### Backend Won't Start
```bash
# Check Node.js version
node -v  # Should be 18+

# Reinstall dependencies
cd backend
rm -rf node_modules package-lock.json
npm install
```

### Frontend Won't Start
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### API Errors
- **401 Unauthorized**: Check API key
- **429 Rate Limit**: Wait before retrying, check usage
- **Connection Error**: Check internet connection
- **Timeout**: Large documents may take time, be patient

### Database Issues
```bash
# Reset database (WARNING: Deletes all data)
rm backend/data/translator.db
# Restart backend to recreate
```

### Translation Failures
1. Check API key in Settings
2. Test API connection
3. Verify document format is supported
4. Check API usage limits
5. Try smaller chunk size

## 📝 License

This project is provided as-is for personal use only. See copyright notice above.

## 🤝 Contributing

As this is a personal use tool, please ensure any contributions:
- Maintain the copyright notice
- Don't enable piracy or illegal use
- Follow ethical AI usage guidelines
- Respect API provider terms of service

## 📞 Support

For issues and questions:
1. Check this README thoroughly
2. Review error messages in terminal
3. Check API provider documentation
4. Verify API keys and limits

## 🔐 Security & Privacy

- **Local Storage**: All data stored locally in SQLite
- **No Telemetry**: No data sent to third parties except APIs
- **API Keys**: Stored locally, never shared
- **Documents**: Uploaded files deleted after processing
- **Temporary Files**: Cleared automatically

## 🌟 Best Practices

1. **Start Small**: Test with a short document first
2. **Check Limits**: Monitor API usage regularly
3. **Backup Glossary**: Export your glossary periodically
4. **Review Translations**: AI isn't perfect, always review output
5. **Respect Copyright**: Only translate documents you have rights to
6. **Save API Keys**: Use Settings tab to save credentials securely

## 📚 Supported Languages

DeepL supports:
- 🇬🇧 English, 🇪🇸 Spanish, 🇫🇷 French, 🇩🇪 German, 🇮🇹 Italian
- 🇵🇹 Portuguese, 🇳🇱 Dutch, 🇵🇱 Polish, 🇷🇺 Russian
- 🇯🇵 Japanese, 🇨🇳 Chinese, and more

OpenAI supports 95+ languages including all major world languages.

## 🎓 Tips for Better Translations

1. **Use Glossaries**: Define technical or domain-specific terms
2. **Choose Right API**: DeepL for European languages, GPT-4 for context
3. **Review & Edit**: AI translations need human review
4. **Split Large Docs**: Better results with smaller sections
5. **Consistent Terminology**: Use glossary for consistency

---

## 📱 Mobile Version

Interested in using this on mobile? Check [MOBILE_VERSION.md](MOBILE_VERSION.md) for:
- PWA (Progressive Web App) - Works now!
- iOS/Android native apps (Capacitor)
- React Native options
- Complete feasibility analysis

**TL;DR**: Responsive web version already works on mobile! Native apps possible with Capacitor.

## 💼 Commercial Use

Want to use this commercially? See [COMMERCIAL_CONSIDERATIONS.md](COMMERCIAL_CONSIDERATIONS.md) for:
- Legal requirements
- API Terms of Service compliance
- Licensing considerations
- Cost breakdown
- Step-by-step commercialization guide

**TL;DR**: Personal use is fine as-is. Commercial use requires paid APIs, proper legal docs, and licensing.

---

**Version**: 1.0.0  
**Last Updated**: November 2025  
**Node.js**: 18+ Required  

Made with ❤️ for personal document translation needs.
