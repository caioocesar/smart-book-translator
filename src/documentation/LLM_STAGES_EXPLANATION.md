# LLM Pipeline Stages - Clear Explanation

## 🔄 **How the New LLM Pipeline Works**

### Pipeline Flow (Sequential):
```
1. LibreTranslate (always) 
   ↓
2. Text Analyzer (fast - analyzes quality)
   ↓
3. 🔍 Validation (Qwen 2.5) - if enabled
   ↓
4. ✏️ Rewrite (LLaMA 3.1) - if needed & enabled
   ↓
5. 🔧 Technical Check (Mistral) - if enabled (optional)
```

---

## 📋 **UI Checkboxes Explained**

### ✨ **"Improve Text Structure"** (Legacy - probably should be removed)
- **What it does:** Enabled LLM enhancement in the old system
- **Current status:** Should be replaced by the new granular stages below
- **Recommendation:** Remove this checkbox to avoid confusion

### 🧠 **"Smart Pipeline (Recommended)"**
- **What it does:** Skips unnecessary LLM stages based on quality score
  - Score ≥85: Skip all LLM (translation is already excellent)
  - Score 70-85: Run validation only
  - Score <70: Run full pipeline
- **Why use it:** Saves time and resources by only processing what needs fixing

### 🔍 **LLM Pipeline Stages** (Individual Controls)

#### **1. Validation (Qwen 2.5)**
- **Model:** `qwen2.5:7b` (~4.7 GB)
- **Purpose:** Fast semantic & grammar check
- **What it does:**
  - Checks if translation meaning is correct
  - Detects grammar errors (gender, plural, verb conjugation)
  - Analyzes language variant (pt-BR vs pt-PT)
  - Checks formality level
- **Output:** Returns "OK" or list of specific issues
- **Output size:** ~200 tokens (very short)
- **When to enable:** Always enable if you want quality control

**Example Validation Output:**
```
[GENDER] "bons homens" but "bom" (should be "bons")
[VARIANT] Uses "comboio" instead of "trem" (European Portuguese)
[FORMALITY] Uses informal "você" in formal context
```

#### **2. Rewrite (LLaMA 3.1)**
- **Model:** `llama3.1:8b` (~4.7 GB)
- **Purpose:** Natural rewriting to fix issues
- **What it does:**
  - **Only runs if Validation found issues!**
  - Rewrites text to fix specific problems identified
  - Makes translation sound more natural
  - Fixes grammar/semantic errors
- **Output size:** ~1600 tokens (full rewritten text)
- **When to enable:** If you want automatic fixes for detected issues

**Smart Behavior:**
- If Validation returns "OK" → Rewrite is **skipped** automatically
- If Validation finds issues → Rewrite runs with **specific instructions**

#### **3. Technical Check (Mistral)**
- **Model:** `mistral:7b` (~4.1 GB)
- **Purpose:** Final technical accuracy check
- **What it does:**
  - Verifies technical terminology
  - Checks formatting consistency
  - Ensures domain-specific accuracy
- **Output size:** ~1600 tokens
- **When to enable:** For technical documents, legal texts, manuals

---

## 🎯 **Recommended Configurations**

### **Scenario 1: General Books/Novels**
```
✅ Smart Pipeline: Enabled
✅ Validation: Enabled (Qwen 2.5)
✅ Rewrite: Enabled (LLaMA 3.1)
❌ Technical Check: Disabled
```
**Result:** Fast, high-quality translations with automatic issue detection

### **Scenario 2: Technical/Legal Documents**
```
✅ Smart Pipeline: Enabled
✅ Validation: Enabled (Qwen 2.5)
✅ Rewrite: Enabled (LLaMA 3.1)
✅ Technical Check: Enabled (Mistral)
```
**Result:** Maximum accuracy for specialized content

### **Scenario 3: Speed Priority (Large Documents)**
```
✅ Smart Pipeline: Enabled
✅ Validation: Enabled (Qwen 2.5)
❌ Rewrite: Disabled
❌ Technical Check: Disabled
```
**Result:** Fast validation-only pass, manual review of flagged issues

### **Scenario 4: No LLM (Fastest)**
```
❌ Smart Pipeline: Disabled
❌ Validation: Disabled
❌ Rewrite: Disabled
❌ Technical Check: Disabled
```
**Result:** Pure LibreTranslate output, no post-processing

---

## ⚙️ **Optimal Settings for Full LLM Pipeline**

If you enable **Validation + Rewrite + Technical**:

| Setting | Recommended Value | Why |
|---------|------------------|-----|
| **Chunk Size** | 2400 tokens | Fits Qwen's 4096 context window |
| **Chunk Overlap** | 100 tokens | Maintains context between chunks |
| **Smart Pipeline** | ✅ Enabled | Skips unnecessary processing |
| **Quality Threshold** | 85 | Skip LLM if score ≥ 85 |

---

## 🐛 **Common Issues & Fixes**

### Issue: "Text splitting failed"
**Cause:** Chunk size too large for token-based chunking  
**Fix:** Use 2400 tokens (default) instead of 6000

### Issue: Blank page when clicking "Download Model"
**Causes:**
1. Model name is undefined/null
2. React rendering error (check browser console F12)
3. Backend not responding

**Fixes:**
- Check browser console (F12 → Console tab) for errors
- Verify Ollama is installed and running
- Refresh the page and check status
- Check network tab for API response

### Issue: Validation always triggers Rewrite even when "OK"
**Cause:** Validation parser not recognizing positive responses  
**Fix:** Should be automatic - parser recognizes "OK", "good", "correct", etc.

---

## 🔬 **How Smart Pipeline Works (Technical)**

```javascript
// Step 1: Text Analyzer gives quality score (0-100)
qualityScore = analyzeTranslation(text); // e.g., 78

// Step 2: Decide which stages to run
if (qualityScore >= 85) {
  // Translation is excellent - skip all LLM
  return originalTranslation;
} else if (qualityScore >= 70) {
  // Good quality - only validate
  runValidation();
  return translation;
} else {
  // Needs improvement - run full pipeline
  const issues = runValidation(); // Qwen finds issues
  if (issues.length > 0) {
    runRewrite(issues); // LLaMA fixes them
  }
  if (technicalEnabled) {
    runTechnicalCheck(); // Mistral final pass
  }
}
```

---

## 📊 **Performance Impact**

| Configuration | Time per Page* | Quality Boost |
|--------------|---------------|---------------|
| LibreTranslate only | 2-5s | Baseline |
| + Validation | 5-8s | +15% |
| + Rewrite (when needed) | 10-20s | +30% |
| + Technical Check | 15-25s | +40% |

*Times vary based on hardware (GPU/CPU), chunk size, and model size

---

## 🎓 **Pro Tips**

1. **Start with Smart Pipeline enabled** - it automatically optimizes
2. **Use 2400 tokens for chunk size** - prevents timeouts
3. **Enable Validation + Rewrite for best results** - Technical is optional
4. **Check the logs** - Validation stage shows specific issues found
5. **Download models in order:**
   - First: `llama3.2:3b` (2GB, base model)
   - Then: `qwen2.5:7b` (4.7GB, validation)
   - Then: `llama3.1:8b` (4.7GB, rewrite)
   - Optional: `mistral:7b` (4.1GB, technical)

---

## ❓ **FAQ**

**Q: Which LLM actually runs when I enable "Rewrite"?**  
A: LLaMA 3.1 8B (`llama3.1:8b`)

**Q: Can I use a different model for Validation?**  
A: Yes, there's a dropdown to select a custom model

**Q: What if I only enable Rewrite without Validation?**  
A: Rewrite will run for ALL chunks, which is slower and unnecessary

**Q: Does the recommended model (llama3.2:3b) replace the pipeline models?**  
A: No, `llama3.2:3b` is a lightweight base model. The pipeline uses specialized models (Qwen for validation, LLaMA 3.1 for rewrite, Mistral for technical)

**Q: Why is my chunk size 6000 but the default is 2400?**  
A: 6000 tokens is for LibreTranslate-only mode. Switch to 2400 when using LLM stages.

---

**TL;DR:** Enable Smart Pipeline + Validation + Rewrite for best results. Use 2400 tokens. Download `qwen2.5:7b` and `llama3.1:8b` models.
