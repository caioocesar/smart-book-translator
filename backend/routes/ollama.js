import express from 'express';
import ollamaService from '../services/ollamaService.js';
import Logger from '../utils/logger.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);
const router = express.Router();

/**
 * GET /api/ollama/status
 * Get Ollama installation and running status
 */
router.get('/status', async (req, res, next) => {
  try {
    const status = await ollamaService.getStatus();
    res.json(status);
  } catch (error) {
    Logger.logError('ollama', 'Failed to get status', error, {});
    next(error);
  }
});

/**
 * POST /api/ollama/start
 * Start Ollama service
 */
router.post('/start', async (req, res, next) => {
  try {
    const result = await ollamaService.start();
    res.json(result);
  } catch (error) {
    Logger.logError('ollama', 'Failed to start service', error, {});
    next(error);
  }
});

/**
 * POST /api/ollama/install
 * Install Ollama automatically
 */
router.post('/install', async (req, res, next) => {
  try {
    const platform = os.platform();
    let command;
    let output = '';

    if (platform === 'win32') {
      // Windows: Run PowerShell script
      command = 'powershell -ExecutionPolicy Bypass -File scripts\\install-ollama-windows.ps1';
    } else if (platform === 'linux' || platform === 'darwin') {
      // Linux/Mac: Run bash script or curl command
      const scriptPath = platform === 'linux' ? 'scripts/install-ollama-linux.sh' : 'scripts/install-ollama-macos.sh';
      command = `bash ${scriptPath}`;
      
      // Fallback to curl if script doesn't exist
      try {
        await execAsync(`test -f ${scriptPath}`);
      } catch {
        command = 'curl -fsSL https://ollama.com/install.sh | sh';
      }
    } else {
      return res.json({
        success: false,
        message: `Unsupported platform: ${platform}. Please install manually from ollama.com`
      });
    }

    Logger.logInfo('ollama', 'Starting automatic installation', { platform, command });

    // Execute installation command
    try {
      const { stdout, stderr } = await execAsync(command, { timeout: 300000 }); // 5 minute timeout
      output = stdout + (stderr ? '\n' + stderr : '');
      
      Logger.logInfo('ollama', 'Installation completed', { output: output.substring(0, 500) });
      
      res.json({
        success: true,
        message: 'Ollama installation started successfully. Please restart your computer.',
        output: output
      });
    } catch (execError) {
      output = execError.stdout + '\n' + execError.stderr;
      Logger.logError('ollama', 'Installation failed', execError, { output: output.substring(0, 500) });
      
      res.json({
        success: false,
        message: `Installation failed: ${execError.message}. Please try manual installation from ollama.com`,
        output: output
      });
    }
  } catch (error) {
    Logger.logError('ollama', 'Installation error', error, {});
    res.status(500).json({
      success: false,
      message: `Error: ${error.message}`
    });
  }
});

/**
 * GET /api/ollama/models
 * Get list of installed models
 */
router.get('/models', async (req, res, next) => {
  try {
    const models = await ollamaService.getModels();
    const totalSizeBytes = models.reduce((sum, model) => {
      const size = model?.size || model?.sizeBytes || 0;
      return sum + (Number.isFinite(size) ? size : 0);
    }, 0);
    res.json({
      models,
      count: models.length,
      recommended: ollamaService.recommendedModel,
      totalSizeBytes
    });
  } catch (error) {
    Logger.logError('ollama', 'Failed to get models', error, {});
    next(error);
  }
});

/**
 * POST /api/ollama/download-model
 * Download/pull a model
 * Body: { modelName: string }
 */
router.post('/download-model', async (req, res, next) => {
  try {
    const { modelName } = req.body;

    if (!modelName) {
      return res.status(400).json({
        success: false,
        error: 'Model name is required'
      });
    }

    // Check if Ollama is running
    const running = await ollamaService.isRunning();
    if (!running) {
      return res.status(400).json({
        success: false,
        error: 'Ollama service is not running. Please start it first.'
      });
    }

    // Start download (this will take time, so we'll use SSE for progress)
    // For now, return immediate response and download in background
    const result = await ollamaService.downloadModel(modelName);
    res.json(result);
  } catch (error) {
    Logger.logError('ollama', 'Failed to download model', error, { modelName: req.body.modelName });
    next(error);
  }
});

/**
 * POST /api/ollama/delete-model
 * Delete/uninstall a model
 * Body: { modelName: string }
 */
router.post('/delete-model', async (req, res, next) => {
  try {
    const { modelName } = req.body;
    if (!modelName) {
      return res.status(400).json({
        success: false,
        error: 'Model name is required'
      });
    }
    const running = await ollamaService.isRunning();
    if (!running) {
      return res.status(400).json({
        success: false,
        error: 'Ollama service is not running. Please start it first.'
      });
    }
    const result = await ollamaService.deleteModel(modelName);
    res.json(result);
  } catch (error) {
    Logger.logError('ollama', 'Failed to delete model', error, { modelName: req.body.modelName });
    next(error);
  }
});

router.delete('/delete-model', async (req, res, next) => {
  try {
    const { modelName } = req.body || {};
    if (!modelName) {
      return res.status(400).json({
        success: false,
        error: 'Model name is required'
      });
    }
    const running = await ollamaService.isRunning();
    if (!running) {
      return res.status(400).json({
        success: false,
        error: 'Ollama service is not running. Please start it first.'
      });
    }
    const result = await ollamaService.deleteModel(modelName);
    res.json(result);
  } catch (error) {
    Logger.logError('ollama', 'Failed to delete model', error, { modelName: req.body?.modelName });
    next(error);
  }
});

/**
 * POST /api/ollama/process
 * Process translation text with LLM enhancement
 * Body: {
 *   translatedText: string,
 *   sourceLang: string,
 *   targetLang: string,
 *   formality: 'informal' | 'neutral' | 'formal',
 *   improveStructure: boolean,
 *   verifyGlossary: boolean,
 *   glossaryTerms: Array,
 *   model: string (optional)
 * }
 */
router.post('/process', async (req, res, next) => {
  try {
    const {
      translatedText,
      sourceLang = 'en',
      targetLang = 'pt',
      formality = 'neutral',
      improveStructure = true,
      verifyGlossary = false,
      glossaryTerms = [],
      model = null
    } = req.body;

    if (!translatedText) {
      return res.status(400).json({
        success: false,
        error: 'translatedText is required'
      });
    }

    // Check if Ollama is running
    const running = await ollamaService.isRunning();
    if (!running) {
      return res.status(400).json({
        success: false,
        error: 'Ollama service is not running. Please start it first.'
      });
    }

    const result = await ollamaService.processTranslation(translatedText, {
      sourceLang,
      targetLang,
      formality,
      improveStructure,
      verifyGlossary,
      glossaryTerms,
      model
    });

    res.json(result);
  } catch (error) {
    Logger.logError('ollama', 'Failed to process translation', error, {});
    next(error);
  }
});

/**
 * GET /api/ollama/system-info
 * Get system information and performance estimates
 */
router.get('/system-info', async (req, res, next) => {
  try {
    const systemInfo = await ollamaService.getSystemInfo();
    res.json(systemInfo);
  } catch (error) {
    Logger.logError('ollama', 'Failed to get system info', error, {});
    next(error);
  }
});

/**
 * POST /api/ollama/test
 * Test Ollama with a simple translation enhancement
 */
router.post('/test', async (req, res, next) => {
  try {
    const testText = 'Hello, this is a test translation.';
    
    // Check if Ollama is running
    const running = await ollamaService.isRunning();
    if (!running) {
      return res.status(400).json({
        success: false,
        error: 'Ollama service is not running. Please start it first.'
      });
    }

    // Check if recommended model is installed
    const modelInstalled = await ollamaService.isModelInstalled(ollamaService.recommendedModel);
    if (!modelInstalled) {
      return res.json({
        success: false,
        error: `Recommended model ${ollamaService.recommendedModel} is not installed. Please download it first.`,
        needsModel: true
      });
    }

    const result = await ollamaService.processTranslation(testText, {
      sourceLang: 'en',
      targetLang: 'pt',
      formality: 'neutral',
      improveStructure: true,
      verifyGlossary: false,
      glossaryTerms: []
    });

    res.json({
      success: result.success,
      message: result.success ? 'Ollama is working correctly!' : 'Ollama test failed',
      result
    });
  } catch (error) {
    Logger.logError('ollama', 'Test failed', error, {});
    next(error);
  }
});

/**
 * GET /api/ollama/check-model/:modelName
 * Check if a specific model is installed
 */
router.get('/check-model/:modelName', async (req, res, next) => {
  try {
    const { modelName } = req.params;
    const installed = await ollamaService.isModelInstalled(modelName);
    
    res.json({
      modelName,
      installed
    });
  } catch (error) {
    Logger.logError('ollama', 'Failed to check model', error, { modelName: req.params.modelName });
    next(error);
  }
});

export default router;
