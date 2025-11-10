import express from 'express';
import Settings from '../models/Settings.js';
import TranslationService from '../services/translationService.js';
import { ApiUsage } from '../models/TranslationJob.js';

const router = express.Router();

// Get all settings
router.get('/', (req, res) => {
  try {
    const settings = Settings.getAll();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single setting
router.get('/:key', (req, res) => {
  try {
    const { key } = req.params;
    const value = Settings.get(key);
    res.json({ key, value });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Set setting
router.post('/', (req, res) => {
  try {
    const { key, value } = req.body;
    
    if (!key) {
      return res.status(400).json({ error: 'Key is required' });
    }

    Settings.set(key, value);
    res.json({ message: 'Setting saved', key, value });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete setting
router.delete('/:key', (req, res) => {
  try {
    const { key } = req.params;
    Settings.delete(key);
    res.json({ message: 'Setting deleted', key });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test API credentials
router.post('/test-api', async (req, res) => {
  try {
    const { provider, apiKey, options } = req.body;

    if (!provider) {
      return res.status(400).json({ error: 'Provider is required' });
    }

    // Google doesn't need an API key
    if (provider === 'google' || provider === 'google-translate') {
      return res.json({
        success: true,
        message: 'Google Translate is available (no API key needed)',
        testTranslation: 'Hola'
      });
    }

    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }

    // For OpenAI, ensure we have a valid model option
    let testOptions = options || {};
    if ((provider === 'openai' || provider === 'chatgpt') && !testOptions.model) {
      testOptions.model = 'gpt-3.5-turbo'; // Default to accessible model
    }

    const service = new TranslationService(provider, apiKey, testOptions);
    
    // Test with a simple translation
    const result = await service.translate('Hello', 'en', 'es');
    
    res.json({
      success: true,
      message: 'API credentials are valid',
      testTranslation: result.translatedText
    });
  } catch (error) {
    // Return proper error message
    const errorMessage = error.message || 'Test failed';
    console.error('API test error:', errorMessage);
    res.status(400).json({
      success: false,
      error: errorMessage
    });
  }
});

// Get available OpenAI models for the user
router.post('/check-models', async (req, res) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }

    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey });

    // Try to get available models
    const availableModels = [];
    const modelsToTest = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o'];

    for (const model of modelsToTest) {
      try {
        // Try a minimal test request
        await openai.chat.completions.create({
          model: model,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5
        });
        availableModels.push(model);
      } catch (err) {
        // Model not available or no access
        if (err.status !== 404 && err.status !== 401) {
          // If it's not a 404 or 401, might be rate limit - assume available
          availableModels.push(model);
        }
      }
    }

    // Always include gpt-3.5-turbo as fallback
    if (!availableModels.includes('gpt-3.5-turbo')) {
      availableModels.unshift('gpt-3.5-turbo');
    }

    res.json({
      available: availableModels,
      all: modelsToTest
    });
  } catch (error) {
    // On error, return default models
    res.json({
      available: ['gpt-3.5-turbo'],
      all: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o'],
      error: error.message
    });
  }
});

// Get API usage statistics
router.get('/usage/:provider', (req, res) => {
  try {
    const { provider } = req.params;
    const { days } = req.query;

    const today = ApiUsage.getUsageToday(provider);
    const history = ApiUsage.getUsageHistory(provider, days ? parseInt(days) : 30);

    res.json({
      provider,
      today,
      history
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check API limits
router.post('/check-limits', async (req, res) => {
  try {
    const { provider, apiKey, options } = req.body;

    if (!provider || !apiKey) {
      return res.status(400).json({ error: 'Provider and API key are required' });
    }

    const service = new TranslationService(provider, apiKey, options);
    const limits = await service.checkLimits();

    res.json(limits);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;



