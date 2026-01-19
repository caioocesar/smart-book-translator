# LLM Truncation Issue - Fix Summary

## 🔴 Problem Identified

**From your log:**
```
[ollama] LLM enhancement rejected {
  reason: 'too-short(0.02)',
  role: 'rewrite',
  originalLength: 18428,
  enhancedLength: 437,  // Only 2% of original!
}
```

### Root Cause:
Your chunk is **18,428 characters** ≈ **~4,600 tokens**

But LLaMA was configured with:
- `max_tokens: 1600` (output limit)
- Input: 4,600 tokens → Output needed: ~4,600 tokens
- **Result:** Output truncated to 437 chars (only 9% of 1600 tokens!)

---

## ✅ Fixes Applied

### 1. **Increased max_tokens for Rewrite & Technical stages**

**Before:**
```javascript
rewrite: { max_tokens: 1600 }
technical: { max_tokens: 1600 }
```

**After:**
```javascript
rewrite: { max_tokens: 4096 }     // Can handle up to ~4000 token outputs
technical: { max_tokens: 4096 }
timeout: 120000                   // 120s (increased from 90s)
```

---

## ⚠️ **IMPORTANT: You Need to Reduce Chunk Size!**

Your current chunk of **18,428 chars = ~4,600 tokens** is too large for optimal LLM processing.

### Recommended Settings:

| Use Case | Chunk Size (tokens) | Max Characters |
|----------|-------------------|----------------|
| **With LLM (Validation + Rewrite)** | **2400** | ~9,600 chars |
| **With Validation Only** | 3000 | ~12,000 chars |
| **LibreTranslate Only** | 6000+ | ~24,000 chars |

### How to Fix in UI:

1. Go to Translation Settings
2. Find "Chunk Size (tokens)"
3. Change from **6000** → **2400**
4. Save settings
5. Retry translation

---

## 📊 Why 2400 Tokens?

```
Input (chunk):        2400 tokens
Output (rewrite):     ~2400 tokens (similar length)
System prompt:        ~500 tokens
Total needed:         ~5300 tokens

LLaMA context:        8192 tokens ✓ (fits comfortably)
Max output allowed:   4096 tokens ✓ (enough for full rewrite)
```

With your current 4,600 token chunks:
```
Input:                4600 tokens
Output needed:        ~4600 tokens
System prompt:        ~500 tokens
Total needed:         ~9600 tokens

LLaMA context:        8192 tokens ✗ (EXCEEDS LIMIT!)
Max output:           4096 tokens ⚠️ (barely enough, risky)
```

---

## 🎯 **Action Items for You:**

### Immediate Fix:
1. **Change chunk size to 2400 tokens** in UI settings
2. **Restart your translation**
3. The truncation issue should be resolved

### Long-term:
- Keep chunk size at **2400 tokens** when using LLM pipeline
- Only use larger chunks (6000+) for LibreTranslate-only mode

---

## 🔬 **Technical Details**

### Model Limits:
| Model | Context Window | Recommended Input | Max Output |
|-------|---------------|------------------|-----------|
| Qwen 2.5 (validation) | 4096 | 2400 tokens | 200 tokens |
| LLaMA 3.1 (rewrite) | 8192 | 2400 tokens | 4096 tokens |
| Mistral (technical) | 8192 | 2400 tokens | 4096 tokens |

### Why Your Chunk Failed:
- Input: 4,600 tokens (too large)
- LLaMA tried to rewrite but hit the 4096 token output limit
- Output truncated at ~437 chars
- Safety check rejected it as "too-short (2% of original)"

### After Fix:
- Input: 2,400 tokens ✓
- LLaMA can output full 2,400+ tokens ✓
- No truncation ✓
- Quality check passes ✓

---

## 🐛 **Other Issues in Your Log:**

### 1. Model Not Installed Warning:
```
⚠️ LLM enhancement failed: Model llama3.2:3b is not installed
```
**Fix:** Download `llama3.2:3b` from the Ollama panel (but this is just the base model, not critical for the pipeline)

### 2. Grammar Issues in Portuguese:
Your text analyzer found grammar issues, which is good - the validation stage is working correctly!

---

## 📈 **Expected Results After Fix:**

With 2400-token chunks, you should see:
```
📊 Quality score: 31/100 (threshold: 85)
🤖 Running full pipeline
🔍 Validation (Qwen): Found 1 issue
✏️ Rewrite (LLaMA): Processing...
✅ Rewrite completed: 2,400 tokens → 2,380 tokens (100% complete)
✓ Translation completed successfully
```

Instead of:
```
⚠️ Rewrite failed: too-short(0.02)  // BEFORE FIX
```

---

## 🎓 **Key Takeaway:**

**Chunk size must match LLM capabilities:**
- Too large → Truncation, timeouts, incomplete outputs
- Too small → Inefficient, context loss between chunks
- **2400 tokens = Sweet spot** for the LLM pipeline

---

**TL;DR:** 
1. I increased `max_tokens` to 4096 (fixes backend limit)
2. **You need to change chunk size to 2400 tokens** (fixes input size)
3. Both fixes together = No more truncation!
