# Quick Start Guide - New LLM Pipeline

## What Changed?

The LLM translation pipeline has been completely refactored for better performance with 7B-8B offline models. Here's what's new:

## 🎯 Key Improvements

### 1. Token-Based Chunking
- **OLD**: Character-based chunks (3500-6000 chars)
- **NEW**: Token-based chunks (2400 tokens ≈ 9,600 chars)
- **Why**: Prevents context overflow and timeouts

### 2. Smart Pipeline
- **NEW**: Automatically skips unnecessary LLM stages based on quality
- Translation quality score determines processing:
  - Score ≥85: Skip all LLM stages
  - Score 70-85: Run validation only  
  - Score <70: Run full pipeline

### 3. New Pipeline Flow
```
1. LibreTranslate → Machine translation
2. Text Analyzer → Fast quality check (node library)
3. Validation (Qwen) → Detect issues or say "OK"
4. Rewrite (LLaMA) → Fix ONLY if issues found
5. Technical (Mistral) → Optional final check
```

## 🚀 How to Use

### Basic Setup

1. **Enable LLM Enhancement** in Translation tab
2. **Enable Smart Pipeline** (recommended - checked by default)
3. **Configure Pipeline Stages**:
   - ✅ **Validation** (Qwen 2.5:7b) - Recommended, always enable
   - ✅ **Rewrite** (LLaMA 3.1:8b) - Enable for grammar/semantic fixes
   - ⬜ **Technical** (Mistral 7b) - Optional, for technical accuracy

### Recommended Settings

**For Best Quality:**
- Smart Pipeline: ✅ Enabled
- Validation: ✅ Enabled (qwen2.5:7b)
- Rewrite: ✅ Enabled (llama3.1:8b)  
- Technical: ⬜ Disabled (only if needed)
- Chunk Size: 2400 tokens (default)

**For Speed:**
- Smart Pipeline: ✅ Enabled
- Validation: ✅ Enabled (qwen2.5:7b)
- Rewrite: ⬜ Disabled
- Technical: ⬜ Disabled
- Chunk Size: 3000 tokens

## 📊 Understanding Quality Scores

When you enable LLM enhancement, you'll see quality scores in the logs:

- **95-100**: Excellent - LLM stages skipped
- **85-94**: Very Good - LLM stages skipped
- **70-84**: Good - Validation runs, may skip rewrite
- **50-69**: Fair - Full pipeline runs
- **0-49**: Needs Work - Full pipeline runs

## 🔧 Troubleshooting

### "Ollama Not Installed" Message

**Quick Fix:**
1. Click **"🚀 Install Ollama Automatically"** button
2. Wait for installation to complete
3. **Restart your computer**
4. Relaunch Smart Book Translator

**Manual Installation:**
- Windows: Run `scripts\install-ollama-windows.ps1`
- Linux: Run `bash scripts/install-ollama-linux.sh`
- Or download from: https://ollama.com/download

### Timeouts Still Happening

**Solutions:**
1. Reduce chunk size to 2000 tokens
2. Disable Technical Check stage
3. Ensure "Smart Pipeline" is enabled
4. Check that recommended models are installed:
   - qwen2.5:7b (~4.7GB)
   - llama3.1:8b (~4.7GB)

### Validation Always Says "OK" but Translation Has Errors

**Possible Causes:**
1. Model needs updating - reinstall qwen2.5:7b
2. Quality threshold too low - check settings
3. Grammar patterns need expansion - report issue

### Rewrite Stage Not Running

**This is normal if:**
- Validation stage returned "OK"
- Smart Pipeline detected high quality (score ≥85)
- This is the intended behavior to save time!

## 📈 Performance Tips

### For Long Documents (100+ pages)
- Chunk Size: 2400 tokens
- Enable: Smart Pipeline + Validation only
- Disable: Technical Check
- Expected: ~60% faster than old pipeline

### For Technical Documents
- Chunk Size: 2000 tokens  
- Enable: All stages (Validation + Rewrite + Technical)
- Models: Use recommended defaults
- Expected: Higher quality, slightly slower

### For Fiction/Novels
- Chunk Size: 2400 tokens
- Enable: Validation + Rewrite only
- Formality: Neutral or Informal
- Expected: Natural flow, good speed

## 🎨 Portuguese Grammar Improvements

The new pipeline detects and fixes common Portuguese errors:

### Gender Agreement
- ❌ "bons homens... bom" 
- ✅ "bons homens... bons"

### Plural Agreement  
- ❌ "mulheres bonito"
- ✅ "mulheres bonitas"

### Brazilian vs European
- ❌ "demasiado" (European)
- ✅ "demais" or "muito" (Brazilian)

## 🔍 What Gets Logged

You'll see these messages in the backend logs:

```
✓ Token-based chunking: 15 chunks (avg 2345 tokens/chunk)
📊 Quality score: 78/100 (threshold: 85)
🤖 Good quality (78/100) - will run validation stage only
✓ Validation passed - skipping rewrite and technical stages
```

## 🆘 Getting Help

**Common Questions:**

**Q: Why did it skip my rewrite stage?**  
A: Validation returned "OK", meaning translation quality is already good!

**Q: Can I force all stages to run?**  
A: Disable "Smart Pipeline" and all stages will run every time.

**Q: What's the difference between Validation and Rewrite?**  
A: 
- **Validation**: Fast check (~200 tokens output), says "OK" or lists issues
- **Rewrite**: Full rewrite (~1600 tokens output), fixes identified issues

**Q: Should I use character or token chunking?**  
A: Always use token chunking (default) for LLM-enabled translations.

---

## 📝 Summary

The new pipeline is:
- ✅ **Faster**: Smart early-exit saves ~60% processing time
- ✅ **Better**: Grammar-aware validation catches more errors  
- ✅ **Smarter**: Token-based chunking prevents timeouts
- ✅ **Clearer**: UI shows exactly what each stage does

**Just enable Smart Pipeline and let the system decide what's needed!**

---

For detailed technical information, see: [LLM_PIPELINE_REFACTOR_SUMMARY.md](LLM_PIPELINE_REFACTOR_SUMMARY.md)
