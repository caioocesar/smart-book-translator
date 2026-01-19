import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import Logger from '../utils/logger.js';
import Settings from '../models/Settings.js';

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

      // Build the prompt based on options
      const prompt = this.buildEnhancementPrompt(
        translatedText,
        sourceLang,
        targetLang,
        formality,
        improveStructure,
        verifyGlossary,
        glossaryTerms,
        { outputJson: true, analysisReport, role }
      );

      const buildOllamaOptions = (overrides = {}) => ({
        temperature: generationOptions.temperature ?? 0.3,
        top_p: generationOptions.top_p ?? 0.9,
        num_ctx: generationOptions.num_ctx,
        num_batch: generationOptions.num_batch,
        num_thread: generationOptions.num_thread,
        num_gpu: generationOptions.num_gpu,
        ...overrides
      });

      const callOllama = async (promptText, overrideOptions = {}, useStructuredOutput = true) => {
        const body = {
          model: modelToUse,
          prompt: promptText,
          stream: false,
          options: {
            ...buildOllamaOptions(overrideOptions)
          }
        };

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
          const response = await axios.post(`${this.baseUrl}/api/generate`, body, { timeout: 120000 });
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
            const response = await axios.post(
              `${this.baseUrl}/api/generate`,
              { ...body, format: undefined },
              { timeout: 120000 }
            );
            return (response.data?.response ?? '').trim();
          }
          throw err;
        }
      };

      // Attempt 1 (normal)
      let enhancedText = await callOllama(prompt, {}, true);
      enhancedText = this.sanitizeEnhancedText(enhancedText, targetLang);
      enhancedText = this.sanitizeEnhancedText(enhancedText, targetLang); // run twice to catch multi-line prefixes

      const invalid = this.isInvalidEnhancement(enhancedText, translatedText);

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

      // If still invalid after retry, fail closed (keep original translation).
      if (this.isInvalidEnhancement(enhancedText, translatedText)) {
        return {
          success: false,
          error: 'LLM output looked like meta text or a list, not a real translation',
          originalText: translatedText
        };
      }

      // Enforce glossary after LLM (prevents the LLM from undoing glossary work).
      if (Array.isArray(glossaryTerms) && glossaryTerms.length > 0) {
        enhancedText = this.enforceGlossaryTerms(enhancedText, glossaryTerms);
      }

      // Apply pt-BR grammar fixes (agreement, prepositions, pronouns)
      if (targetLang === 'pt') {
        enhancedText = this.applyBrazilianPortugueseFixes(enhancedText);
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
   * Build enhancement prompt based on options
   * @private
   */
  buildEnhancementPrompt(text, sourceLang, targetLang, formality, improveStructure, verifyGlossary, glossaryTerms, extra = {}) {
    // Detect if text contains HTML tags
    const hasHtmlTags = /<[^>]+>/.test(text);
    
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
    
    let prompt = `You are a professional translator and text editor. You are reviewing and enhancing a translation that has already been completed.\n\n`;
    
    prompt += `CONTEXT:\n`;
    prompt += `- This text was translated from ${sourceLanguageName} to ${targetLanguageName} using an automated translation service\n`;
    prompt += `- Your role is to REVIEW and IMPROVE the existing ${targetLanguageName} translation, not to translate from scratch\n`;
    prompt += `- Focus on making the ${targetLanguageName} translation more natural, accurate, and appropriate for the target audience\n`;
    prompt += `- IMPORTANT: The text below is ALREADY in ${targetLanguageName}. Do NOT translate it back to ${sourceLanguageName}!\n\n`;
    prompt += `- CRITICAL: Output must be written entirely in ${targetLanguageName}. If any English remains, translate it into ${targetLanguageName}.\n`;
    if (extra?.strictLanguage) {
      prompt += `- STRICT MODE: Do not leave any English words except proper nouns. Rewrite any remaining English into ${targetLanguageName}.\n`;
    }
    prompt += `\n`;

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

    prompt += `YOUR REVIEW TASKS:\n`;

    let taskNumber = 1;
    const role = extra?.role || 'enhance';

    if (role === 'validation') {
      prompt += `${taskNumber}. SEMANTIC VALIDATION:\n`;
      prompt += `   - Verify that the meaning matches the original intent\n`;
      prompt += `   - Fix mistranslations with MINIMAL edits\n`;
      prompt += `   - Preserve structure and wording unless incorrect\n`;
      taskNumber++;
    } else if (role === 'rewrite') {
      prompt += `${taskNumber}. NATURAL REWRITE:\n`;
      prompt += `   - Rewrite to sound natural and fluent in ${targetLanguageName}\n`;
      prompt += `   - Keep meaning identical, improve flow and readability\n`;
      taskNumber++;
    } else if (role === 'technical') {
      prompt += `${taskNumber}. TECHNICAL REVIEW:\n`;
      prompt += `   - Ensure technical terms, numbers, units, and names are accurate\n`;
      prompt += `   - Fix any terminology inconsistencies or formatting issues\n`;
      taskNumber++;
    }
    
    // Formality adjustment
    if (formality === 'formal') {
      prompt += `${taskNumber}. FORMALITY ADJUSTMENT:\n`;
      prompt += `   - Review the translation and adjust it to be more formal and professional\n`;
      prompt += `   - Use formal pronouns (você, senhor/senhora for Portuguese, etc.)\n`;
      prompt += `   - Replace casual expressions with formal vocabulary\n`;
      prompt += `   - Maintain professional tone throughout\n`;
      taskNumber++;
    } else if (formality === 'informal') {
      prompt += `${taskNumber}. FORMALITY ADJUSTMENT:\n`;
      prompt += `   - Review the translation and make it more casual and conversational\n`;
      prompt += `   - Use informal pronouns appropriate for the target language\n`;
      prompt += `   - Replace overly formal expressions with natural, everyday language\n`;
      prompt += `   - Make it sound like a friendly conversation\n`;
      taskNumber++;
    } else {
      prompt += `${taskNumber}. TONE REVIEW:\n`;
      prompt += `   - Maintain a neutral, balanced tone - neither too formal nor too casual\n`;
      prompt += `   - Ensure the tone is appropriate for general audiences\n`;
      taskNumber++;
    }

    // Structure improvements
    if (improveStructure) {
      prompt += `${taskNumber}. TEXT STRUCTURE AND FLOW:\n`;
      prompt += `   - Review and improve text cohesion and coherence\n`;
      prompt += `   - Ensure logical flow between sentences and paragraphs\n`;
      prompt += `   - Add appropriate connectors and transitions where needed\n`;
      prompt += `   - Fix any grammatical errors or awkward phrasing\n`;
      prompt += `   - CRITICAL: Fix number/gender agreement errors (e.g., plural noun + singular adjective)\n`;
      prompt += `   - Improve readability and make the language flow naturally\n`;
      prompt += `   - Ensure the translation sounds natural in ${targetLanguageName}\n`;
      taskNumber++;
    }

    // Glossary verification
    if (verifyGlossary && glossaryTerms.length > 0) {
      prompt += `${taskNumber}. GLOSSARY TERM VERIFICATION:\n`;
      prompt += `   - Check that these technical terms are translated correctly:\n`;
      for (const term of glossaryTerms) {
        prompt += `     • "${term.source_term}" MUST be translated as "${term.target_term}"\n`;
      }
      prompt += `   - If any term is translated incorrectly, fix it to match the glossary\n`;
      prompt += `   - Preserve the glossary terms exactly as specified\n`;
      taskNumber++;
    }

    if (hasHtmlTags) {
      prompt += `\n⚠️ CRITICAL REQUIREMENTS:\n`;
      prompt += `1. Return ONLY the enhanced translation text\n`;
      prompt += `2. Do NOT add any explanations, comments, or additional text\n`;
      prompt += `3. PRESERVE ALL HTML tags EXACTLY as they appear (including <p>, <strong>, <em>, <br>, <span>, etc.)\n`;
      prompt += `4. Do NOT remove, modify, or add any HTML tags\n`;
      prompt += `5. Only improve the TEXT content between the tags, not the tags themselves\n`;
    } else {
      prompt += `\nIMPORTANT: Return ONLY the enhanced translation text, without any explanations, comments, or additional formatting.`;
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
    try {
      const e = String(enhanced || '').trim().toLowerCase();
      const o = String(original || '').trim().toLowerCase();
      if (!e) return true;

      // Meta prefixes (even if sanitization missed them)
      const meta = /(here('?s)?\s+is\s+the\s+(enhanced|improved)|enhanced\s+tradu|tradu[cç][aã]o\s+aprimorad|improved\s+translation)/i;
      if (meta.test(e)) return true;

      // Looks like a numbered list that wasn't in the original
      const listItems = (e.match(/\b\d+\.\s+/g) || []).length;
      const originalListItems = (o.match(/\b\d+\.\s+/g) || []).length;
      if (listItems >= 2 && originalListItems === 0) return true;

      // If output is dramatically shorter or longer, it's suspicious
      const ratio = enhanced.length / Math.max(1, original.length);
      if (ratio < 0.5 || ratio > 1.8) return true;

      return false;
    } catch {
      return true;
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
