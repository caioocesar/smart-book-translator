import axios from 'axios';
import GlossaryProcessor from './glossaryProcessor.js';
import SentenceBatcher from './sentenceBatcher.js';
import libreTranslateManager from './libreTranslateManager.js';
import Logger from '../utils/logger.js';
import { LocalTranslationError } from '../utils/errors.js';
import Settings from '../models/Settings.js';
import { ApiUsage } from '../models/TranslationJob.js';

/**
 * Local Translation Service
 * 
 * Handles translation using LibreTranslate (local/self-hosted)
 * - Integrates with LibreTranslateManager for health checks
 * - Uses GlossaryProcessor for term consistency
 * - Uses SentenceBatcher for optimization
 * - Tracks performance metrics
 */

class LocalTranslationService {
  constructor(url = null, options = {}) {
    const configuredUrl =
      url ||
      (typeof options.url === 'string' ? options.url : null) ||
      process.env.LIBRETRANSLATE_URL ||
      Settings.get('localTranslationUrl') ||
      'http://localhost:5001';

    this.url = configuredUrl;
    const configuredTimeout = options.timeout ?? Settings.get('localTranslationTimeout') ?? 30000;
    const configuredSentenceBatchSize = options.sentenceBatchSize ?? Settings.get('localTranslationSentenceBatchSize') ?? 1000;

    this.options = {
      ...options,
      timeout: Number(configuredTimeout) || 30000,
      sentenceBatchSize: Number(configuredSentenceBatchSize) || 1000
    };
    
    this.glossaryProcessor = new GlossaryProcessor();
    this.sentenceBatcher = new SentenceBatcher(this.options.sentenceBatchSize);
    
    this.stats = {
      translationsCount: 0,
      totalCharacters: 0,
      totalTime: 0,
      successRate: 100,
      errors: 0
    };
  }

  /**
   * Check if LibreTranslate is available
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    const health = await libreTranslateManager.healthCheck(this.url);
    return health.running;
  }

  /**
   * Translate text using LibreTranslate
   * @param {string} text - Text to translate
   * @param {string} sourceLang - Source language code
   * @param {string} targetLang - Target language code
   * @param {Array} glossaryTerms - Optional glossary terms
   * @returns {Promise<Object>} Translation result
   */
  async translate(text, sourceLang, targetLang, glossaryTerms = []) {
    const startTime = Date.now();

    try {
      // Check if LibreTranslate is running
      const available = await this.isAvailable();
      if (!available) {
        throw new LocalTranslationError(
          'LibreTranslate is not running. Please start it first.',
          {
            url: this.url,
            suggestion: 'Click "Start Local Translation" or run: docker run -p 5001:5000 libretranslate/libretranslate'
          }
        );
      }

      // Step 1: Apply glossary pre-processing
      let processedText = text;
      let placeholderMap = new Map();
      
      if (glossaryTerms && glossaryTerms.length > 0) {
        const preProcessResult = this.glossaryProcessor.applyPreProcessing(text, glossaryTerms);
        processedText = preProcessResult.processedText;
        placeholderMap = preProcessResult.placeholderMap;
      }

      // Step 2: Split into sentences and create batches
      const { batches, stats: batchStats } = this.sentenceBatcher.processToBatches(processedText);
      const batchStrings = this.sentenceBatcher.batchesToStrings(batches);

      console.log(`📦 Processing ${batchStats.totalSentences} sentences in ${batchStats.totalBatches} batches`);

      // Step 3: Translate each batch
      const translatedBatches = [];
      
      for (let i = 0; i < batchStrings.length; i++) {
        const batchText = batchStrings[i];
        
        try {
          const response = await axios.post(
            `${this.url}/translate`,
            {
              q: batchText,
              source: this.normalizeLanguageCode(sourceLang),
              target: this.normalizeLanguageCode(targetLang),
              format: 'text'
            },
            {
              timeout: this.options.timeout,
              headers: {
                'Content-Type': 'application/json'
              }
            }
          );

          translatedBatches.push(response.data.translatedText);
          console.log(`✓ Batch ${i + 1}/${batchStrings.length} translated`);
        } catch (error) {
          this.stats.errors++;
          Logger.logError('localTranslation', `Batch ${i + 1} failed`, error, {
            batchIndex: i,
            batchLength: batchText.length
          });
          
          throw new LocalTranslationError(
            `Translation batch ${i + 1} failed: ${error.message}`,
            {
              batchIndex: i,
              totalBatches: batchStrings.length,
              error: error.message
            }
          );
        }
      }

      // Step 4: Reconstruct text from translated batches
      const translatedSentenceBatches = this.sentenceBatcher.stringsToSentenceBatches(
        translatedBatches,
        batches
      );
      let translatedText = this.sentenceBatcher.reconstructText(translatedSentenceBatches);

      // Step 5: Apply glossary post-processing
      let glossaryStats = {};
      if (placeholderMap.size > 0) {
        const postProcessResult = this.glossaryProcessor.applyPostProcessing(
          translatedText,
          placeholderMap
        );
        translatedText = postProcessResult.finalText;
        glossaryStats = postProcessResult.stats;
      }

      // Update stats
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      this.stats.translationsCount++;
      this.stats.totalCharacters += text.length;
      this.stats.totalTime += duration;
      this.stats.successRate = ((this.stats.translationsCount - this.stats.errors) / this.stats.translationsCount * 100).toFixed(2);

      console.log(`✓ Translation completed in ${duration}ms`);

      // Track usage (local provider)
      // - charactersUsed: original text length
      // - requestsCount: number of LibreTranslate /translate calls (batches)
      try {
        ApiUsage.track('local', text.length, batchStrings.length || 1);
      } catch (e) {
        // Non-fatal: stats are best-effort
      }

      return {
        translatedText,
        sourceLang,
        targetLang,
        charactersUsed: text.length,
        duration,
        glossaryStats,
        batchStats,
        provider: 'local (LibreTranslate)'
      };

    } catch (error) {
      this.stats.errors++;
      
      if (error instanceof LocalTranslationError) {
        throw error;
      }
      
      Logger.logError('localTranslation', 'Translation failed', error, {
        sourceLang,
        targetLang,
        textLength: text.length
      });

      throw new LocalTranslationError(
        `Local translation failed: ${error.message}`,
        {
          sourceLang,
          targetLang,
          textLength: text.length,
          error: error.message
        }
      );
    }
  }

  /**
   * Normalize language codes for LibreTranslate
   * @param {string} langCode - Language code
   * @returns {string} Normalized code
   */
  normalizeLanguageCode(langCode) {
    const codeMap = {
      'en': 'en',
      'pt': 'pt',
      'pt-br': 'pt',
      'es': 'es',
      'fr': 'fr',
      'de': 'de',
      'it': 'it',
      'ru': 'ru',
      'ja': 'ja',
      'zh': 'zh',
      'ar': 'ar',
      'nl': 'nl',
      'pl': 'pl',
      'tr': 'tr',
      'ko': 'ko'
    };

    return codeMap[langCode.toLowerCase()] || langCode.toLowerCase();
  }

  /**
   * Get performance statistics
   * @returns {Object} Stats object
   */
  getStats() {
    return {
      ...this.stats,
      avgDuration: this.stats.translationsCount > 0
        ? (this.stats.totalTime / this.stats.translationsCount).toFixed(0)
        : 0,
      avgCharactersPerSecond: this.stats.totalTime > 0
        ? ((this.stats.totalCharacters / this.stats.totalTime) * 1000).toFixed(0)
        : 0
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      translationsCount: 0,
      totalCharacters: 0,
      totalTime: 0,
      successRate: 100,
      errors: 0
    };
  }
}

export default LocalTranslationService;
