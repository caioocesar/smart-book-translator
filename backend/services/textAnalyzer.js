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
  async analyzeTranslation(originalText, translatedText, sourceLang, targetLang, formality = 'neutral') {
    try {
      await this.initialize();

      const startTime = Date.now();
      
      // Run all analyses
      const readability = this.analyzeReadability(translatedText);
      const sentences = this.analyzeSentences(translatedText);
      const words = this.analyzeWords(translatedText);
      const sentiment = this.analyzeSentiment(translatedText, targetLang);
      const language = this.detectLanguage(translatedText, targetLang);
      
      // Analyze grammar for Portuguese
      let grammarIssues = [];
      if (targetLang.toLowerCase() === 'pt' || targetLang.toLowerCase() === 'pt-br') {
        grammarIssues = this.analyzePortugueseGrammar(translatedText);
      }
      
      // NEW: Analyze formality and regional variant
      const formalityAnalysis = this.analyzeFormalityAndVariant(translatedText, targetLang, formality);
      
      // Compute quality score
      const qualityScore = this.computeQualityScore(
        readability, sentences, words, sentiment, language, grammarIssues, formalityAnalysis, targetLang
      );
      
      // Identify specific issues
      const issues = this.identifyIssues(readability, sentences, words, sentiment, language, targetLang, grammarIssues, formalityAnalysis);
      
      const duration = Date.now() - startTime;

      const report = {
        readability,
        sentences,
        words,
        sentiment,
        language,
        grammarIssues,
        formalityAnalysis,
        qualityScore,
        issues,
        duration,
        hasIssues: issues.length > 0 || grammarIssues.length > 0 || formalityAnalysis?.issues?.length > 0
      };

      const totalIssues = issues.length + grammarIssues.length + (formalityAnalysis?.issues?.length || 0);
      if (totalIssues > 0) {
        console.log(`📊 Text Analysis: Quality score ${qualityScore}/100, found ${issues.length} issue(s) + ${grammarIssues.length} grammar issue(s) + ${formalityAnalysis?.issues?.length || 0} formality/variant issue(s)`);
      } else {
        console.log(`📊 Text Analysis: Quality score ${qualityScore}/100, no significant issues detected`);
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
        grammarIssues: [],
        formalityAnalysis: { detectedFormality: 'neutral', detectedVariant: null, issues: [] },
        qualityScore: 50,  // Default middle score on error
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
   * Analyze Portuguese grammar for common errors
   * @private
   */
  analyzePortugueseGrammar(text) {
    const issues = [];
    
    try {
      // Gender/Number agreement patterns for Portuguese
      const patterns = [
        // Plural noun + singular adjective
        {
          regex: /\b(homens|mulheres|pessoas|crianças|animais|livros|dias|anos)\s+(bom|boa|grande|pequeno|pequena|novo|nova|velho|velha)\b/gi,
          type: 'PLURAL',
          description: 'Plural noun with singular adjective',
          suggestion: 'Change adjective to plural form'
        },
        // Masculine noun + feminine adjective (common cases)
        {
          regex: /\b(homem|menino|pai|filho|irmão|avô|rei|senhor)\s+(boa|pequena|nova|velha|bonita)\b/gi,
          type: 'GENDER',
          description: 'Masculine noun with feminine adjective',
          suggestion: 'Use masculine adjective form'
        },
        // Feminine noun + masculine adjective (common cases)
        {
          regex: /\b(mulher|menina|mãe|filha|irmã|avó|rainha|senhora)\s+(bom|pequeno|novo|velho|bonito)\b/gi,
          type: 'GENDER',
          description: 'Feminine noun with masculine adjective',
          suggestion: 'Use feminine adjective form'
        },
        // "Demasiado" instead of "demais" (European Portuguese vs Brazilian)
        {
          regex: /\bdemasiado\b/gi,
          type: 'WORD_ORDER',
          description: 'European Portuguese "demasiado" used',
          suggestion: 'Consider using Brazilian Portuguese "demais" or "muito"'
        }
      ];

      for (const pattern of patterns) {
        const matches = text.matchAll(pattern.regex);
        for (const match of matches) {
          issues.push({
            type: pattern.type,
            description: pattern.description,
            example: match[0],
            position: match.index,
            suggestion: pattern.suggestion
          });
        }
      }

    } catch (error) {
      console.warn('Grammar analysis error:', error);
    }

    return issues;
  }

  /**
   * Analyze formality level and regional variant
   * @private
   */
  analyzeFormalityAndVariant(text, targetLang, expectedFormality = 'neutral') {
    const issues = [];
    let detectedFormality = 'neutral';
    let detectedVariant = null;

    // Only analyze Portuguese for now
    if (targetLang.toLowerCase() !== 'pt' && targetLang.toLowerCase() !== 'pt-br') {
      return { detectedFormality, detectedVariant, issues };
    }

    // Detect regional variant (Brazilian vs European Portuguese)
    const europeanIndicators = [
      /\bdemasiado\b/gi,
      /\bpropina\b/gi,        // tip/bribe (EU: tip, BR: bribe)
      /\bcomboio\b/gi,        // train (EU), BR uses "trem"
      /\bautocarro\b/gi,      // bus (EU), BR uses "ônibus"
      /\btelemóvel\b/gi,      // mobile phone (EU), BR uses "celular"
      /\bconduzir\b/gi,       // to drive (EU), BR uses "dirigir"
      /\bsótão\b/gi,          // attic (EU), BR uses "sótão" or "ático"
      /\bpassadeira\b/gi      // crosswalk (EU), BR uses "faixa de pedestres"
    ];

    const brazilianIndicators = [
      /\bdemais\b/gi,
      /\btrem\b/gi,
      /\bônibus\b/gi,
      /\bcelular\b/gi,
      /\bdirigir\b/gi,
      /\bfaixa de pedestres\b/gi
    ];

    let europeanScore = 0;
    let brazilianScore = 0;

    europeanIndicators.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        europeanScore += matches.length;
        issues.push({
          type: 'VARIANT',
          severity: 'medium',
          description: `European Portuguese expression detected: "${matches[0]}"`,
          suggestion: 'Consider using Brazilian Portuguese equivalent'
        });
      }
    });

    brazilianIndicators.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) brazilianScore += matches.length;
    });

    // Determine variant
    if (europeanScore > brazilianScore * 2) {
      detectedVariant = 'european';
      if (targetLang.toLowerCase() === 'pt-br') {
        // Mismatch: European Portuguese when Brazilian expected
        issues.push({
          type: 'VARIANT_MISMATCH',
          severity: 'high',
          description: 'Text uses European Portuguese but Brazilian Portuguese is expected',
          suggestion: 'Convert to Brazilian Portuguese expressions and vocabulary'
        });
      }
    } else if (brazilianScore > 0) {
      detectedVariant = 'brazilian';
    }

    // Detect formality level
    const informalIndicators = [
      /\bvocê\b/gi,           // informal "you"
      /\bpra\b/gi,            // colloquial "para"
      /\bcê\b/gi,             // very informal "você"
      /\btá\b/gi,             // colloquial "está"
      /\bbeleza\b/gi,         // casual greeting
      /\bcara\b/gi,           // dude/guy
      /\bgalera\b/gi,         // folks/guys
      /\btipo\b/gi            // like (filler word)
    ];

    const formalIndicators = [
      /\bsenhor(a)?\b/gi,     // formal "you" (sir/madam)
      /\bvossa\s+excelência\b/gi,
      /\bprezado(a)?\b/gi,    // dear (formal)
      /\batenciosamente\b/gi, // sincerely
      /\bcordialmente\b/gi,   // cordially
      /\bsolicitar\b/gi,      // request (formal verb)
      /\bagradecimento\b/gi   // thanks (formal noun)
    ];

    let informalScore = 0;
    let formalScore = 0;

    informalIndicators.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) informalScore += matches.length;
    });

    formalIndicators.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) formalScore += matches.length;
    });

    // Determine formality (normalize by text length)
    const textLength = text.split(/\s+/).length;
    const informalDensity = (informalScore / textLength) * 100;
    const formalDensity = (formalScore / textLength) * 100;

    if (formalDensity > informalDensity * 2 && formalScore > 0) {
      detectedFormality = 'formal';
    } else if (informalDensity > formalDensity * 2 && informalScore > 2) {
      detectedFormality = 'informal';
    } else {
      detectedFormality = 'neutral';
    }

    // Check formality mismatch
    if (expectedFormality === 'formal' && detectedFormality === 'informal') {
      issues.push({
        type: 'FORMALITY_MISMATCH',
        severity: 'high',
        description: 'Text is too informal for expected formal context',
        suggestion: 'Use formal pronouns (senhor/senhora) and avoid colloquialisms'
      });
    } else if (expectedFormality === 'informal' && detectedFormality === 'formal') {
      issues.push({
        type: 'FORMALITY_MISMATCH',
        severity: 'medium',
        description: 'Text is too formal for expected informal context',
        suggestion: 'Use more casual language and informal pronouns (você)'
      });
    }

    return {
      detectedFormality,
      detectedVariant,
      informalScore,
      formalScore,
      europeanScore,
      brazilianScore,
      issues
    };
  }

  /**
   * Compute translation quality score (0-100)
   * @private
   */
  computeQualityScore(readability, sentences, words, sentiment, language, grammarIssues, formalityAnalysis, targetLang) {
    let score = 100;

    // Deduct for readability issues
    if (readability.score !== null) {
      if (readability.score < 30) score -= 20;
      else if (readability.score < 50) score -= 10;
      else if (readability.score < 60) score -= 5;
    }

    // Deduct for sentence complexity
    if (sentences.avgLength > 25) score -= 15;
    else if (sentences.avgLength > 20) score -= 8;
    else if (sentences.avgLength > 15) score -= 3;

    // Deduct for long sentences
    if (sentences.longSentences && sentences.longSentences.length > 0) {
      score -= Math.min(10, sentences.longSentences.length * 2);
    }

    // Deduct for choppy writing
    if (sentences.avgLength < 8 && sentences.count > 5) score -= 8;

    // Deduct for low lexical diversity
    if (words.diversity !== null) {
      if (words.diversity < 0.3) score -= 15;
      else if (words.diversity < 0.4) score -= 10;
      else if (words.diversity < 0.5) score -= 5;
    }

    // Deduct for language mismatch (critical)
    if (language && !language.matches) {
      score -= 30;
    }

    // Deduct for grammar issues (Portuguese-specific)
    if (grammarIssues && grammarIssues.length > 0) {
      const grammarPenalty = Math.min(20, grammarIssues.length * 4);
      score -= grammarPenalty;
    }

    // NEW: Deduct for formality/variant mismatches
    if (formalityAnalysis && formalityAnalysis.issues && formalityAnalysis.issues.length > 0) {
      // Moderate penalty for formality issues (they're style issues, not errors)
      const formalityPenalty = Math.min(15, formalityAnalysis.issues.length * 3);
      score -= formalityPenalty;
    }

    // Ensure score is between 0-100
    return Math.max(0, Math.min(100, Math.round(score)));
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
  identifyIssues(readability, sentences, words, sentiment, language, targetLang, grammarIssues = [], formalityAnalysis = null) {
    const issues = [];

    // Formality and variant issues (HIGHEST PRIORITY after grammar)
    if (formalityAnalysis && formalityAnalysis.issues && formalityAnalysis.issues.length > 0) {
      formalityAnalysis.issues.forEach(fIssue => {
        issues.push({
          type: fIssue.type.toLowerCase(),
          severity: fIssue.severity,
          description: fIssue.description,
          suggestion: fIssue.suggestion
        });
      });
    }

    // Grammar issues (Portuguese-specific) - HIGHEST PRIORITY
    if (grammarIssues && grammarIssues.length > 0) {
      const genderIssues = grammarIssues.filter(g => g.type === 'GENDER');
      const pluralIssues = grammarIssues.filter(g => g.type === 'PLURAL');
      const wordOrderIssues = grammarIssues.filter(g => g.type === 'WORD_ORDER');

      if (genderIssues.length > 0) {
        issues.push({
          type: 'grammar_gender',
          severity: 'high',
          description: `Found ${genderIssues.length} gender agreement error(s)`,
          suggestion: 'Fix masculine/feminine adjective agreement',
          examples: genderIssues.slice(0, 3).map(g => g.example)
        });
      }

      if (pluralIssues.length > 0) {
        issues.push({
          type: 'grammar_plural',
          severity: 'high',
          description: `Found ${pluralIssues.length} plural agreement error(s)`,
          suggestion: 'Fix singular/plural adjective agreement',
          examples: pluralIssues.slice(0, 3).map(g => g.example)
        });
      }

      if (wordOrderIssues.length > 0) {
        issues.push({
          type: 'grammar_word_choice',
          severity: 'medium',
          description: `Found ${wordOrderIssues.length} word choice issue(s)`,
          suggestion: 'Use more natural Brazilian Portuguese expressions',
          examples: wordOrderIssues.slice(0, 3).map(g => g.example)
        });
      }
    }

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
