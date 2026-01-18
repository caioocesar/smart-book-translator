# 🤖 LLM Enhancement Layer Guide

This guide explains how to use the LLM (Large Language Model) Enhancement Layer in Smart Book Translator to improve translation quality.

## Overview

The LLM Enhancement Layer is an optional post-processing step that uses AI to refine translations from LibreTranslate. It provides:

1. **Formality Adjustment** - Control the tone (informal/neutral/formal)
2. **Text Structure Improvements** - Enhance cohesion, coherence, and grammar
3. **Glossary Verification** - Ensure technical terms are correctly translated

## How It Works

```
Original Text
    ↓
LibreTranslate (Machine Translation)
    ↓
LLM Enhancement Layer (AI Post-Processing)
    ↓
Final Enhanced Translation
```

The process:
1. Text is first translated by LibreTranslate (fast, free, local)
2. The translation is then enhanced by Ollama LLM (improves quality)
3. Result is a more natural, accurate translation

## Prerequisites

Before using the LLM Enhancement Layer, you need:

1. ✅ **Ollama installed** - See [OLLAMA_SETUP.md](OLLAMA_SETUP.md)
2. ✅ **Model downloaded** - Recommended: `llama3.2:3b` (~2GB)
3. ✅ **Ollama service running** - **Auto-starts when you open the app!** ✨

### Auto-Start Feature

**Good news!** Ollama now auto-starts when you launch the app (if installed). You don't need to manually start it anymore!

- ✅ **Automatic**: Ollama starts automatically on app launch
- ✅ **Retry Logic**: If start fails, it retries up to 3 times
- ✅ **Frontend Fallback**: If backend auto-start fails, frontend will try after 30 seconds
- ✅ **Status Indicator**: Check the header status indicator to see if Ollama is running

## Enabling the LLM Layer

### Step 1: Select Local Translation

1. Open Smart Book Translator
2. Go to the **Translation** tab
3. Select **"🏠 Local (LibreTranslate) - FREE"** as the translation provider

### Step 2: Enable LLM Enhancement

1. Scroll down to find the **"🤖 Use LLM Enhancement Layer"** checkbox
2. Check the box to enable it
3. The LLM configuration options will appear

### Step 3: Configure Options

Choose your preferences:

#### Formality Level

Select the tone for your translation:

- **😊 Informal** - Casual, conversational tone
  - Use for: Novels, casual content, social media
  - Example: "Hey, how's it going?"
  
- **⚖️ Neutral** - Balanced, standard tone (Recommended)
  - Use for: Most documents, general content
  - Example: "Hello, how are you?"
  
- **🎩 Formal** - Professional, formal tone
  - Use for: Business documents, academic papers, official content
  - Example: "Greetings, I trust you are well."

#### Text Structure Improvements

- **✨ Improve Text Structure** (Recommended: Enabled)
  - Enhances cohesion (how sentences connect)
  - Improves coherence (logical flow of ideas)
  - Fixes grammar and syntax issues
  - Makes language more natural and fluent

#### Glossary Verification

- **📚 Verify Glossary Terms** (Enable if you have glossary entries)
  - Double-checks that technical terms match your glossary
  - Corrects any mistranslations of specialized vocabulary
  - Only available if you have glossary entries for the language pair

### Step 4: Check System Requirements

The **Ollama Panel** will show:
- Installation status
- Model availability
- System specs (CPU, RAM, GPU)
- Performance estimate

Example:
```
🟢 Fast performance with RTX 3060
Estimated processing time: ~2-3 seconds per page
```

## Usage Examples

### Example 1: Translating a Novel (Informal)

**Settings:**
- Formality: **Informal**
- Improve Structure: **Enabled**
- Glossary Verification: **Disabled**

**Before LLM:**
> "The man walked to the store. He bought milk. Then he returned home."

**After LLM:**
> "The guy headed to the store, picked up some milk, and made his way back home."

### Example 2: Business Document (Formal)

**Settings:**
- Formality: **Formal**
- Improve Structure: **Enabled**
- Glossary Verification: **Enabled**

**Before LLM:**
> "We need to discuss the project timeline. Please send the report."

**After LLM:**
> "It is necessary to discuss the project timeline. We kindly request that you submit the report at your earliest convenience."

### Example 3: Technical Manual (Neutral + Glossary)

**Settings:**
- Formality: **Neutral**
- Improve Structure: **Enabled**
- Glossary Verification: **Enabled**

**Glossary:**
- "API" → "Interface de Programação de Aplicações"
- "Database" → "Banco de Dados"

**Before LLM:**
> "The API connects to the database to retrieve data."

**After LLM:**
> "A Interface de Programação de Aplicações conecta-se ao Banco de Dados para recuperar os dados."

## Performance Considerations

### Processing Time

The LLM layer adds processing time to translations:

| Hardware | Estimated Time per Page |
|----------|------------------------|
| 🟢 NVIDIA GPU (6GB+ VRAM) | 2-3 seconds |
| 🟡 Modern CPU (8+ cores) | 5-10 seconds |
| 🔴 Basic CPU (4 cores) | 15-20 seconds |

**Tips to improve speed:**
- Use a GPU if available
- Close other applications
- Use smaller models for faster processing

### Quality vs Speed Trade-off

You can balance quality and speed:

1. **Maximum Quality** (Slowest)
   - Model: `llama3:8b` or `mistral:7b`
   - All enhancements enabled
   - Best for important documents

2. **Balanced** (Recommended)
   - Model: `llama3.2:3b`
   - All enhancements enabled
   - Good quality, reasonable speed

3. **Fast** (Lower Quality)
   - Model: `llama3.2:1b`
   - Only formality adjustment
   - Quick processing, basic improvements

## Best Practices

### When to Use LLM Enhancement

✅ **Use it for:**
- Important documents that need high quality
- Content where tone matters (formal/informal)
- Technical documents with specialized terminology
- Long-form content (books, reports)
- When you have time for processing

❌ **Skip it for:**
- Quick translations or previews
- Very large documents (if time is limited)
- When speed is more important than perfection
- Simple, straightforward content

### Optimal Settings by Document Type

| Document Type | Formality | Structure | Glossary |
|--------------|-----------|-----------|----------|
| Novel/Fiction | Informal | ✅ | ❌ |
| Blog Post | Neutral | ✅ | ❌ |
| Business Email | Formal | ✅ | ❌ |
| Technical Manual | Neutral | ✅ | ✅ |
| Academic Paper | Formal | ✅ | ✅ |
| Legal Document | Formal | ✅ | ✅ |
| Social Media | Informal | ❌ | ❌ |

## Troubleshooting

### "Ollama is not running"

**Solution:**
1. Check Ollama status in the panel
2. Click "▶️ Start Ollama" button
3. Or manually start: `ollama serve` (Windows) or `sudo systemctl start ollama` (Linux)

### "Model not installed"

**Solution:**
1. Click "⬇️ Download Model" in the Ollama Panel
2. Or run: `ollama pull llama3.2:3b`
3. Wait for download to complete (~2GB)

### "Processing is too slow"

**Solutions:**
1. Check system specs in Ollama Panel
2. Close other applications to free RAM
3. Use a smaller model: `ollama pull llama3.2:1b`
4. Consider getting a GPU for faster processing
5. Disable LLM layer for quick translations

### "Out of memory"

**Solutions:**
1. Close other applications
2. Use smaller model (`llama3.2:1b`)
3. Increase system swap/page file
4. Upgrade RAM (16GB+ recommended)

### "Translation quality not improved"

**Possible causes:**
1. Source translation was already good
2. Wrong formality setting for content type
3. Model not suitable for language pair
4. Try different model or settings

## Advanced Configuration

### Using Different Models

You can use any Ollama-compatible model:

1. Download model: `ollama pull <model-name>`
2. Model will appear in Smart Book Translator automatically
3. Select it in Settings tab (if option available)

**Popular alternatives:**
- `mistral:7b` - Good quality, balanced speed
- `phi3:mini` - Very fast, lower quality
- `llama3:8b` - High quality, slower

### Custom Prompts (Advanced)

For developers: You can modify the enhancement prompts in:
```
backend/services/ollamaService.js
```

Look for the `buildEnhancementPrompt()` method.

## Comparison: With vs Without LLM

### Example Translation (English → Portuguese)

**Original English:**
> "The quick brown fox jumps over the lazy dog. It was a sunny day."

**LibreTranslate Only:**
> "A raposa marrom rápida pula sobre o cão preguiçoso. Foi um dia ensolarado."

**LibreTranslate + LLM (Neutral):**
> "A ágil raposa marrom salta sobre o cão preguiçoso. Era um dia ensolarado."

**Improvements:**
- Better word choice ("ágil" instead of "rápida")
- More natural verb ("salta" instead of "pula")
- Better verb tense ("Era" instead of "Foi")

## FAQ

**Q: Is the LLM layer free?**  
A: Yes! It runs locally on your computer with no API costs.

**Q: Does it work offline?**  
A: Yes, after downloading the model, it works completely offline.

**Q: How much does it improve quality?**  
A: Typically 10-30% improvement in naturalness and accuracy, depending on content.

**Q: Can I use it with other translation providers?**  
A: Currently only works with Local (LibreTranslate). Support for other providers may be added later.

**Q: Does it support all languages?**  
A: The model supports major languages, but quality varies. Best for: English, Spanish, French, German, Portuguese, Italian, Chinese, Japanese.

**Q: Can I train my own model?**  
A: Advanced users can fine-tune models, but it's complex. See Ollama documentation for details.

## Additional Resources

- [Ollama Setup Guide](OLLAMA_SETUP.md) - Installation instructions
- [Ollama Official Docs](https://github.com/ollama/ollama/tree/main/docs) - Technical documentation
- [Model Library](https://ollama.com/library) - Browse available models
- [Smart Book Translator README](README.md) - Main documentation

## Feedback

We're constantly improving the LLM Enhancement Layer. If you have suggestions or encounter issues:

1. Open an issue on GitHub
2. Include:
   - Document type
   - Settings used
   - Example of input/output
   - What could be improved

Your feedback helps make the feature better for everyone!
