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
      Logger.logError('ollama', `Starting download of model: ${modelName}`, null, {});

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
          Logger.logError('ollama', `Model download completed: ${modelName}`, null, {});
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
      model = null
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
        glossaryTerms
      );

      // Call Ollama API
      const response = await axios.post(
        `${this.baseUrl}/api/generate`,
        {
          model: modelToUse,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.3, // Lower temperature for more consistent output
            top_p: 0.9
          }
        },
        {
          timeout: 120000 // 2 minutes timeout
        }
      );

      const enhancedText = response.data.response.trim();
      const duration = Date.now() - startTime;

      Logger.logError('ollama', 'Translation enhanced successfully', null, {
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
  buildEnhancementPrompt(text, sourceLang, targetLang, formality, improveStructure, verifyGlossary, glossaryTerms) {
    // Detect if text contains HTML tags
    const hasHtmlTags = /<[^>]+>/.test(text);
    
    let prompt = `You are a professional translator and text editor. Your task is to enhance the following ${targetLang} translation.\n\n`;

    if (hasHtmlTags) {
      prompt += `⚠️ CRITICAL: This text contains HTML formatting tags. You MUST preserve ALL HTML tags exactly as they are. Do not remove, modify, or add any HTML tags.\n\n`;
    }

    prompt += `Original translation:\n${text}\n\n`;

    prompt += `Instructions:\n`;

    // Formality adjustment
    if (formality === 'formal') {
      prompt += `1. Adjust the text to be more formal and professional. Use formal pronouns and vocabulary.\n`;
    } else if (formality === 'informal') {
      prompt += `1. Adjust the text to be more casual and conversational. Use informal pronouns and natural language.\n`;
    } else {
      prompt += `1. Maintain a neutral, balanced tone - neither too formal nor too casual.\n`;
    }

    // Structure improvements
    if (improveStructure) {
      prompt += `2. Improve text cohesion and coherence:\n`;
      prompt += `   - Ensure logical flow between sentences\n`;
      prompt += `   - Add appropriate connectors and transitions\n`;
      prompt += `   - Fix any grammatical errors\n`;
      prompt += `   - Improve readability and natural language flow\n`;
    }

    // Glossary verification
    if (verifyGlossary && glossaryTerms.length > 0) {
      prompt += `3. Verify and correct these technical terms (use exact translations):\n`;
      for (const term of glossaryTerms) {
        prompt += `   - "${term.source_term}" should be translated as "${term.target_term}"\n`;
      }
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
      const info = {
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus(),
        cpuModel: os.cpus()[0]?.model || 'Unknown',
        cpuCores: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        memoryUsagePercent: ((1 - os.freemem() / os.totalmem()) * 100).toFixed(2),
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
