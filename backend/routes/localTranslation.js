import express from 'express';
import libreTranslateManager from '../services/libreTranslateManager.js';
import LocalTranslationService from '../services/localTranslationService.js';
import { LocalTranslationError } from '../utils/errors.js';

const router = express.Router();

// GET /api/local-translation/status - Check LibreTranslate status
router.get('/status', async (req, res, next) => {
  try {
    const health = await libreTranslateManager.healthCheck();
    const status = libreTranslateManager.getStatus();
    
    res.json({
      ...health,
      ...status,
      dockerAvailable: await libreTranslateManager.isDockerAvailable()
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/local-translation/languages - Get supported languages
router.get('/languages', async (req, res, next) => {
  try {
    const languages = await libreTranslateManager.getLanguages();
    res.json({ languages, count: languages.length });
  } catch (error) {
    next(new LocalTranslationError('Failed to get languages', { error: error.message }));
  }
});

// POST /api/local-translation/start - Start LibreTranslate via Docker
router.post('/start', async (req, res, next) => {
  try {
    const result = await libreTranslateManager.startLibreTranslate();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/local-translation/stop - Stop LibreTranslate
router.post('/stop', async (req, res, next) => {
  try {
    const result = await libreTranslateManager.stopLibreTranslate();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/local-translation/test - Test translation
router.post('/test', async (req, res, next) => {
  try {
    const { text = 'Hello, world!', sourceLang = 'en', targetLang = 'pt' } = req.body;
    
    const service = new LocalTranslationService();
    const result = await service.translate(text, sourceLang, targetLang, []);
    
    res.json({
      success: true,
      result,
      message: 'Local translation is working!'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/local-translation/stats - Get usage statistics
router.get('/stats', async (req, res, next) => {
  try {
    const service = new LocalTranslationService();
    const stats = service.getStats();
    
    res.json({
      stats,
      status: libreTranslateManager.getStatus()
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/local-translation/containers - Get container information (debugging)
router.get('/containers', async (req, res, next) => {
  try {
    const containerInfo = await libreTranslateManager.getContainerInfo();
    const dockerRunning = await libreTranslateManager.isDockerRunning();
    const portInUse = await libreTranslateManager.isPortInUse();
    
    res.json({
      docker: {
        available: await libreTranslateManager.isDockerAvailable(),
        running: dockerRunning
      },
      port: portInUse,
      containers: containerInfo
    });
  } catch (error) {
    next(error);
  }
});

export default router;
