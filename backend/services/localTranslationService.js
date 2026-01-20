import axios from 'axios';
import GlossaryProcessor from './glossaryProcessor.js';
import SentenceBatcher from './sentenceBatcher.js';
import libreTranslateManager from './libreTranslateManager.js';
import ollamaService from './ollamaService.js';
import textAnalyzer from './textAnalyzer.js';
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
   * @param {Object} options - Additional options (htmlMode, useLLM, etc.)
   * @returns {Promise<Object>} Translation result
   */
  async translate(text, sourceLang, targetLang, glossaryTerms = [], options = {}) {
    const startTime = Date.now();
    const shouldAbort = typeof options.abortCheck === 'function' ? options.abortCheck : null;
    const onPipelineStage = typeof options.onPipelineStage === 'function' ? options.onPipelineStage : null;

    try {
      if (shouldAbort && shouldAbort()) {
        return { aborted: true };
      }
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

      // Determine format based on options (used by LibreTranslate)
      const htmlMode = options.htmlMode || Settings.get('localTranslationHtmlMode') || false;
      const format = htmlMode ? 'html' : 'text';
      const hasHtmlTags = htmlMode && /<[^>]+>/.test(text);

      // Step 1: Apply glossary pre-processing
      let processedText = text;
      let placeholderMap = new Map();
      
      if (glossaryTerms && glossaryTerms.length > 0) {
        const preProcessResult = this.glossaryProcessor.applyPreProcessing(text, glossaryTerms, {
          htmlMode: hasHtmlTags
        });
        processedText = preProcessResult.processedText;
        placeholderMap = preProcessResult.placeholderMap;
      }

      // Step 2: Split into sentences and create batches
      // IMPORTANT: If we're translating HTML, don't sentence-split/batch across tags.
      // Send the full HTML chunk as one request to preserve formatting.
      let batches;
      let batchStats;
      let batchStrings;
      if (hasHtmlTags) {
        batches = [[processedText]];
        batchStrings = [processedText];
        batchStats = {
          totalSentences: 1,
          totalBatches: 1,
          avgSentencesPerBatch: '1.00',
          avgBatchSize: String(processedText.length)
        };
        console.log(`✓ Batch processing (HTML): 1 chunk → 1 batch`);
      } else {
        const processed = this.sentenceBatcher.processToBatches(processedText);
        batches = processed.batches;
        batchStats = processed.stats;
        batchStrings = this.sentenceBatcher.batchesToStrings(batches);
      }

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
              format: format
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
      let translatedText;
      if (hasHtmlTags) {
        translatedText = translatedBatches[0] || '';
      } else {
        const translatedSentenceBatches = this.sentenceBatcher.stringsToSentenceBatches(
          translatedBatches,
          batches
        );
        translatedText = this.sentenceBatcher.reconstructText(translatedSentenceBatches);
      }

      // Step 5: Apply glossary post-processing
      let glossaryStats = {};
      let glossaryBaselineText = translatedText;
      if (placeholderMap.size > 0) {
        const postProcessResult = this.glossaryProcessor.applyPostProcessing(
          translatedText,
          placeholderMap
        );
        translatedText = postProcessResult.finalText;
        glossaryStats = postProcessResult.stats;

        // Final cleanup: if any GTERM token survived, replace with original source term
        translatedText = this.glossaryProcessor.applyResidualTokenCleanup(
          translatedText,
          placeholderMap
        );

        // Capture a glossary-safe baseline before optional LLM processing
        glossaryBaselineText = translatedText;
      }
      
      // Enforce glossary terms as a final pass (best-effort), even if no placeholders matched
      if (Array.isArray(glossaryTerms) && glossaryTerms.length > 0) {
        translatedText = this.glossaryProcessor.enforceGlossaryTerms(
          translatedText,
          glossaryTerms
        );
      }

      // Step 5.5: Optional text analysis (1.5 layer)
      let analysisReport = null;
      const useLLM = options.useLLM || Settings.get('ollamaEnabled') || false;
      const skipLLMIfNoIssues = options.skipLLMIfNoIssues ?? Settings.get('ollamaSkipIfNoIssues') ?? false;
      const llmGenerationOptions = options.llmGenerationOptions || Settings.get('ollamaGenerationOptions') || {};
      const llmPipeline = options.llmPipeline || Settings.get('ollamaPipeline') || {};
      
      if (useLLM) {
        try {
          if (shouldAbort && shouldAbort()) {
            return { aborted: true };
          }
          console.log('📊 Analyzing translation quality...');
          const analysisStartTime = Date.now();
          
          analysisReport = await textAnalyzer.analyzeTranslation(
            text,
            translatedText,
            sourceLang,
            targetLang,
            options.formality || Settings.get('ollamaFormality') || 'neutral'
          );
          
          const analysisDuration = Date.now() - analysisStartTime;
          console.log(`✓ Text analysis completed in ${analysisDuration}ms`);
          
          if (analysisReport.hasIssues) {
            console.log(`  → Found ${analysisReport.issues.length} issue(s) for LLM to address`);
          }
        } catch (analysisError) {
          // Non-fatal: continue without analysis
          Logger.logError('localTranslation', 'Text analysis failed', analysisError, {});
          console.warn('⚠️ Text analysis error:', analysisError.message);
        }
      }

      // Step 6: Optional LLM post-processing
      let llmStats = null;
      
      if (useLLM) {
        try {
          if (shouldAbort && shouldAbort()) {
            return { aborted: true };
          }
          const ollamaRunning = await ollamaService.isRunning();
          
          if (ollamaRunning) {
            const pipelineStages = [
              {
                key: 'validation',
                role: 'validation',
                enabled: !!llmPipeline?.validation?.enabled,
                model: llmPipeline?.validation?.model || options.ollamaValidationModel || Settings.get('ollamaValidationModel') || null,
                improveStructure: false
              },
              {
                key: 'rewrite',
                role: 'rewrite',
                enabled: !!llmPipeline?.rewrite?.enabled,
                model: llmPipeline?.rewrite?.model || options.ollamaRewriteModel || Settings.get('ollamaRewriteModel') || null,
                improveStructure: true
              },
              {
                key: 'technical',
                role: 'technical',
                enabled: !!llmPipeline?.technical?.enabled,
                model: llmPipeline?.technical?.model || options.ollamaTechnicalModel || Settings.get('ollamaTechnicalModel') || null,
                improveStructure: false
              }
            ];
            const enabledStages = pipelineStages.filter(stage => stage.enabled);

            // NEW: Smart pipeline - early exit based on quality score
            const smartPipelineEnabled = options.smartPipelineEnabled !== false; // Default: true
            const qualityThreshold = options.qualityThreshold || 85;
            
            if (smartPipelineEnabled && analysisReport && analysisReport.qualityScore) {
              const score = analysisReport.qualityScore;
              console.log(`📊 Quality score: ${score}/100 (threshold: ${qualityThreshold})`);
              
              if (score >= qualityThreshold) {
                // Excellent quality - skip all LLM processing
                llmStats = { skipped: true, reason: 'quality-excellent', qualityScore: score };
                console.log(`🤖 Skipping all LLM stages (quality score ${score} >= ${qualityThreshold})`);
                // Return early, skip all LLM processing
                return {
                  translatedText,
                  translatedHtml: null,
                  batchStats,
                  llmStats,
                  analysisReport
                };
              } else if (score >= 70 && score < qualityThreshold) {
                // Good quality - run validation only
                console.log(`🤖 Good quality (${score}/100) - will run validation stage only`);
                // Filter to validation stage only
                pipelineStages.forEach((stage, idx) => {
                  if (stage.key !== 'validation') {
                    pipelineStages[idx].enabled = false;
                  }
                });
              } else {
                // Fair/poor quality - run full pipeline as configured
                console.log(`🤖 Quality needs improvement (${score}/100) - running full pipeline`);
              }
            }

            // Removed old "LLM enhancement" step - now handled by pipeline only

            // Re-filter enabled stages after smart pipeline logic
            const finalEnabledStages = pipelineStages.filter(stage => stage.enabled);
            
            if (finalEnabledStages.length > 0) {
              const stageList = finalEnabledStages.map(stage => stage.key).join(', ');
              console.log(`🤖 LLM pipeline enabled: ${stageList}`);
              Logger.logInfo('llm', 'LLM pipeline enabled', { stages: finalEnabledStages.map(stage => stage.key) });
              if (!llmStats) {
                llmStats = { stages: [] };
              }
              if (!llmStats.stages) {
                llmStats.stages = [];
              }
              if (llmStats.duration == null && llmStats.model == null) {
                Logger.logInfo('llm', 'LLM pipeline running without base enhancement', {});
              }

              for (const stage of pipelineStages) {
                if (!stage.enabled) continue;
                const stageStart = Date.now();
                if (onPipelineStage) {
                  onPipelineStage({
                    stage: stage.key,
                    status: 'start',
                    model: stage.model
                  });
                }
                Logger.logInfo('llm', 'LLM pipeline stage started', { stage: stage.key, model: stage.model });
                
                const stageResult = await ollamaService.processTranslation(translatedText, {
                  sourceLang,
                  targetLang,
                  formality: options.formality || Settings.get('ollamaFormality') || 'neutral',
                  improveStructure: stage.improveStructure,
                  verifyGlossary: options.verifyGlossary || Settings.get('ollamaGlossaryCheck') || false,
                  glossaryTerms: glossaryTerms,
                  model: stage.model,
                  analysisReport: analysisReport,
                  role: stage.role,
                  generationOptions: llmGenerationOptions
                });
                
                const stageDuration = Date.now() - stageStart;
                
                // NEW: Handle validation stage specially
                if (stage.role === 'validation' && stageResult.success && stageResult.validationResult) {
                  const validation = stageResult.validationResult;
                  
                  llmStats.stages.push({
                    stage: stage.key,
                    model: stageResult.model,
                    duration: stageDuration,
                    validationResult: validation.isOk ? 'OK' : `${validation.issues.length} issues`,
                    issues: validation.issues
                  });
                  
                  Logger.logInfo('llm', 'Validation stage completed', {
                    isOk: validation.isOk,
                    issueCount: validation.issues.length
                  });
                  
                  if (validation.isOk) {
                    // Translation is OK - skip remaining stages (rewrite, technical)
                    console.log('✓ Validation passed - skipping rewrite and technical stages');
                    for (let i = 0; i < pipelineStages.length; i++) {
                      if (pipelineStages[i].key !== 'validation') {
                        pipelineStages[i].enabled = false;
                      }
                    }
                    
                    if (onPipelineStage) {
                      onPipelineStage({
                        stage: stage.key,
                        status: 'success',
                        model: stageResult.model,
                        result: 'OK - translation approved'
                      });
                    }
                  } else {
                    // Has issues - prepare rewrite instructions
                    console.log(`⚠️ Validation found ${validation.issues.length} issue(s) - will proceed to rewrite`);
                    
                    // Store validation issues for rewrite stage
                    if (!analysisReport) {
                      analysisReport = { issues: [] };
                    }
                    analysisReport.validationIssues = validation.issues;
                    
                    if (onPipelineStage) {
                      onPipelineStage({
                        stage: stage.key,
                        status: 'success',
                        model: stageResult.model,
                        result: `Found ${validation.issues.length} issues`
                      });
                    }
                  }
                  continue; // Don't update translatedText for validation stage
                }
                
                if (stageResult.success) {
                  translatedText = stageResult.enhancedText;
                  llmStats.stages.push({
                    stage: stage.key,
                    model: stageResult.model,
                    duration: stageDuration,
                    changes: stageResult.changes
                  });
                  if (onPipelineStage) {
                    onPipelineStage({
                      stage: stage.key,
                      status: 'success',
                      model: stageResult.model
                    });
                  }
                  Logger.logInfo('llm', 'LLM pipeline stage completed', {
                    stage: stage.key,
                    model: stageResult.model,
                    duration: stageDuration
                  });
                } else {
                  llmStats.stages.push({
                    stage: stage.key,
                    model: stage.model,
                    duration: stageDuration,
                    error: stageResult.error || 'failed'
                  });
                  if (onPipelineStage) {
                    onPipelineStage({
                      stage: stage.key,
                      status: 'error',
                      model: stage.model,
                      error: stageResult.error || 'failed'
                    });
                  }
                  Logger.logInfo('llm', 'LLM pipeline stage failed', {
                    stage: stage.key,
                    model: stage.model,
                    duration: stageDuration,
                    error: stageResult.error || 'failed'
                  });
                  console.warn(`⚠️ LLM pipeline stage failed (${stage.key}):`, stageResult.error);
                }
              }
            }
          } else {
            console.warn('⚠️ LLM enhancement requested but Ollama is not running');
          }
        } catch (llmError) {
          // Non-fatal: continue with non-enhanced translation
          Logger.logError('localTranslation', 'LLM enhancement failed', llmError, {});
          console.warn('⚠️ LLM enhancement error:', llmError.message);
        }
      }

      // Safety cleanup after LLM (LLM may reintroduce or alter glossary tokens)
      if (placeholderMap.size > 0) {
        translatedText = this.glossaryProcessor.applyResidualTokenCleanup(
          translatedText,
          placeholderMap
        );
      }
      if (Array.isArray(glossaryTerms) && glossaryTerms.length > 0) {
        translatedText = this.glossaryProcessor.enforceGlossaryTerms(
          translatedText,
          glossaryTerms
        );
      }

      // Glossary enforcement already ran after LLM, so we trust the output.
      // The aggressive revert was causing valid LLM corrections to be discarded.
      // if (placeholderMap.size > 0) {
      //   const hasTargets = this.glossaryProcessor.arePlaceholderTargetsPresent(
      //     translatedText,
      //     placeholderMap
      //   );
      //   if (!hasTargets) {
      //     console.warn('⚠️ Glossary targets missing after processing. Reverting to glossary-safe translation.');
      //     translatedText = glossaryBaselineText;
      //   }
      // }

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
        analysisReport,
        llmStats,
        provider: 'local (LibreTranslate)' + (llmStats ? ' + LLM' : '')
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
      'pt': 'pt', // Brazilian Portuguese by default
      'pt-br': 'pt',
      'pt-pt': 'pt',
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

    const normalized = codeMap[langCode.toLowerCase()] || langCode.toLowerCase();
    const lower = String(langCode || '').toLowerCase();
    const note =
      lower === 'pt' || lower === 'pt-br' || lower === 'pt-pt'
        ? ' (pt default)'
        : '';
    console.log(`Language code normalized: ${langCode} → ${normalized}${note}`);
    return normalized;
  }

  /**
   * Best-effort plain text extraction from HTML.
   * Used when we store translated_html but still want a text preview.
   */
  extractTextFromHtml(html) {
    if (!html || typeof html !== 'string') return '';
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    // Decode a few common HTML entities for nicer previews
    return text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
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
