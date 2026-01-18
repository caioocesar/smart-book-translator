import Logger from '../utils/logger.js';

/**
 * Text Analyzer Service
 * 
 * Analyzes translated text for quality issues using Natural NLP library.
 * This is the "1.5 layer" between LibreTranslate and Ollama LLM.
 * 
 * Provides:
 * - Readability analysis
 * - Sentence complexity detection
 * - Word statistics and lexical diversity
 * - Language detection verification
 * - Sentiment analysis (tone consistency)
 * - Specific issues for LLM to fix
 */

class TextAnalyzer {
  constructor() {
    this.natural = null;
    this.initialized = false;
  }

  /**
   * Initialize Natural library (lazy loading)
   * @private
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      this.natural = await import('natural');
      this.initialized = true;
      console.log('✓ Text Analyzer initialized with Natural NLP');
    } catch (error) {
      Logger.logError('textAnalyzer', 'Failed to initialize Natural', error, {});
      throw new Error('Natural library not available. Install with: npm install natural');
    }
  }

  /**
   * Analyze translation quality
   * @param {string} originalText - Original source text
   * @param {string} translatedText - Translated text to analyze
   * @param {string} sourceLang - Source language code
   * @param {string} targetLang - Target language code
   * @returns {Promise<Object>} Analysis report with issues and metrics
   */
  async analyzeTranslation(originalText, translatedText, sourceLang, targetLang) {
    try {
      await this.initialize();

      const startTime = Date.now();
      
      // Run all analyses
      const readability = this.analyzeReadability(translatedText);
      const sentences = this.analyzeSentences(translatedText);
      const words = this.analyzeWords(translatedText);
      const sentiment = this.analyzeSentiment(translatedText, targetLang);
      const language = this.detectLanguage(translatedText, targetLang);
      
      // Identify specific issues
      const issues = this.identifyIssues(readability, sentences, words, sentiment, language, targetLang);
      
      const duration = Date.now() - startTime;

      const report = {
        readability,
        sentences,
        words,
        sentiment,
        language,
        issues,
        duration,
        hasIssues: issues.length > 0
      };

      if (issues.length > 0) {
        console.log(`📊 Text Analysis: Found ${issues.length} issue(s) for LLM to address`);
      } else {
        console.log('📊 Text Analysis: No significant issues detected');
      }

      return report;
    } catch (error) {
      Logger.logError('textAnalyzer', 'Analysis failed', error, {});
      // Return minimal report on error
      return {
        readability: null,
        sentences: null,
        words: null,
        sentiment: null,
        language: null,
        issues: [],
        duration: 0,
        hasIssues: false,
        error: error.message
      };
    }
  }

  /**
   * Analyze readability using Flesch Reading Ease
   * @private
   */
  analyzeReadability(text) {
    try {
      // Calculate Flesch Reading Ease score
      // Score: 0-100 (higher = easier to read)
      // 90-100: Very easy (5th grade)
      // 60-70: Standard (8th-9th grade)
      // 0-30: Very difficult (college graduate)
      
      const sentences = this.getSentences(text);
      const words = this.getWords(text);
      const syllables = this.countTotalSyllables(text);
      
      if (sentences.length === 0 || words.length === 0) {
        return { score: null, level: 'unknown' };
      }

      const avgWordsPerSentence = words.length / sentences.length;
      const avgSyllablesPerWord = syllables / words.length;
      
      // Flesch Reading Ease formula
      const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
      
      let level;
      if (score >= 90) level = 'very_easy';
      else if (score >= 80) level = 'easy';
      else if (score >= 70) level = 'fairly_easy';
      else if (score >= 60) level = 'standard';
      else if (score >= 50) level = 'fairly_difficult';
      else if (score >= 30) level = 'difficult';
      else level = 'very_difficult';

      return {
        score: Math.max(0, Math.min(100, score)).toFixed(1),
        level,
        avgWordsPerSentence: avgWordsPerSentence.toFixed(1),
        avgSyllablesPerWord: avgSyllablesPerWord.toFixed(2)
      };
    } catch (error) {
      return { score: null, level: 'unknown', error: error.message };
    }
  }

  /**
   * Analyze sentence structure and complexity
   * @private
   */
  analyzeSentences(text) {
    try {
      const sentences = this.getSentences(text);
      const words = this.getWords(text);
      
      if (sentences.length === 0) {
        return { count: 0, avgLength: 0, longSentences: [] };
      }

      const sentenceLengths = sentences.map(s => this.getWords(s).length);
      const avgLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentences.length;
      
      // Identify long sentences (>25 words)
      const longSentences = sentences
        .map((sentence, index) => ({
          index,
          sentence,
          wordCount: this.getWords(sentence).length
        }))
        .filter(s => s.wordCount > 25)
        .map(s => ({
          text: s.sentence.substring(0, 100) + (s.sentence.length > 100 ? '...' : ''),
          wordCount: s.wordCount
        }));

      // Identify very short sentences (might indicate choppy writing)
      const shortSentences = sentences.filter(s => this.getWords(s).length < 5).length;

      return {
        count: sentences.length,
        avgLength: avgLength.toFixed(1),
        longSentences,
        shortSentences,
        complexity: avgLength > 20 ? 'high' : avgLength > 15 ? 'medium' : 'low'
      };
    } catch (error) {
      return { count: 0, avgLength: 0, longSentences: [], error: error.message };
    }
  }

  /**
   * Analyze word usage and vocabulary
   * @private
   */
  analyzeWords(text) {
    try {
      const words = this.getWords(text);
      const uniqueWords = new Set(words.map(w => w.toLowerCase()));
      
      if (words.length === 0) {
        return { total: 0, unique: 0, diversity: 0, avgLength: 0 };
      }

      const lexicalDiversity = uniqueWords.size / words.length;
      const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;

      return {
        total: words.length,
        unique: uniqueWords.size,
        diversity: lexicalDiversity.toFixed(3),
        avgLength: avgWordLength.toFixed(1),
        diversityLevel: lexicalDiversity > 0.6 ? 'high' : lexicalDiversity > 0.4 ? 'medium' : 'low'
      };
    } catch (error) {
      return { total: 0, unique: 0, diversity: 0, avgLength: 0, error: error.message };
    }
  }

  /**
   * Analyze sentiment/tone
   * @private
   */
  analyzeSentiment(text, targetLang) {
    try {
      // Sentiment analysis works best for English
      // For other languages, provide limited analysis
      if (targetLang !== 'en') {
        return { score: null, tone: 'neutral', note: 'Sentiment analysis limited for non-English' };
      }

      const words = this.getWords(text);
      const Analyzer = this.natural.SentimentAnalyzer;
      const stemmer = this.natural.PorterStemmer;
      const analyzer = new Analyzer('English', stemmer, 'afinn');
      
      const score = analyzer.getSentiment(words);
      
      let tone;
      if (score > 1) tone = 'positive';
      else if (score < -1) tone = 'negative';
      else tone = 'neutral';

      return {
        score: score.toFixed(2),
        tone
      };
    } catch (error) {
      return { score: null, tone: 'neutral', error: error.message };
    }
  }

  /**
   * Detect language and verify it matches target
   * @private
   */
  detectLanguage(text, expectedLang) {
    try {
      const LanguageDetect = this.natural.LanguageDetect;
      const detector = new LanguageDetect();
      
      const detected = detector.detect(text, 3); // Top 3 languages
      
      if (!detected || detected.length === 0) {
        return { detected: 'unknown', confidence: 0, matches: false };
      }

      const topLanguage = detected[0][0];
      const confidence = detected[0][1];
      
      // Map Natural's language codes to our codes
      const langMap = {
        'english': 'en',
        'portuguese': 'pt',
        'spanish': 'es',
        'french': 'fr',
        'german': 'de',
        'italian': 'it',
        'russian': 'ru',
        'japanese': 'ja',
        'chinese': 'zh',
        'arabic': 'ar'
      };

      const detectedCode = langMap[topLanguage.toLowerCase()] || topLanguage;
      const matches = detectedCode === expectedLang.toLowerCase();

      return {
        detected: topLanguage,
        detectedCode,
        confidence: confidence.toFixed(3),
        matches,
        alternatives: detected.slice(1).map(d => ({ lang: d[0], confidence: d[1].toFixed(3) }))
      };
    } catch (error) {
      return { detected: 'unknown', confidence: 0, matches: false, error: error.message };
    }
  }

  /**
   * Identify specific issues for LLM to fix
   * @private
   */
  identifyIssues(readability, sentences, words, sentiment, language, targetLang) {
    const issues = [];

    // Readability issues
    if (readability.score !== null) {
      if (readability.score < 30) {
        issues.push({
          type: 'readability',
          severity: 'high',
          description: 'Text is very difficult to read',
          suggestion: 'Simplify sentence structure and use simpler vocabulary'
        });
      } else if (readability.score < 50) {
        issues.push({
          type: 'readability',
          severity: 'medium',
          description: 'Text is fairly difficult to read',
          suggestion: 'Consider simplifying some complex sentences'
        });
      }
    }

    // Sentence complexity issues
    if (sentences.avgLength > 25) {
      issues.push({
        type: 'sentence_length',
        severity: 'high',
        description: `Sentences are too long (avg: ${sentences.avgLength} words)`,
        suggestion: 'Break long sentences into shorter, clearer ones',
        examples: sentences.longSentences.slice(0, 3)
      });
    } else if (sentences.avgLength > 20) {
      issues.push({
        type: 'sentence_length',
        severity: 'medium',
        description: `Sentences are somewhat long (avg: ${sentences.avgLength} words)`,
        suggestion: 'Consider breaking up some longer sentences'
      });
    }

    // Long sentence issues
    if (sentences.longSentences && sentences.longSentences.length > 0) {
      issues.push({
        type: 'long_sentences',
        severity: sentences.longSentences.length > 3 ? 'high' : 'medium',
        description: `Found ${sentences.longSentences.length} very long sentence(s) (>25 words)`,
        suggestion: 'Split these sentences for better readability',
        examples: sentences.longSentences.slice(0, 3)
      });
    }

    // Vocabulary diversity issues
    if (words.diversity < 0.4) {
      issues.push({
        type: 'vocabulary',
        severity: 'medium',
        description: `Vocabulary is repetitive (diversity: ${words.diversity})`,
        suggestion: 'Use more varied vocabulary and synonyms'
      });
    }

    // Language mismatch issues
    if (language.matches === false && language.confidence > 0.5) {
      issues.push({
        type: 'language_mismatch',
        severity: 'critical',
        description: `Text appears to be in ${language.detected} instead of target language`,
        suggestion: `Ensure the entire text is properly translated to ${targetLang}`
      });
    }

    // Choppy writing (too many short sentences)
    if (sentences.shortSentences > sentences.count * 0.3) {
      issues.push({
        type: 'choppy_writing',
        severity: 'low',
        description: 'Text has many short sentences, may sound choppy',
        suggestion: 'Combine some short sentences for better flow'
      });
    }

    return issues;
  }

  /**
   * Get sentences from text
   * @private
   */
  getSentences(text) {
    try {
      const tokenizer = new this.natural.SentenceTokenizer();
      return tokenizer.tokenize(text) || [];
    } catch {
      // Fallback: split by periods
      return text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    }
  }

  /**
   * Get words from text
   * @private
   */
  getWords(text) {
    try {
      const tokenizer = new this.natural.WordTokenizer();
      return tokenizer.tokenize(text) || [];
    } catch {
      // Fallback: split by whitespace
      return text.split(/\s+/).filter(w => w.length > 0);
    }
  }

  /**
   * Count total syllables in text (approximation)
   * @private
   */
  countTotalSyllables(text) {
    const words = this.getWords(text);
    return words.reduce((total, word) => total + this.countSyllables(word), 0);
  }

  /**
   * Count syllables in a word (approximation)
   * @private
   */
  countSyllables(word) {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;
    
    // Count vowel groups
    const vowels = word.match(/[aeiouy]+/g);
    let count = vowels ? vowels.length : 1;
    
    // Adjust for silent 'e'
    if (word.endsWith('e')) count--;
    
    // Ensure at least 1 syllable
    return Math.max(1, count);
  }

  /**
   * Generate enhanced prompt for LLM based on analysis
   * @param {Object} analysisReport - Analysis report from analyzeTranslation()
   * @returns {string} Additional prompt text for LLM
   */
  generateLLMPrompt(analysisReport) {
    if (!analysisReport || !analysisReport.hasIssues) {
      return '';
    }

    let prompt = '\n\nTEXT ANALYSIS - ISSUES TO ADDRESS:\n';
    prompt += 'The following issues were detected in the translation. Please fix them:\n\n';

    analysisReport.issues.forEach((issue, index) => {
      prompt += `${index + 1}. ${issue.description}\n`;
      prompt += `   Suggestion: ${issue.suggestion}\n`;
      
      if (issue.examples && issue.examples.length > 0) {
        prompt += `   Examples:\n`;
        issue.examples.forEach((example, i) => {
          const text = typeof example === 'string' ? example : example.text;
          prompt += `   - "${text}"\n`;
        });
      }
      prompt += '\n';
    });

    return prompt;
  }
}

// Singleton instance
const textAnalyzer = new TextAnalyzer();

export default textAnalyzer;
