# 📖 Smart Book Translator - Usage Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [First Time Setup](#first-time-setup)
3. [Translating Documents](#translating-documents)
4. [Managing Glossary](#managing-glossary)
5. [Advanced Features](#advanced-features)
6. [Troubleshooting](#troubleshooting)

## Getting Started

### Launching the Application

**Ubuntu/Linux:**
```bash
./run.sh
```
Or search for "Smart Book Translator" in your applications menu.

**Windows:**
- Double-click the "Smart Book Translator" desktop icon
- Or run `run.bat` from the project folder

The application will open in your default web browser at `http://localhost:5173`

## First Time Setup

### Step 1: Configure API Settings

1. Click on the **⚙️ Settings** tab
2. Choose your translation service:

#### Option A: DeepL API (Recommended for European Languages)
1. Get API key from [deepl.com/pro-api](https://www.deepl.com/pro-api)
2. Enter the key in the "DeepL API Key" field
3. Click "Test" to verify
4. If successful, click "💾 Save Settings"

#### Option B: OpenAI API (Best for Context & Multiple Languages)
1. Get API key from [platform.openai.com](https://platform.openai.com)
2. Enter the key in the "OpenAI API Key" field
3. Select your preferred model:
   - **GPT-3.5 Turbo**: Fastest, cheapest, good quality
   - **GPT-4**: Best quality, slower, more expensive
   - **GPT-4 Turbo**: Balance of quality and speed
4. Click "Test" to verify
5. If successful, click "💾 Save Settings"

### Step 2: Set Output Directory (Optional)

1. In Settings tab, find "Output Directory"
2. Enter desired path (e.g., `/home/user/translations` or `C:\Users\YourName\Documents\Translations`)
3. Or use default: `backend/outputs`

### Step 3: You're Ready!

Your settings are saved locally and will persist across sessions.

## Translating Documents

### Basic Translation Workflow

1. **Go to Translation Tab**
   - Click on **🌐 Translation** tab

2. **Upload Document**
   - **Drag & Drop**: Simply drag your file into the upload area
   - **Click to Browse**: Click the upload area to select a file
   - Supported formats: `.pdf`, `.docx`, `.epub`
   - Maximum size: 50MB

3. **Configure Translation**
   - **Source Language**: Select document's current language
   - **Target Language**: Select language to translate to
   - **Translation API**: Choose DeepL or OpenAI
   - **Output Format**: 
     - Leave blank for same format as input
     - Or select: TXT, DOCX, or EPUB
   - **API Key**: Enter key or use saved one

4. **Start Translation**
   - Click **🚀 Start Translation**
   - Wait for upload and processing to complete

5. **Monitor Progress**
   - Watch the progress bar
   - See chunk completion (e.g., "150/200 chunks completed")
   - Check for any failed chunks

6. **Download Result**
   - Once 100% complete, click **⬇️ Download**
   - File will save to your configured output directory

### Example: Translating a Spanish Book to English

```
1. Upload: mi_libro.epub
2. Source Language: Spanish
3. Target Language: English
4. API: DeepL
5. Output: EPUB (same format)
6. Click: Start Translation
7. Wait: ~10-30 minutes (depending on size)
8. Download: translated_mi_libro.epub
```

## Managing Glossary

### Why Use a Glossary?

- Ensure consistent translation of specific terms
- Define technical or domain-specific vocabulary
- Maintain character names, places, product names
- Override AI default translations

### Adding Terms Manually

1. Go to **📖 Glossary** tab
2. Fill in the form:
   - **Source Term**: Original word/phrase
   - **Target Term**: Desired translation
   - **Source Language**: e.g., English
   - **Target Language**: e.g., Spanish
   - **Category**: (Optional) e.g., "Technical", "Names", "Places"
3. Click **➕ Add Entry**

### Example Entries

| Source Term | Target Term | Source Lang | Target Lang | Category |
|-------------|-------------|-------------|-------------|----------|
| Artificial Intelligence | Inteligencia Artificial | en | es | Technical |
| Harry Potter | Harry Potter | en | es | Names |
| London | Londres | en | es | Places |

### Importing Glossary from CSV

1. **Prepare CSV File**

Create a file named `glossary.csv`:
```csv
Source Term,Target Term,Source Language,Target Language,Category
smartphone,smartphone,en,es,Technology
laptop,portátil,en,es,Technology
database,base de datos,en,es,Technical
New York,Nueva York,en,es,Places
```

2. **Import**
   - Click **📥 Import CSV**
   - Select your CSV file
   - Confirm import

3. **Verify**
   - Check that entries appear in the table
   - Use filters to find specific entries

### Exporting Glossary

1. (Optional) Apply filters for specific language pairs
2. Click **📤 Export CSV**
3. Save file for backup or sharing

### Managing Entries

- **Delete**: Click 🗑️ button next to any entry
- **Clear All**: Click **🗑️ Clear All** (requires confirmation)
- **Filter**: Use language dropdowns to filter view

## Advanced Features

### Handling Large Documents

**Problem**: Book with 100,000+ words

**Solutions**:
1. **Adjust Chunk Size** (Settings tab)
   - Larger chunks = fewer API calls
   - Smaller chunks = better error recovery
   - Recommended: 3000-5000 characters

2. **Monitor Progress**
   - Translation happens in chunks
   - Can take 30-60 minutes for large books
   - Progress saves automatically

3. **Retry Failed Chunks**
   - If some chunks fail (network, rate limits)
   - Find job in "Recent Translations"
   - Click **🔄 Retry**

### Checking API Limits

1. In Translation tab, click **📊 Check API Limits**
2. See:
   - Characters used today
   - Number of requests
   - Warnings if approaching limits

### Understanding Translation Status

| Status | Meaning | Action |
|--------|---------|--------|
| Pending | Job created, waiting to start | Wait |
| Translating | In progress | Monitor |
| Completed | Success! | Download |
| Failed | All chunks failed | Check API key, retry |
| Partial | Some chunks failed | Retry failed chunks |

### Resume Interrupted Translations

If application closes during translation:
1. Restart application
2. Find job in "Recent Translations"
3. Click **🔄 Retry**
4. Only failed/pending chunks will be processed

## Troubleshooting

### "Backend not connected"

**Symptoms**: Red "🔴 Offline" in header

**Solutions**:
1. Check backend is running (should see server terminal)
2. Restart backend: `cd backend && npm start`
3. Check port 5000 is not in use
4. Verify `.env` file exists in backend folder

### Translation Fails Immediately

**Symptoms**: Status changes to "Failed" instantly

**Solutions**:
1. Test API key in Settings
2. Check internet connection
3. Verify API account has credits/usage available
4. Try different API provider

### "Rate limit exceeded"

**Symptoms**: Many chunks fail with rate limit error

**Solutions**:
1. Wait 1-2 hours for rate limit to reset
2. Click **🔄 Retry** after waiting
3. Use different API provider
4. Upgrade API plan for higher limits

### Document Upload Fails

**Symptoms**: Error after selecting file

**Solutions**:
1. Check file format is supported (.pdf, .docx, .epub)
2. Ensure file is not corrupted
3. Try smaller file first (test with chapter)
4. Check file size is under 50MB

### Translation Quality Issues

**Symptoms**: Incorrect or poor translation

**Solutions**:
1. Try different API:
   - DeepL: Better for European languages
   - GPT-4: Better for context and nuance
2. Add glossary entries for specific terms
3. Use smaller chunk size for better context
4. Always review and edit AI translations

### Cannot Download Translated File

**Symptoms**: Download button doesn't work

**Solutions**:
1. Check translation status is "Completed"
2. Look in output directory directly:
   - Default: `backend/outputs/`
   - Or your configured directory
3. Check browser download settings
4. Try different browser

### High API Costs

**Symptoms**: Unexpected charges from API provider

**Solutions**:
1. Check API usage in Settings
2. Use GPT-3.5 instead of GPT-4 (cheaper)
3. Use DeepL free tier (500k chars/month)
4. Calculate costs before large jobs:
   - 100k words ≈ $2-3 (GPT-3.5)
   - 100k words ≈ $40-50 (GPT-4)
   - 100k words ≈ €6-10 (DeepL)

## Pro Tips

### 🎯 Optimal Translation Workflow

1. **Test First**: Try with one chapter before full book
2. **Build Glossary**: Add important terms before starting
3. **Choose Right API**: 
   - Fiction: GPT-4 (understands context)
   - Technical: DeepL (precise terminology)
   - Mixed: Try both, compare quality
4. **Check Samples**: Download after 10%, review quality
5. **Always Review**: AI translations need human editing

### 💰 Cost Optimization

1. Use DeepL free tier (500k chars/month)
2. Start with GPT-3.5, upgrade to GPT-4 only if needed
3. Increase chunk size to reduce API calls
4. Translate during off-peak hours (personal preference)
5. Build comprehensive glossary (reduces retries)

### ⚡ Speed Optimization

1. Use GPT-3.5 Turbo (fastest)
2. Increase chunk size to 5000 characters
3. Ensure stable internet connection
4. Close other applications using network
5. Run overnight for large documents

### 🎨 Quality Optimization

1. Use GPT-4 for literary works
2. Smaller chunk sizes (2000-3000) for better context
3. Add glossary for all proper nouns
4. Specify domain in glossary categories
5. Review and edit output manually

## Need More Help?

1. Read the main [README.md](README.md)
2. Check API provider documentation:
   - [DeepL API Docs](https://www.deepl.com/docs-api)
   - [OpenAI API Docs](https://platform.openai.com/docs)
3. Verify Node.js installation: `node -v` (should be 18+)
4. Check terminal/console for error messages

---

**Happy Translating!** 📚✨



