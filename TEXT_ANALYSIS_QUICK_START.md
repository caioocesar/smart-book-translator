# 📊 Text Analysis Layer - Quick Start

**For Developers**: Quick reference for the Text Analysis Layer (1.5)

## What Is It?

An intelligent intermediate layer that analyzes machine translations and provides targeted guidance to the LLM for better refinement.

```
LibreTranslate → Text Analyzer → Ollama LLM
   (Layer 1)      (Layer 1.5)      (Layer 2)
```

## Quick Test

```bash
# Test the text analyzer
cd backend
node test-text-analyzer.js
```

## How It Works

### 1. Automatic Activation
The analysis layer runs automatically when LLM enhancement is enabled:

```javascript
const result = await localTranslationService.translate(text, 'en', 'pt', glossary, {
  useLLM: true  // Analysis runs automatically
});
```

### 2. Analysis Report
The analyzer returns a detailed report:

```javascript
{
  readability: {
    score: 45.2,
    level: 'fairly_difficult',
    avgWordsPerSentence: 22.5
  },
  sentences: {
    count: 10,
    avgLength: 22.5,
    longSentences: [...]
  },
  words: {
    total: 225,
    unique: 120,
    diversity: 0.53
  },
  issues: [
    {
      type: 'long_sentences',
      severity: 'high',
      description: 'Found 3 very long sentences (>25 words)',
      suggestion: 'Split these sentences for better readability'
    }
  ],
  hasIssues: true
}
```

### 3. LLM Enhancement
The LLM receives specific instructions based on the analysis:

```
TEXT ANALYSIS - SPECIFIC ISSUES DETECTED:
1. 🟠 Sentences are too long (avg: 28.5 words)
   → Break long sentences into shorter, clearer ones
   Examples to fix:
   • "This is a very long sentence that..."

2. 🟡 Vocabulary is repetitive (diversity: 0.35)
   → Use more varied vocabulary and synonyms
```

## What It Detects

| Issue Type | Detection Criteria | Severity |
|-----------|-------------------|----------|
| **Readability** | Flesch score < 30 | High |
| **Long Sentences** | Avg length > 25 words | High |
| **Repetitive Vocabulary** | Diversity < 0.4 | Medium |
| **Language Mismatch** | Wrong target language | Critical |
| **Choppy Writing** | Too many short sentences | Low |

## Code Examples

### Using the Analyzer Directly

```javascript
import textAnalyzer from './services/textAnalyzer.js';

const report = await textAnalyzer.analyzeTranslation(
  originalText,
  translatedText,
  'en',
  'pt'
);

console.log('Issues:', report.issues);
console.log('Readability:', report.readability.score);
```

### Accessing Analysis in Translation Results

```javascript
const result = await localTranslationService.translate(...);

// Analysis report is included
console.log(result.analysisReport);

// LLM stats include issues addressed
console.log(result.llmStats.issuesAddressed); // e.g., 3
```

### Generating LLM Prompts

```javascript
const llmPrompt = textAnalyzer.generateLLMPrompt(analysisReport);
// Returns formatted prompt text for LLM
```

## Performance

- **Analysis Time**: 50-200ms per page (~2000 chars)
- **Overhead**: Negligible compared to LLM (2-20 seconds)
- **Memory**: Minimal (Pure JavaScript)
- **Dependencies**: Natural NLP (already installed)

## Files Modified

| File | Changes |
|------|---------|
| `backend/services/textAnalyzer.js` | ✨ NEW - Main analyzer service |
| `backend/services/localTranslationService.js` | Added Step 5.5 (analysis) |
| `backend/services/ollamaService.js` | Enhanced prompts with analysis |
| `backend/test-text-analyzer.js` | ✨ NEW - Test script |

## Configuration

No configuration needed! The analysis layer:
- ✅ Activates automatically when LLM is enabled
- ✅ Uses existing Natural library (no installation)
- ✅ Works offline
- ✅ Has zero external dependencies

## Debugging

### Enable Detailed Logging

```javascript
// In textAnalyzer.js
console.log('📊 Analysis Report:', JSON.stringify(report, null, 2));
```

### Check Analysis Results

```bash
# Run translation and check logs
npm run dev:backend

# Look for:
# "📊 Text Analysis: Found X issue(s)"
# "✓ Text analysis completed in Xms"
```

### Verify LLM Receives Analysis

```javascript
// In ollamaService.js buildEnhancementPrompt()
console.log('Analysis Issues:', extra?.analysisReport?.issues);
```

## Common Issues

### Issue: Analysis not running
**Solution**: Ensure `useLLM: true` in translation options

### Issue: Natural library error
**Solution**: Run `cd backend && npm install`

### Issue: No issues detected but translation is poor
**Solution**: Analysis focuses on measurable metrics; LLM still does general enhancement

## API Reference

### Main Method

```javascript
textAnalyzer.analyzeTranslation(originalText, translatedText, sourceLang, targetLang)
```

**Returns**: `Promise<AnalysisReport>`

### Helper Methods

```javascript
// Generate LLM prompt from analysis
textAnalyzer.generateLLMPrompt(analysisReport)

// Internal methods (private)
textAnalyzer.analyzeReadability(text)
textAnalyzer.analyzeSentences(text)
textAnalyzer.analyzeWords(text)
textAnalyzer.analyzeSentiment(text, lang)
textAnalyzer.detectLanguage(text, expectedLang)
```

## Testing Checklist

- [ ] Run `node backend/test-text-analyzer.js`
- [ ] Verify long sentences are detected
- [ ] Verify repetitive vocabulary is detected
- [ ] Verify good quality text has no issues
- [ ] Verify difficult text is flagged
- [ ] Test with actual translation pipeline
- [ ] Check LLM receives analysis in prompts
- [ ] Verify analysis report in translation results

## Benefits Summary

| Benefit | Impact |
|---------|--------|
| **Targeted Fixes** | LLM focuses on actual problems |
| **Faster Processing** | Specific fixes are quicker |
| **Better Quality** | More consistent results |
| **No Setup** | Uses existing dependencies |
| **Offline** | No external services |

## Next Steps

1. **Test**: Run the test script
2. **Integrate**: Already integrated, just enable LLM
3. **Monitor**: Check logs for analysis results
4. **Optimize**: Adjust thresholds if needed (future)

## Related Documentation

- [TEXT_ANALYSIS_LAYER.md](TEXT_ANALYSIS_LAYER.md) - Complete documentation
- [LLM_LAYER_GUIDE.md](LLM_LAYER_GUIDE.md) - LLM usage guide
- [IMPLEMENTATION_SUMMARY_LLM_LAYER.md](IMPLEMENTATION_SUMMARY_LLM_LAYER.md) - Implementation details

---

**Questions?** Check the full documentation in `TEXT_ANALYSIS_LAYER.md`
