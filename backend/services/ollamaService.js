import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import Logger from '../utils/logger.js';
import Settings from '../models/Settings.js';
import validationParser from '../utils/validationParser.js';

const execAsync = promisify(exec);

/**
 * Ollama Service
 * 
 * Manages Ollama LLM integration for translation post-processing:
 * - Installation detection and setup
 * - Model management
 * - Translation enhancement (formality, structure, glossary)
 * - System info and performance estimates
 */

class OllamaService {
  constructor() {
    this.baseUrl = 'http://localhost:11434';
    this.recommendedModel = 'llama3.2:3b'; // Small, fast, good quality (~2GB)
    this.status = 'unknown';
    this.installedModels = [];
    this.systemInfo = null;
    // Used for CPU usage sampling between requests
    this._lastCpuSample = null;
  }

  /**
   * Check if Ollama is installed
   * @returns {Promise<boolean>}
   */
  async isInstalled() {
    try {
      if (os.platform() === 'win32') {
        // Check if ollama.exe exists in PATH or common locations
        try {
          const { stdout } = await execAsync('where ollama 2>nul');
          if (stdout && stdout.trim().length > 0) {
            return true;
          }
        } catch {
          // Continue to check common paths
        }
        
        // Check common installation paths
        const commonPaths = [
          'C:\\Program Files\\Ollama\\ollama.exe',
          'C:\\Program Files (x86)\\Ollama\\ollama.exe',
          `${process.env.LOCALAPPDATA}\\Programs\\Ollama\\ollama.exe`,
          `${process.env.USERPROFILE}\\AppData\\Local\\Programs\\Ollama\\ollama.exe`
        ];
        
        const fs = await import('fs');
        for (const path of commonPaths) {
          try {
            if (fs.existsSync(path)) {
              return true;
            }
          } catch {}
        }
        return false;
      } else {
        // Linux/Mac
        try {
          await execAsync('which ollama');
          return true;
        } catch {
          return false;
        }
      }
    } catch (error) {
      Logger.logError('ollama', 'Failed to check installation', error, {});
      return false;
    }
  }

  /**
   * Check if Ollama service is running
   * @returns {Promise<boolean>}
   */
  async isRunning() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: 3000
      });
      this.status = 'running';
      return response.status === 200;
    } catch (error) {
      this.status = error.code === 'ECONNREFUSED' ? 'stopped' : 'error';
      return false;
    }
  }

  /**
   * Get Ollama version
   * @returns {Promise<string|null>}
   */
  async getVersion() {
    try {
      const { stdout } = await execAsync('ollama --version');
      return stdout.trim();
    } catch (error) {
      return null;
    }
  }

  /**
   * Start Ollama service
   * @returns {Promise<Object>}
   */
  async start() {
    try {
      const installed = await this.isInstalled();
      if (!installed) {
        return {
          success: false,
          message: 'Ollama is not installed. Please install it first.'
        };
      }

      // Check if already running
      const running = await this.isRunning();
      if (running) {
        return {
          success: true,
          message: 'Ollama is already running'
        };
      }

      // Try to start with retries (3 attempts)
      const maxRetries = 3;
      let lastError = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Start Ollama service
          if (os.platform() === 'win32') {
            // Windows: Use execAsync for better error handling
            try {
              await execAsync('ollama serve', { timeout: 5000 });
            } catch (execError) {
              // If execAsync fails, try background start
              await new Promise((resolve, reject) => {
                exec('start /B ollama serve', (error) => {
                  if (error) {
                    reject(error);
                  } else {
                    resolve();
                  }
                });
              });
            }
          } else {
            // Linux/Mac: Start as background process
            await new Promise((resolve, reject) => {
              exec('nohup ollama serve > /dev/null 2>&1 &', (error) => {
                if (error) {
                  reject(error);
                } else {
                  resolve();
                }
              });
            });
          }

          // Wait for service to start (longer wait on first attempt)
          const waitTime = attempt === 1 ? 5000 : 3000;
          await new Promise(resolve => setTimeout(resolve, waitTime));

          // Verify service actually started by polling API
          let verified = false;
          for (let i = 0; i < 6; i++) {
            const isRunning = await this.isRunning();
            if (isRunning) {
              verified = true;
              break;
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

          if (verified) {
            this.status = 'running';
            return {
              success: true,
              message: 'Ollama service started successfully'
            };
          } else {
            lastError = new Error('Service started but API not responding');
          }
        } catch (error) {
          lastError = error;
          Logger.logError('ollama', `Start attempt ${attempt} failed`, error, {});
          
          // Wait before retry (exponential backoff)
          if (attempt < maxRetries) {
            const delay = attempt * 2000; // 2s, 4s
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      // All retries failed
      return {
        success: false,
        message: `Failed to start Ollama service after ${maxRetries} attempts. ${lastError?.message || 'Please start it manually with: ollama serve'}`
      };
    } catch (error) {
      Logger.logError('ollama', 'Failed to start service', error, {});
      return {
        success: false,
        message: `Failed to start Ollama: ${error.message}`
      };
    }
  }

  /**
   * Get list of installed models
   * @returns {Promise<Array>}
   */
  async getModels() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: 5000
      });
      
      this.installedModels = response.data.models || [];
      return this.installedModels;
    } catch (error) {
      Logger.logError('ollama', 'Failed to get models', error, {});
      return [];
    }
  }

  /**
   * Delete/uninstall a model
   * @param {string} modelName
   * @returns {Promise<Object>}
   */
  async deleteModel(modelName) {
    try {
      if (!modelName) {
        return { success: false, message: 'Model name is required' };
      }
      try {
        const response = await axios.post(
          `${this.baseUrl}/api/delete`,
          { name: modelName },
          { timeout: 30000 }
        );
        return {
          success: true,
          message: response.data?.status || `Model ${modelName} deleted`
        };
      } catch (postError) {
        const status = postError?.response?.status;
        if (status === 405) {
          const response = await axios.delete(
            `${this.baseUrl}/api/delete`,
            { data: { name: modelName }, timeout: 30000 }
          );
          return {
            success: true,
            message: response.data?.status || `Model ${modelName} deleted`
          };
        }
        throw postError;
      }
    } catch (error) {
      Logger.logError('ollama', 'Failed to delete model', error, { modelName });
      return {
        success: false,
        message: error?.response?.data?.error || error.message
      };
    }
  }

  /**
   * Check if a specific model is installed
   * @param {string} modelName - Model name (e.g., 'llama3.2:3b')
   * @returns {Promise<boolean>}
   */
  async isModelInstalled(modelName) {
    const models = await this.getModels();
    return models.some(m => m.name === modelName);
  }

  /**
   * Download/pull a model
   * @param {string} modelName - Model name to download
   * @param {Function} progressCallback - Optional callback for progress updates
   * @returns {Promise<Object>}
   */
  async downloadModel(modelName, progressCallback = null) {
    try {
      Logger.logInfo('ollama', `Starting download of model: ${modelName}`, {});

      // Use streaming to get progress updates
      const response = await axios.post(
        `${this.baseUrl}/api/pull`,
        { name: modelName },
        {
          timeout: 600000, // 10 minutes for large models
          responseType: 'stream'
        }
      );

      return new Promise((resolve, reject) => {
        let lastProgress = '';

        response.data.on('data', (chunk) => {
          try {
            const lines = chunk.toString().split('\n').filter(line => line.trim());
            for (const line of lines) {
              const data = JSON.parse(line);
              
              if (progressCallback && data.status) {
                progressCallback({
                  status: data.status,
                  completed: data.completed,
                  total: data.total,
                  percent: data.total ? Math.round((data.completed / data.total) * 100) : 0
                });
              }

              if (data.status) {
                lastProgress = data.status;
              }
            }
          } catch (parseError) {
            // Ignore JSON parse errors for partial chunks
          }
        });

        response.data.on('end', () => {
          Logger.logInfo('ollama', `Model download completed: ${modelName}`, {});
          resolve({
            success: true,
            message: `Model ${modelName} downloaded successfully`,
            status: lastProgress
          });
        });

        response.data.on('error', (error) => {
          Logger.logError('ollama', `Model download failed: ${modelName}`, error, {});
          reject(error);
        });
      });
    } catch (error) {
      Logger.logError('ollama', 'Failed to download model', error, { modelName });
      return {
        success: false,
        message: `Failed to download model: ${error.message}`
      };
    }
  }

  /**
   * Process text with LLM for translation enhancement
   * @param {string} translatedText - The translated text to enhance
   * @param {Object} options - Processing options
   * @returns {Promise<Object>}
   */
  async processTranslation(translatedText, options = {}) {
    const {
      sourceLang = 'en',
      targetLang = 'pt',
      formality = 'neutral', // 'informal', 'neutral', 'formal'
      improveStructure = true,
      verifyGlossary = false,
      glossaryTerms = [],
      model = null,
      analysisReport = null, // NEW: Text analysis report from textAnalyzer
      role = 'enhance',
      generationOptions = {}
    } = options;

    try {
      const startTime = Date.now();

      // Get configured model or use recommended
      const modelToUse = model || Settings.get('ollamaModel') || this.recommendedModel;

      // Check if model is installed
      const modelInstalled = await this.isModelInstalled(modelToUse);
      if (!modelInstalled) {
        return {
          success: false,
          error: `Model ${modelToUse} is not installed. Please download it first.`
        };
      }

      // Detect HTML content and text length EARLY (needed for prompt building)
      const hasHtmlTags = /<[^>]+>/.test(translatedText);
      const textLength = translatedText.length;

      // Build the prompt based on options
      const prompt = this.buildEnhancementPrompt(
        translatedText,
        sourceLang,
        targetLang,
        formality,
        improveStructure,
        verifyGlossary,
        glossaryTerms,
        { outputJson: true, analysisReport, role, hasHtmlTags, textLength }
      );

      // NEW: Model-specific settings based on role
      const getModelSpecificSettings = (role) => {
        if (role === 'validation') {
          return {
            num_ctx: 4096,
            max_tokens: 200,  // Short responses only
            temperature: 0.1,
            timeout: 60000    // 60 seconds
          };
        } else if (role === 'rewrite') {
          return {
            num_ctx: 8192,
            max_tokens: 4096,  // Increased for large chunks
            temperature: 0.1,  // Will be adjusted based on issue types
            timeout: 120000    // 120 seconds (increased for longer generation)
          };
        } else if (role === 'technical') {
          return {
            num_ctx: 8192,
            max_tokens: 4096,  // Increased for large chunks
            temperature: 0.2,
            timeout: 120000    // 120 seconds
          };
        } else {
          // Default/enhance role
          return {
            num_ctx: generationOptions.num_ctx || 4096,
            max_tokens: generationOptions.max_tokens || 1600,
            temperature: generationOptions.temperature ?? 0.3,
            timeout: 90000
          };
        }
      };

      const modelSettings = getModelSpecificSettings(role);

      // Warn if using llama3.2:3b for HTML or large chunks
      if (role === 'rewrite' && modelToUse.includes('llama3.2:3b')) {
        if (hasHtmlTags && textLength > 2000) {
          console.warn('⚠️ WARNING: llama3.2:3b may fail with HTML content >2000 chars. Consider using llama3.1:8b');
          Logger.logWarn('ollama', 'Small model used for HTML rewriting', {
            model: modelToUse,
            textLength,
            hasHtml: true,
            recommendation: 'Use llama3.1:8b for better results'
          });
        }
      }

      const buildOllamaOptions = (overrides = {}) => {
        const baseOptions = {
          temperature: overrides.temperature ?? modelSettings.temperature,
          top_p: generationOptions.top_p ?? 0.9,
          num_ctx: overrides.num_ctx || modelSettings.num_ctx,
          num_batch: generationOptions.num_batch,
          num_thread: generationOptions.num_thread,
          num_gpu: generationOptions.num_gpu,
          ...overrides
        };
        
        // CRITICAL FIX: More aggressive parameters for HTML content rewriting
        if (role === 'rewrite' && hasHtmlTags) {
          baseOptions.temperature = 0.4;        // Increase from 0.3 for better completion
          baseOptions.top_p = 0.98;             // Increase from 0.95 for broader sampling
          baseOptions.repeat_penalty = 1.2;     // Increase from 1.15 for stronger anti-repetition
          baseOptions.repeat_last_n = 512;      // Consider more context for repetition detection
          baseOptions.num_predict = Math.max(   // Force longer generation
            modelSettings.max_tokens || 4096,
            Math.ceil(textLength * 1.5)         // Increase from 1.2 to 1.5 for safety margin
          );
          baseOptions.stop = [];                // Remove stop sequences that might trigger on HTML
          baseOptions.tfs_z = 1.0;              // Tail free sampling
          baseOptions.typical_p = 1.0;          // Typical probability mass
          baseOptions.mirostat = 2;             // Mirostat sampling mode 2
          baseOptions.mirostat_tau = 5.0;       // Target perplexity
          baseOptions.mirostat_eta = 0.1;       // Learning rate
          
          console.log(`🔧 HTML-optimized parameters: temp=${baseOptions.temperature}, repeat_penalty=${baseOptions.repeat_penalty}, num_predict=${baseOptions.num_predict}`);
        }
        
        return baseOptions;
      };

      const callOllama = async (promptText, overrideOptions = {}, useStructuredOutput = true) => {
        const body = {
          model: modelToUse,
          prompt: promptText,
          stream: false,
          options: {
            ...buildOllamaOptions(overrideOptions),
            num_predict: overrideOptions.max_tokens || modelSettings.max_tokens // Set max tokens
          }
        };

        // For validation role, don't use structured output (need raw response)
        if (role === 'validation') {
          useStructuredOutput = false;
        }

        // Structured output helps ensure we only get the text (no commentary).
        // If the server/model doesn't support it, we'll fall back to plain text.
        if (useStructuredOutput) {
          body.format = {
            type: 'object',
            properties: {
              text: { type: 'string' }
            },
            required: ['text']
          };
        }

        try {
          const timeout = modelSettings.timeout || 120000;
          const response = await axios.post(`${this.baseUrl}/api/generate`, body, { timeout });
          const raw = (response.data?.response ?? '').trim();

          if (useStructuredOutput) {
            try {
              const parsed = JSON.parse(raw);
              if (parsed && typeof parsed.text === 'string') return parsed.text.trim();
            } catch {
              // Fall back to raw if parsing fails
            }
          }
          return raw;
        } catch (err) {
          // If structured output isn't supported, retry once without `format`
          const msg = err?.response?.data?.error || err?.message || '';
          const shouldFallback =
            useStructuredOutput &&
            (String(msg).toLowerCase().includes('format') ||
              err?.response?.status === 400);
          if (shouldFallback) {
            const timeout = modelSettings.timeout || 120000;
            const response = await axios.post(
              `${this.baseUrl}/api/generate`,
              { ...body, format: undefined },
              { timeout }
            );
            return (response.data?.response ?? '').trim();
          }
          throw err;
        }
      };

      // Attempt 1 (normal)
      let enhancedText = await callOllama(prompt, {}, true);
      
      // NEW: Special handling for validation role
      if (role === 'validation') {
        const parsed = validationParser.parseValidationResponse(enhancedText);
        
        Logger.logInfo('ollama', 'Validation response parsed', {
          isOk: parsed.isOk,
          issueCount: parsed.issues.length,
          rawResponse: parsed.rawResponse.substring(0, 200)
        });

        return {
          success: true,
          validationResult: parsed,
          enhancedText: enhancedText, // Keep raw response
          originalText: translatedText,
          model: modelToUse,
          duration: Date.now() - startTime,
          role: 'validation'
        };
      }

      enhancedText = this.sanitizeEnhancedText(enhancedText, targetLang);
      enhancedText = this.sanitizeEnhancedText(enhancedText, targetLang); // run twice to catch multi-line prefixes

      const invalidReason = this.getInvalidEnhancementReason(enhancedText, translatedText, role);
      const invalid = Boolean(invalidReason);

      // Validate language/quality and retry once if needed.
      const isEnglishLeak = this.detectEnglishLeakage(enhancedText, targetLang);
      if (isEnglishLeak || invalid) {
        const strictPrompt = this.buildEnhancementPrompt(
          translatedText,
          sourceLang,
          targetLang,
          formality,
          improveStructure,
          verifyGlossary,
          glossaryTerms,
          { strictLanguage: true, outputJson: true, analysisReport, role }
        );
        enhancedText = await callOllama(strictPrompt, { temperature: 0.0, top_p: 0.1 }, true);
        enhancedText = this.sanitizeEnhancedText(enhancedText, targetLang);
        enhancedText = this.sanitizeEnhancedText(enhancedText, targetLang);
      }

      // If still invalid after retry, check if we should try continuation or fail
      const finalInvalidReason = this.getInvalidEnhancementReason(enhancedText, translatedText, role);
      if (finalInvalidReason) {
        // Special case: llama3.2:3b with HTML - try one more time with simplified prompt
        if (role === 'rewrite' && modelToUse.includes('llama3.2:3b') && hasHtmlTags && !extra?.simplifiedRetry) {
          console.warn('⚠️ llama3.2:3b failed with HTML. Trying simplified prompt...');
          Logger.logWarn('ollama', 'Attempting simplified retry for small model', {
            model: modelToUse,
            originalReason: finalInvalidReason
          });
          
          // Build ultra-simple prompt for small models
          const simplifiedPrompt = `Fix these specific issues in the Brazilian Portuguese text below. Return the COMPLETE corrected text with ALL HTML tags preserved.\n\nIssues to fix:\n${extra?.analysisReport?.validationIssues?.map((issue, i) => `${i+1}. ${issue.description}`).join('\n') || 'Fix grammar and phrasing'}\n\nText:\n${translatedText}\n\nReturn complete text:`;
          
          try {
            const simplifiedResult = await callOllama(simplifiedPrompt, { 
              temperature: 0.3, 
              top_p: 0.95,
              repeat_penalty: 1.2
            }, false);
            
            const sanitized = this.sanitizeEnhancedText(simplifiedResult, targetLang);
            const simplifiedInvalidReason = this.getInvalidEnhancementReason(sanitized, translatedText, role);
            
            if (!simplifiedInvalidReason) {
              console.log('✓ Simplified retry succeeded');
              enhancedText = sanitized;
            } else {
              console.warn('⚠️ Simplified retry also failed:', simplifiedInvalidReason);
              throw new Error('Simplified retry failed');
            }
          } catch (retryError) {
            console.error('⚠️ Could not recover with simplified retry');
            // Fall through to rejection below
          }
        }
        
        // Final check after potential retry
        const veryFinalInvalidReason = this.getInvalidEnhancementReason(enhancedText, translatedText, role);
        if (veryFinalInvalidReason) {
          Logger.logInfo('ollama', 'LLM enhancement rejected', {
            reason: veryFinalInvalidReason,
            role: role,
            model: modelToUse,
            preview: enhancedText.slice(0, 240),
            originalLength: translatedText.length,
            enhancedLength: enhancedText.length,
            fullOutput: enhancedText.length < 500 ? enhancedText : enhancedText.slice(0, 500) + '...',
            recommendation: modelToUse.includes('llama3.2:3b') && hasHtmlTags ? 'Use llama3.1:8b for HTML content' : null
          });
          return {
            success: false,
            error: `LLM output rejected: ${veryFinalInvalidReason}`,
            originalText: translatedText,
            recommendation: modelToUse.includes('llama3.2:3b') && hasHtmlTags ? 'Switch to llama3.1:8b for better HTML handling' : null
          };
        }
      }

      // Enforce glossary after LLM (prevents the LLM from undoing glossary work).
      if (Array.isArray(glossaryTerms) && glossaryTerms.length > 0) {
        enhancedText = this.enforceGlossaryTerms(enhancedText, glossaryTerms);
      }

      // Apply pt-BR grammar fixes (agreement, prepositions, pronouns)
      if (targetLang === 'pt') {
        enhancedText = this.applyBrazilianPortugueseFixes(enhancedText);
      }

      // NEW: Check for incomplete output and attempt continuation
      if (role !== 'validation') { // Skip for validation (should be short)
        const isIncomplete = this.isOutputIncomplete(enhancedText);
        if (isIncomplete) {
          console.log('⚠️ Detected incomplete output, attempting continuation...');
          try {
            const continuationPrompt = this.buildContinuationPrompt(enhancedText, targetLang);
            const continuation = await callOllama(continuationPrompt, { temperature: 0.2, max_tokens: 800 }, false);
            const sanitizedContinuation = this.sanitizeEnhancedText(continuation, targetLang);
            
            // Merge responses intelligently
            enhancedText = this.mergeContinuation(enhancedText, sanitizedContinuation);
            console.log('✓ Successfully continued incomplete output');
            
            Logger.logInfo('ollama', 'Output continuation successful', {
              originalLength: translatedText.length,
              firstPartLength: enhancedText.length,
              continuationLength: sanitizedContinuation.length,
              finalLength: enhancedText.length
            });
          } catch (contError) {
            console.warn('⚠️ Continuation failed, using incomplete output:', contError.message);
          }
        }
      }

      const duration = Date.now() - startTime;

      Logger.logInfo('ollama', 'Translation enhanced successfully', {
        model: modelToUse,
        duration,
        originalLength: translatedText.length,
        enhancedLength: enhancedText.length
      });

      return {
        success: true,
        enhancedText,
        originalText: translatedText,
        model: modelToUse,
        duration,
        changes: this.detectChanges(translatedText, enhancedText)
      };
    } catch (error) {
      Logger.logError('ollama', 'Failed to process translation', error, {});
      return {
        success: false,
        error: error.message,
        originalText: translatedText
      };
    }
  }

  /**
   * Check if output appears incomplete
   * @private
   */
  isOutputIncomplete(text) {
    if (!text || typeof text !== 'string' || text.length < 50) {
      return false;
    }

    // NEW: For HTML content, also check if we're mid-tag
    if (/<[^>]+$/.test(text.trim())) {
      return true;  // Incomplete HTML tag at end
    }

    // Check if ends mid-sentence (no final punctuation)
    const lastChar = text.trim().slice(-1);
    const hasProperEnding = ['.', '!', '?', ':', '"', "'", '"', '>'].includes(lastChar);  // Added '>' for HTML tags
    
    if (!hasProperEnding) {
      return true;
    }

    // Check if last sentence appears cut off
    const lastSentence = text.split(/[.!?]+/).pop().trim();
    if (lastSentence.length > 0) {
      // If last "sentence" has more than 15 words and no punctuation, likely cut off
      const wordCount = lastSentence.split(/\s+/).length;
      if (wordCount > 15) {
        return true;
      }
    }

    return false;
  }

  /**
   * Build continuation prompt
   * @private
   */
  buildContinuationPrompt(partialText, targetLang) {
    const lastChars = partialText.slice(-200);
    
    return `You are continuing a translation that was cut off. The text ended with:
"...${lastChars}"

Continue EXACTLY where the text stopped. Do NOT repeat any previous text. Just continue naturally and complete the translation. Write in ${targetLang}.`;
  }

  /**
   * Merge original text with continuation
   * @private
   */
  mergeContinuation(original, continuation) {
    if (!continuation || continuation.length === 0) {
      return original;
    }

    // Remove any duplicate text at the start of continuation
    const lastWords = original.trim().split(/\s+/).slice(-10).join(' ');
    let merged = original;

    // Check if continuation starts with duplicate words
    if (continuation.toLowerCase().includes(lastWords.toLowerCase())) {
      const overlapIndex = continuation.toLowerCase().indexOf(lastWords.toLowerCase());
      if (overlapIndex < 100) { // Only if overlap is near the start
        merged = original + ' ' + continuation.substring(overlapIndex + lastWords.length).trim();
      } else {
        merged = original + ' ' + continuation;
      }
    } else {
      // No overlap detected, just append
      merged = original + ' ' + continuation;
    }

    return merged.trim();
  }

  /**
   * Build enhancement prompt based on options
   * @private
   */
  buildEnhancementPrompt(text, sourceLang, targetLang, formality, improveStructure, verifyGlossary, glossaryTerms, extra = {}) {
    // Get HTML detection and text length from extra (passed from caller)
    const hasHtmlTags = extra.hasHtmlTags ?? /<[^>]+>/.test(text);
    const textLength = extra.textLength ?? text.length;
    
    // Map language codes to full names for better LLM understanding
    const languageNames = {
      'en': 'English',
      'pt': 'Brazilian Portuguese',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'ru': 'Russian',
      'ja': 'Japanese',
      'zh': 'Chinese',
      'ar': 'Arabic'
    };
    
    const sourceLanguageName = languageNames[sourceLang] || sourceLang;
    const targetLanguageName = languageNames[targetLang] || targetLang;
    const targetLower = String(targetLang || '').toLowerCase();
    
    const role = extra?.role || 'rewrite';
    
    // Role-specific system prompts (optimized for each model's purpose)
    let prompt = '';
    
    if (role === 'validation') {
      prompt = `You are a translation quality validator. Your task is to quickly identify issues in an already-translated text.\n\n`;
      prompt += `CONTEXT:\n`;
      prompt += `- Text was translated from ${sourceLanguageName} to ${targetLanguageName} by LibreTranslate\n`;
      prompt += `- You only need to DETECT issues, not fix them (rewrite happens in next stage)\n`;
      prompt += `- Be concise: report maximum 5 most critical issues\n\n`;
    } else if (role === 'rewrite') {
      prompt = `You are a professional translation editor. Your task is to fix specific issues in an already-translated text.\n\n`;
      prompt += `CONTEXT:\n`;
      prompt += `- Text was translated from ${sourceLanguageName} to ${targetLanguageName} by LibreTranslate\n`;
      prompt += `- Validation found specific issues (listed below)\n`;
      prompt += `- Fix ONLY the issues mentioned - don't over-edit\n`;
      prompt += `- CRITICAL: Output must be entirely in ${targetLanguageName}\n\n`;
    } else if (role === 'technical') {
      prompt = `You are a technical translation reviewer. Your task is to verify accuracy and consistency.\n\n`;
      prompt += `CONTEXT:\n`;
      prompt += `- Text was translated and corrected, now needs final technical check\n`;
      prompt += `- Focus on: terminology, numbers, formatting, proper nouns\n`;
      prompt += `- CRITICAL: Output must be entirely in ${targetLanguageName}\n\n`;
    } else {
      // Fallback (legacy enhance mode - should rarely be used)
      prompt = `You are a professional translator and text editor. You are reviewing and enhancing a translation.\n\n`;
      prompt += `CONTEXT:\n`;
      prompt += `- Text was translated from ${sourceLanguageName} to ${targetLanguageName}\n`;
      prompt += `- Your role is to REVIEW and IMPROVE the translation\n`;
      prompt += `- CRITICAL: Output must be entirely in ${targetLanguageName}\n\n`;
    }
    
    if (extra?.strictLanguage) {
      prompt += `⚠️ STRICT MODE: Remove any English words except proper nouns. Rewrite into ${targetLanguageName}.\n\n`;
    }

    // Portuguese (Brazil) consistency rules (fixes issues like "tua" vs "sua", "demasiado", agreement errors, etc.)
    if (targetLower === 'pt' || targetLower === 'pt-br' || targetLanguageName.toLowerCase().includes('brazilian portuguese')) {
      prompt += `BRAZILIAN PORTUGUESE STYLE GUIDE (CRITICAL):\n`;
      prompt += `- Use Brazilian Portuguese (pt-BR), not European Portuguese.\n`;
      prompt += `- Pronouns: prefer "você" and possessives "seu/sua/seus/suas". Avoid "tu/teu/tua" unless the source clearly uses that register.\n`;
      prompt += `- Avoid Europeanisms like "demasiado" when "demais" fits naturally.\n`;
      prompt += `- CRITICAL: Fix ALL number/gender agreement errors:\n`;
      prompt += `  Example: "Eram bons homens. Talvez demasiado bom." → "Eram bons homens. Talvez bons demais."\n`;
      prompt += `  (plural subject "homens" requires plural adjective "bons", not singular "bom")\n`;
      prompt += `- Use "de" for possessive with proper nouns: "a porta de Al'Thor" (not "do Al'Thor")\n`;
      prompt += `- Keep proper names unchanged (do not translate names).\n\n`;
    }

    if (hasHtmlTags) {
      prompt += `⚠️ CRITICAL: This text contains HTML formatting tags. You MUST preserve ALL HTML tags exactly as they are. Do not remove, modify, or add any HTML tags.\n\n`;
    }
    prompt += `⚠️ CRITICAL OUTPUT FORMAT:\n`;
    prompt += `- Return ONLY the improved translation text\n`;
    prompt += `- Do NOT include headings, bullet points, numbered lists, or commentary\n\n`;

    // Add text analysis issues if available (from "1.5 layer")
    if (extra?.analysisReport && extra.analysisReport.hasIssues) {
      prompt += `TEXT ANALYSIS - SPECIFIC ISSUES DETECTED:\n`;
      prompt += `The following issues were identified in the translation. Please address them:\n\n`;
      
      extra.analysisReport.issues.forEach((issue, index) => {
        const severityIcon = issue.severity === 'critical' ? '🔴' : 
                            issue.severity === 'high' ? '🟠' : 
                            issue.severity === 'medium' ? '🟡' : '🟢';
        
        prompt += `${index + 1}. ${severityIcon} ${issue.description}\n`;
        prompt += `   → ${issue.suggestion}\n`;
        
        if (issue.examples && issue.examples.length > 0) {
          prompt += `   Examples to fix:\n`;
          issue.examples.forEach((example) => {
            const text = typeof example === 'string' ? example : example.text;
            prompt += `   • "${text}"\n`;
          });
        }
        prompt += `\n`;
      });
      
      prompt += `\n`;
    }

    prompt += `TRANSLATION TO REVIEW:\n${text}\n\n`;

    if (extra?.outputJson) {
      prompt += `RESPONSE FORMAT:\n`;
      prompt += `- Return ONLY a valid JSON object with a single key \"text\".\n`;
      prompt += `- The value of \"text\" MUST be the final improved translation (no preface, no explanations).\n`;
      prompt += `- Example: {\"text\":\"...\"}\n\n`;
    }

    prompt += `YOUR TASK:\n`;

    if (role === 'enhance') {
      // Legacy enhance mode (deprecated - use rewrite instead)
      prompt += `Review the translation and improve quality:\n`;
      prompt += `- Fix grammar errors, mistranslations, awkward phrasing\n`;
      prompt += `- Return the COMPLETE enhanced translation from start to finish\n`;
      prompt += `- Do NOT summarize or truncate\n\n`;
    } else if (role === 'validation') {
      // Optimized validation prompt (fast detection, ~200 tokens output)
      prompt += `Quickly review this translation and respond:\n`;
      prompt += `- Say "OK" if accurate and natural\n`;
      prompt += `- OR list up to 5 critical issues using format: [TYPE] Brief description\n\n`;
      
      prompt += `Issue types to check:\n`;
      prompt += `- [GENDER] / [PLURAL] - Agreement errors\n`;
      prompt += `- [WORD_ORDER] - Unnatural phrasing\n`;
      prompt += `- [MISTRANSLATION] - Meaning errors\n`;
      
      // Portuguese-specific checks
      if (targetLower === 'pt' || targetLower === 'pt-br' || targetLanguageName.toLowerCase().includes('brazilian portuguese')) {
        prompt += `- [VARIANT] - European Portuguese detected (expected: Brazilian)\n`;
        prompt += `  • Flag if: "teu/tua", "demasiado", "comboio", European vocabulary\n`;
      }
      
      // Formality check
      const expectedFormality = formality || 'neutral';
      prompt += `- [FORMALITY] - Tone mismatch (expected: ${expectedFormality})\n`;
      if (expectedFormality === 'formal') {
        prompt += `  • Flag if too casual (missing senhor/senhora, using slang)\n`;
      } else if (expectedFormality === 'informal') {
        prompt += `  • Flag if too formal (overly polite, stiff language)\n`;
      } else {
        prompt += `  • Flag if too formal OR too casual\n`;
      }
      
      prompt += `\nExample good response:\n`;
      prompt += `[GENDER] "bom homens" should be "bons homens"\n`;
      prompt += `[VARIANT] Uses "demasiado" (European), change to "demais"\n`;
      prompt += `[FORMALITY] Too formal, expected neutral tone\n\n`;
      
      prompt += `⚠️ CRITICAL: Keep response under 75 words. Do NOT rewrite text.\n\n`;
    } else if (role === 'rewrite') {
      // CRITICAL FIX: Ultra-simple prompt for HTML content to prevent truncation
      if (hasHtmlTags && textLength > 2000) {
        prompt += `CRITICAL TASK: Rewrite this COMPLETE ${targetLanguageName} text with the following fixes:\n\n`;
        
        // Simplified issue list (max 2 most critical - fewer = better completion)
        if (extra?.analysisReport?.validationIssues && extra.analysisReport.validationIssues.length > 0) {
          const topIssues = extra.analysisReport.validationIssues.slice(0, 2);
          topIssues.forEach((issue, idx) => {
            prompt += `${idx + 1}. ${issue.description}\n`;
          });
          if (extra.analysisReport.validationIssues.length > 2) {
            prompt += `(${extra.analysisReport.validationIssues.length - 2} other minor issues to address)\n`;
          }
          prompt += `\n`;
        }
        
        prompt += `CRITICAL INSTRUCTIONS:\n`;
        prompt += `1. Output the ENTIRE text from beginning to end\n`;
        prompt += `2. Preserve ALL HTML tags exactly (<p>, <div>, <span>, etc.)\n`;
        prompt += `3. Fix the issues mentioned above throughout the text\n`;
        prompt += `4. Do NOT stop mid-sentence or mid-paragraph\n`;
        prompt += `5. Continue until you've rewritten ALL the text\n\n`;
        
        prompt += `START YOUR COMPLETE REWRITE NOW:\n`;
      } else {
        // Original detailed prompt for non-HTML or shorter text
        if (extra?.analysisReport?.validationIssues && extra.analysisReport.validationIssues.length > 0) {
          prompt += `Fix these specific issues found by validator:\n\n`;
          
          let hasVariantIssues = false;
          let hasFormalityIssues = false;
          let hasGrammarOnly = true;
          
          extra.analysisReport.validationIssues.forEach((issue, idx) => {
            prompt += `${idx + 1}. [${issue.type}] ${issue.description}\n`;
            
            const type = issue.type.toUpperCase();
            if (type === 'VARIANT') hasVariantIssues = true;
            if (type === 'FORMALITY') hasFormalityIssues = true;
            if (!['GENDER', 'PLURAL', 'WORD_ORDER'].includes(type)) hasGrammarOnly = false;
          });
          prompt += `\n`;
          
          // Specific fix instructions based on issue types
          if (hasVariantIssues && (targetLower === 'pt' || targetLower === 'pt-br')) {
            prompt += `European → Brazilian Portuguese fixes:\n`;
            prompt += `• "teu/tua" → "seu/sua"\n`;
            prompt += `• "demasiado" → "demais" or "muito"\n`;
            prompt += `• Use Brazilian vocabulary and verb forms\n\n`;
          }
          
          if (hasFormalityIssues) {
            const expectedFormality = formality || 'neutral';
            if (expectedFormality === 'formal') {
              prompt += `Adjust to FORMAL tone: Use senhor/senhora, formal pronouns, professional vocabulary\n\n`;
            } else if (expectedFormality === 'informal') {
              prompt += `Adjust to INFORMAL tone: Use casual language, conversational expressions\n\n`;
            } else {
              prompt += `Adjust to NEUTRAL tone: Balance between formal and casual\n\n`;
            }
          }
          
          // Rewrite strategy based on issue complexity
          if (hasGrammarOnly && !hasVariantIssues && !hasFormalityIssues) {
            prompt += `Strategy: Grammar fixes only - make precise, minimal changes\n`;
            prompt += `Return complete corrected text maintaining original style\n\n`;
          } else {
            prompt += `Strategy: Semantic/style fixes - rewrite for natural flow\n`;
            prompt += `Return complete text with issues resolved and natural phrasing\n\n`;
          }
        } else {
          prompt += `Improve this translation:\n`;
          prompt += `- Fix any grammar, phrasing, or naturalness issues\n`;
          prompt += `- Keep meaning identical\n`;
          prompt += `- Return complete rewritten text\n\n`;
        }
        
        // Apply structure improvements if requested
        if (improveStructure) {
          prompt += `Additional improvements:\n`;
          prompt += `- Fix number/gender agreement errors\n`;
          prompt += `- Improve text flow and transitions\n`;
          prompt += `- Ensure natural ${targetLanguageName} phrasing\n\n`;
        }
      }
    } else if (role === 'technical') {
      // Optimized technical check (final polish, ~2400 tokens output)
      prompt += `Perform final technical review:\n`;
      prompt += `- Verify technical terms and terminology consistency\n`;
      prompt += `- Check numbers, units, measurements, dates are accurate\n`;
      prompt += `- Ensure proper nouns and names are preserved correctly\n`;
      prompt += `- Fix any formatting inconsistencies\n`;
      prompt += `- Return complete reviewed text\n\n`;
      
      // Glossary verification (only in technical stage)
      if (verifyGlossary && glossaryTerms && glossaryTerms.length > 0) {
        prompt += `Glossary terms to verify:\n`;
        glossaryTerms.slice(0, 10).forEach(term => {
          prompt += `• "${term.source_term}" → "${term.target_term}"\n`;
        });
        if (glossaryTerms.length > 10) {
          prompt += `... and ${glossaryTerms.length - 10} more terms\n`;
        }
        prompt += `\n`;
      }
    }
    
    // NOTE: Formality and structure are now handled within role-specific prompts
    // No need for separate tasks - they're integrated into validation + rewrite

    // Final output requirements
    if (role === 'validation') {
      prompt += `⚠️ OUTPUT: Brief issue list OR "OK" (max 75 words)\n`;
    } else {
      if (hasHtmlTags) {
        prompt += `\n⚠️ CRITICAL OUTPUT REQUIREMENTS:\n`;
        prompt += `1. Return the COMPLETE text from beginning to end\n`;
        prompt += `2. Length must be approximately ${textLength} characters (current input length)\n`;
        prompt += `3. PRESERVE ALL HTML tags EXACTLY as they appear\n`;
        prompt += `4. Do NOT stop mid-sentence, mid-paragraph, or mid-tag\n`;
        prompt += `5. Do NOT add explanations, summaries, or comments\n`;
        prompt += `6. Output ONLY the complete rewritten text\n\n`;
        prompt += `BEGIN COMPLETE REWRITE:\n`;
      } else {
        prompt += `\n⚠️ OUTPUT: Complete ${role === 'technical' ? 'reviewed' : 'rewritten'} text from start to end (~${textLength} chars, no truncation, no explanations)\n`;
      }
    }

    return prompt;
  }

  /**
   * Remove common meta-prefaces the model sometimes adds.
   * @private
   */
  sanitizeEnhancedText(text, targetLang) {
    if (!text || typeof text !== 'string') return text;
    let out = text.trim();

    // Strip invisible leading characters
    out = out.replace(/^[\uFEFF\u200B-\u200D\u2060]+/g, '').trim();

    // Remove code fences if any
    out = out.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    // Remove common leading meta lines / prefixes
    const patterns = [
      /^here('?s)?\s+is\s+(the\s+)?(enhanced|improved)\s+(translation|tradu[cç][aã]o|texto).*?:\s*/i,
      /^(enhanced|improved)\s+(translation|tradu[cç][aã]o|texto).*?:\s*/i,
      /^(tradu[cç][aã]o|texto)\s+(aprimorad[oa]|melhorad[oa]).*?:\s*/i
    ];
    for (const re of patterns) {
      if (re.test(out)) {
        out = out.replace(re, '').trim();
        break;
      }
    }

    return out;
  }

  /**
   * Detect when the model returned meta text / lists instead of a real enhanced translation.
   * @private
   */
  isInvalidEnhancement(enhanced, original) {
    return Boolean(this.getInvalidEnhancementReason(enhanced, original));
  }

  /**
   * Explain why an enhancement is considered invalid.
   * @private
   */
  getInvalidEnhancementReason(enhanced, original, role = 'enhance') {
    try {
      const e = String(enhanced || '').trim();
      const o = String(original || '').trim();
      if (!e) return 'empty-output';

      // Meta prefixes (even if sanitization missed them)
      const meta = /(here('?s)?\s+is\s+the\s+(enhanced|improved)|enhanced\s+tradu|tradu[cç][aã]o\s+aprimorad|improved\s+translation)/i;
      if (meta.test(e)) return 'meta-prefix';

      // Looks like a numbered list that wasn't in the original
      const listItems = (e.match(/\b\d+\.\s+/g) || []).length;
      const originalListItems = (o.match(/\b\d+\.\s+/g) || []).length;
      if (listItems >= 2 && originalListItems === 0) return 'unexpected-list';

      // If output is dramatically shorter or longer, it's suspicious
      // EXCEPT for validation mode: accept ANY length if output looks linguistically valid
      const ratio = e.length / Math.max(1, o.length);
      
      if (role === 'validation') {
        // Validation mode: skip length check entirely
        // Models often return partial corrections, which is acceptable for validation
        // The output quality is more important than completeness
        return null;
      } else {
        // Other modes: moderate thresholds
        if (ratio < 0.3) return `too-short(${ratio.toFixed(2)})`;
        if (ratio > 2.0) return `too-long(${ratio.toFixed(2)})`;
      }

      return null;
    } catch {
      return 'validation-error';
    }
  }

  /**
   * Detect if output contains significant English leakage when target != English.
   * @private
   */
  detectEnglishLeakage(text, targetLang) {
    try {
      const tl = String(targetLang || '').toLowerCase();
      if (!tl || tl === 'en' || tl.startsWith('en-')) return false;

      const stripped = String(text || '')
        .replace(/<[^>]+>/g, ' ')
        .toLowerCase();

      const words = stripped.match(/[a-z]+/g) || [];
      if (words.length < 30) return false;

      // Avoid ambiguous 1-2 letter tokens; focus on strong English function words
      const englishStop = new Set([
        'the', 'and', 'that', 'this', 'these', 'those', 'with', 'from', 'into', 'over', 'under',
        'for', 'about', 'because', 'while', 'where', 'when', 'what', 'which', 'who', 'whom',
        'is', 'are', 'was', 'were', 'been', 'being', 'have', 'has', 'had', 'will', 'would',
        'can', 'could', 'should', 'may', 'might', 'must', 'not', 'but', 'also', 'there', 'here',
        'your', 'their', 'them', 'they', 'you', 'we', 'our'
      ]);

      let hits = 0;
      for (const w of words) {
        if (englishStop.has(w)) hits++;
      }

      const ratio = hits / words.length;
      // Heuristic: enough English stopwords to indicate the text is drifting into English
      return hits >= 6 && ratio >= 0.02;
    } catch {
      return false;
    }
  }

  /**
   * Enforce glossary terms after LLM processing (best-effort).
   * @private
   */
  enforceGlossaryTerms(text, glossaryTerms) {
    if (!text) return text;
    const hasHtmlTags = /<[^>]+>/.test(text);

    const replaceOutsideTags = (input, regex, replacement) => {
      if (!hasHtmlTags) return input.replace(regex, replacement);
      return input
        .split(/(<[^>]+>)/g)
        .map(part => (part.startsWith('<') && part.endsWith('>') ? part : part.replace(regex, replacement)))
        .join('');
    };

    let out = text;
    for (const term of glossaryTerms) {
      const source = term?.source_term;
      const target = term?.target_term;
      if (!source || !target) continue;
      const escaped = String(source).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
      out = replaceOutsideTags(out, regex, target);
    }
    return out;
  }

  /**
   * Apply common Brazilian Portuguese grammar fixes
   * @private
   */
  applyBrazilianPortugueseFixes(text) {
    if (!text || typeof text !== 'string') return text;
    let fixed = text;

    // Fix "do/da + proper noun starting with vowel/consonant" → "de"
    // Pattern: "do Al'Thor" → "de Al'Thor", "da Egwene" → "de Egwene" (more natural for names)
    fixed = fixed.replace(/\b(do|da)\s+([A-Z][a-z]*['']?[A-Z]?[a-z]*)\b/g, (match, article, name) => {
      // Only fix if it's clearly a proper noun (capitalized)
      return `de ${name}`;
    });

    // Fix "tua/teu" → "sua/seu" (pt-BR default, unless dialogue clearly needs tu)
    // Only replace when not preceded by "tu" (to avoid breaking intentional tu-form)
    fixed = fixed.replace(/(?<!tu\s)\b(tua|teu|tuas|teus)\b/gi, (match) => {
      const lower = match.toLowerCase();
      if (lower === 'tua') return match.replace(/tua/i, 'sua');
      if (lower === 'teu') return match.replace(/teu/i, 'seu');
      if (lower === 'tuas') return match.replace(/tuas/i, 'suas');
      if (lower === 'teus') return match.replace(/teus/i, 'seus');
      return match;
    });

    // Fix common agreement errors where adjective doesn't match plural noun
    // Look for plural nouns followed (within ~5 words) by singular adjective
    // Pattern: "homens... bom" → "homens... bons" (but only if no singular noun in between)
    const pluralNouns = ['homens', 'mulheres', 'pessoas', 'eles', 'elas', 'todos', 'todas', 'alguns', 'algumas'];
    const singularAdjs = [
      { singular: 'bom', plural: 'bons' },
      { singular: 'boa', plural: 'boas' },
      { singular: 'grande', plural: 'grandes' },
      { singular: 'pequeno', plural: 'pequenos' },
      { singular: 'pequena', plural: 'pequenas' }
    ];

    for (const adj of singularAdjs) {
      for (const noun of pluralNouns) {
        // Match: plural noun + (up to 5 words) + singular adjective + sentence boundary
        const pattern = new RegExp(
          `\\b${noun}\\b([^.!?]{0,50})\\b${adj.singular}\\b(?=[.!?\\s])`,
          'gi'
        );
        fixed = fixed.replace(pattern, (match, middle) => {
          // Only fix if there's no singular noun in the middle that would justify singular adjective
          const singularNouns = ['homem', 'mulher', 'pessoa', 'ele', 'ela'];
          const hasSingular = singularNouns.some(sn => new RegExp(`\\b${sn}\\b`, 'i').test(middle));
          if (!hasSingular) {
            return match.replace(new RegExp(`\\b${adj.singular}\\b`, 'gi'), adj.plural);
          }
          return match;
        });
      }
    }

    return fixed;
  }

  /**
   * Detect changes between original and enhanced text
   * @private
   */
  detectChanges(original, enhanced) {
    const changes = {
      lengthDiff: enhanced.length - original.length,
      percentChange: Math.abs(((enhanced.length - original.length) / original.length) * 100).toFixed(2),
      modified: original !== enhanced
    };

    return changes;
  }

  /**
   * Get system information for performance estimates
   * @returns {Promise<Object>}
   */
  async getSystemInfo() {
    try {
      const cpuUsage = this.getCpuUsagePercent();
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryUsagePercent = ((1 - freeMemory / totalMemory) * 100).toFixed(2);

      const info = {
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus(),
        cpuModel: os.cpus()[0]?.model || 'Unknown',
        cpuCores: os.cpus().length,
        totalMemory,
        freeMemory,
        memoryUsagePercent,
        // Normalized objects expected by the frontend panels
        cpu: {
          model: os.cpus()[0]?.model || 'Unknown',
          cores: os.cpus().length,
          usage: cpuUsage === null ? 'N/A' : cpuUsage.toFixed(1)
        },
        memory: {
          total: totalMemory,
          free: freeMemory,
          used: usedMemory,
          usagePercent: memoryUsagePercent
        },
        gpu: await this.detectGPU(),
        ollamaInstalled: await this.isInstalled(),
        ollamaRunning: await this.isRunning(),
        ollamaVersion: await this.getVersion(),
        installedModels: await this.getModels()
      };

      // Calculate performance estimate
      info.performanceEstimate = this.calculatePerformanceEstimate(info);

      this.systemInfo = info;
      return info;
    } catch (error) {
      Logger.logError('ollama', 'Failed to get system info', error, {});
      return null;
    }
  }

  /**
   * Estimate total CPU usage % between calls (all cores).
   * Returns null on first sample.
   * @private
   */
  getCpuUsagePercent() {
    try {
      const cpus = os.cpus();
      const now = Date.now();

      let idle = 0;
      let total = 0;
      for (const cpu of cpus) {
        const times = cpu.times || {};
        const cpuIdle = times.idle || 0;
        const cpuTotal = (times.user || 0) + (times.nice || 0) + (times.sys || 0) + (times.idle || 0) + (times.irq || 0);
        idle += cpuIdle;
        total += cpuTotal;
      }

      const sample = { idle, total, ts: now };
      const prev = this._lastCpuSample;
      this._lastCpuSample = sample;

      if (!prev) return null;

      const idleDelta = sample.idle - prev.idle;
      const totalDelta = sample.total - prev.total;
      if (totalDelta <= 0) return null;

      const usage = (1 - idleDelta / totalDelta) * 100;
      // Clamp to sane bounds
      return Math.max(0, Math.min(100, usage));
    } catch {
      return null;
    }
  }

  /**
   * Detect GPU information
   * @private
   */
  async detectGPU() {
    try {
      if (os.platform() === 'win32') {
        // Windows: Use wmic to get GPU info
        try {
          const { stdout } = await execAsync('wmic path win32_VideoController get name,AdapterRAM /format:csv');
          const lines = stdout.split('\n').filter(line => line.trim() && !line.startsWith('Node'));
          
          if (lines.length > 0) {
            const parts = lines[0].split(',');
            const vram = parts[1] ? parseInt(parts[1]) / (1024 * 1024 * 1024) : 0; // Convert to GB
            const name = parts[2] ? parts[2].trim() : 'Unknown GPU';
            
            return {
              detected: true,
              name,
              vram: vram.toFixed(2) + ' GB',
              type: name.toLowerCase().includes('nvidia') ? 'NVIDIA' : 
                    name.toLowerCase().includes('amd') ? 'AMD' : 
                    name.toLowerCase().includes('intel') ? 'Intel' : 'Unknown'
            };
          }
        } catch {}
      } else {
        // Linux: Try to detect NVIDIA GPU
        try {
          const { stdout } = await execAsync('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader');
          const [name, vram] = stdout.trim().split(',');
          
          return {
            detected: true,
            name: name.trim(),
            vram: vram.trim(),
            type: 'NVIDIA'
          };
        } catch {}
      }

      return {
        detected: false,
        name: 'No dedicated GPU detected',
        vram: '0 GB',
        type: 'CPU'
      };
    } catch (error) {
      return {
        detected: false,
        name: 'Unknown',
        vram: '0 GB',
        type: 'Unknown'
      };
    }
  }

  /**
   * Calculate performance estimate based on hardware
   * @private
   */
  calculatePerformanceEstimate(systemInfo) {
    const cpuCores = systemInfo.cpuCores;
    const totalMemoryGB = systemInfo.totalMemory / (1024 * 1024 * 1024);
    const hasGPU = systemInfo.gpu.detected;
    const gpuType = systemInfo.gpu.type;

    let speed = 'slow'; // slow, medium, fast
    let estimatedSecondsPerPage = 15; // Default estimate
    let description = '';

    // GPU-based estimates
    if (hasGPU && gpuType === 'NVIDIA') {
      speed = 'fast';
      estimatedSecondsPerPage = 2;
      description = `Fast performance with ${systemInfo.gpu.name}`;
    } else if (hasGPU && (gpuType === 'AMD' || gpuType === 'Intel')) {
      speed = 'medium';
      estimatedSecondsPerPage = 5;
      description = `Good performance with ${systemInfo.gpu.name}`;
    } else {
      // CPU-only estimates
      if (cpuCores >= 8 && totalMemoryGB >= 16) {
        speed = 'medium';
        estimatedSecondsPerPage = 8;
        description = `Good CPU performance (${cpuCores} cores, ${totalMemoryGB.toFixed(0)}GB RAM)`;
      } else if (cpuCores >= 4 && totalMemoryGB >= 8) {
        speed = 'medium';
        estimatedSecondsPerPage = 12;
        description = `Moderate CPU performance (${cpuCores} cores, ${totalMemoryGB.toFixed(0)}GB RAM)`;
      } else {
        speed = 'slow';
        estimatedSecondsPerPage = 20;
        description = `Limited CPU performance (${cpuCores} cores, ${totalMemoryGB.toFixed(0)}GB RAM)`;
      }
    }

    return {
      speed,
      estimatedSecondsPerPage,
      estimatedSecondsPerKChars: Math.round(estimatedSecondsPerPage / 2), // Assuming ~2K chars per page
      description,
      icon: speed === 'fast' ? '🟢' : speed === 'medium' ? '🟡' : '🔴'
    };
  }

  /**
   * Get full status including installation, running state, and models
   * @returns {Promise<Object>}
   */
  async getStatus() {
    const installed = await this.isInstalled();
    const running = await this.isRunning();
    const version = await this.getVersion();
    const models = await this.getModels();
    const recommendedInstalled = await this.isModelInstalled(this.recommendedModel);

    return {
      installed,
      running,
      version,
      models,
      modelCount: models.length,
      recommendedModel: this.recommendedModel,
      recommendedInstalled,
      status: this.status,
      baseUrl: this.baseUrl
    };
  }
}

// Singleton instance
const ollamaService = new OllamaService();

export default ollamaService;
