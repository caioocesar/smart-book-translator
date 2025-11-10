/**
 * API Plans Service
 * Fetches and caches API plan information from official websites
 * Provides recommendations based on document size and API limits
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_FILE = path.join(__dirname, '..', 'data', 'api-plans-cache.json');
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Default API plan information (fallback if fetch fails)
const DEFAULT_PLANS = {
  deepl: {
    free: {
      name: 'DeepL Free',
      monthlyLimit: 500000, // characters per month
      requestsPerMinute: 20,
      supportsGlossary: false,
      supportsHtml: true,
      cost: 0
    },
    starter: {
      name: 'DeepL Pro Starter',
      monthlyLimit: 1000000, // 1M characters
      requestsPerMinute: 50,
      supportsGlossary: true,
      supportsHtml: true,
      cost: 5.99 // EUR/month
    },
    advanced: {
      name: 'DeepL Pro Advanced',
      monthlyLimit: 5000000, // 5M characters
      requestsPerMinute: 100,
      supportsGlossary: true,
      supportsHtml: true,
      cost: 29.99 // EUR/month
    },
    ultimate: {
      name: 'DeepL Pro Ultimate',
      monthlyLimit: 20000000, // 20M characters
      requestsPerMinute: 200,
      supportsGlossary: true,
      supportsHtml: true,
      cost: 99.99 // EUR/month
    }
  },
  openai: {
    gpt35turbo: {
      name: 'GPT-3.5 Turbo',
      contextWindow: 16000, // tokens
      tokensPerMinute: 40000,
      requestsPerMinute: 3500,
      inputCost: 0.0005, // per 1K tokens
      outputCost: 0.0015, // per 1K tokens
      supportsGlossary: false,
      supportsHtml: false
    },
    gpt4: {
      name: 'GPT-4',
      contextWindow: 8192, // tokens
      tokensPerMinute: 40000,
      requestsPerMinute: 500,
      inputCost: 0.03, // per 1K tokens
      outputCost: 0.06, // per 1K tokens
      supportsGlossary: false,
      supportsHtml: false
    },
    gpt4turbo: {
      name: 'GPT-4 Turbo',
      contextWindow: 128000, // tokens
      tokensPerMinute: 200000,
      requestsPerMinute: 5000,
      inputCost: 0.01, // per 1K tokens
      outputCost: 0.03, // per 1K tokens
      supportsGlossary: false,
      supportsHtml: false
    },
    gpt4o: {
      name: 'GPT-4o',
      contextWindow: 128000, // tokens
      tokensPerMinute: 200000,
      requestsPerMinute: 5000,
      inputCost: 0.0025, // per 1K tokens
      outputCost: 0.01, // per 1K tokens
      supportsGlossary: false,
      supportsHtml: false
    },
    gpt5: {
      name: 'GPT-5',
      contextWindow: 200000, // tokens (estimated - update when official specs available)
      tokensPerMinute: 300000, // estimated
      requestsPerMinute: 10000, // estimated
      inputCost: 0.005, // per 1K tokens (estimated - update when official pricing available)
      outputCost: 0.015, // per 1K tokens (estimated)
      supportsGlossary: false,
      supportsHtml: false
    }
  },
  google: {
    free: {
      name: 'Google Translate (Free)',
      monthlyLimit: null, // unlimited (but rate limited)
      requestsPerMinute: null, // undocumented
      supportsGlossary: false,
      supportsHtml: false,
      cost: 0,
      warning: 'May be rate-limited for heavy usage'
    }
  }
};

class ApiPlansService {
  /**
   * Load cached plans or return defaults
   */
  static loadCachedPlans() {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const cacheData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
        const now = Date.now();
        
        // Check if cache is still valid
        if (cacheData.timestamp && (now - cacheData.timestamp) < CACHE_DURATION) {
          return cacheData.plans;
        }
      }
    } catch (error) {
      console.warn('Failed to load cached API plans:', error.message);
    }
    
    return DEFAULT_PLANS;
  }

  /**
   * Save plans to cache
   */
  static saveCachedPlans(plans) {
    try {
      const cacheDir = path.dirname(CACHE_FILE);
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
      
      fs.writeFileSync(CACHE_FILE, JSON.stringify({
        timestamp: Date.now(),
        plans
      }, null, 2));
    } catch (error) {
      console.warn('Failed to save cached API plans:', error.message);
    }
  }

  /**
   * Fetch OpenAI models dynamically from API
   */
  static async fetchOpenAIModels(apiKey = null) {
    const models = { ...DEFAULT_PLANS.openai };
    
    // If no API key provided, return defaults
    if (!apiKey) {
      return models;
    }

    try {
      // Fetch available models from OpenAI API
      const response = await axios.get('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      // Parse models and extract GPT models
      const availableModels = response.data.data || [];
      const gptModels = availableModels
        .filter(m => m.id && (m.id.startsWith('gpt-') || m.id.includes('gpt')))
        .map(m => m.id)
        .sort();

      console.log(`📋 Found ${gptModels.length} OpenAI models via API:`, gptModels);

      // Update models based on what's available
      // Check for GPT-5
      if (gptModels.some(m => m.includes('gpt-5') || m.includes('gpt5'))) {
        const gpt5Model = gptModels.find(m => m.includes('gpt-5') || m.includes('gpt5'));
        models.gpt5 = {
          name: 'GPT-5',
          contextWindow: 200000, // Estimated - update when official specs available
          tokensPerMinute: 300000, // Estimated
          requestsPerMinute: 10000, // Estimated
          inputCost: 0.005, // Estimated - update when official pricing available
          outputCost: 0.015, // Estimated
          supportsGlossary: false,
          supportsHtml: false,
          modelId: gpt5Model
        };
      }

      // Check for GPT-4o-mini
      if (gptModels.some(m => m.includes('gpt-4o-mini'))) {
        models.gpt4omini = {
          name: 'GPT-4o Mini',
          contextWindow: 128000,
          tokensPerMinute: 200000,
          requestsPerMinute: 5000,
          inputCost: 0.00015,
          outputCost: 0.0006,
          supportsGlossary: false,
          supportsHtml: false
        };
      }

    } catch (error) {
      console.warn('⚠️  Failed to fetch OpenAI models from API:', error.message);
      // Return defaults on error
    }

    return models;
  }

  /**
   * Fetch API plan information from websites
   * This is a placeholder - in production, you might scrape or use official APIs
   */
  static async fetchApiPlans(openaiApiKey = null) {
    const plans = { ...DEFAULT_PLANS };
    
    // Fetch OpenAI models dynamically if API key is provided
    if (openaiApiKey) {
      try {
        plans.openai = await this.fetchOpenAIModels(openaiApiKey);
        console.log('✅ OpenAI models fetched dynamically');
      } catch (error) {
        console.warn('⚠️  Failed to fetch OpenAI models:', error.message);
      }
    }
    
    // Try to fetch updated information (placeholder for future implementation)
    // For now, we'll use the defaults which are based on current documentation
    
    this.saveCachedPlans(plans);
    return plans;
  }

  /**
   * Get API plans (cached or fresh)
   */
  static async getApiPlans(forceRefresh = false, openaiApiKey = null) {
    if (forceRefresh) {
      return await this.fetchApiPlans(openaiApiKey);
    }
    
    const cached = this.loadCachedPlans();
    if (cached) {
      // If OpenAI API key provided and we have cached plans, try to update OpenAI models
      if (openaiApiKey) {
        try {
          const updatedOpenAIModels = await this.fetchOpenAIModels(openaiApiKey);
          cached.openai = { ...cached.openai, ...updatedOpenAIModels };
          this.saveCachedPlans(cached);
        } catch (error) {
          console.warn('Failed to update OpenAI models:', error.message);
        }
      }
      return cached;
    }
    
    return await this.fetchApiPlans(openaiApiKey);
  }

  /**
   * Recommend API and model based on document size
   */
  static recommendApi(documentSize, characterCount, hasGlossary = false) {
    const recommendations = [];
    
    // DeepL recommendations - always show DeepL as an option
    const deeplFree = DEFAULT_PLANS.deepl.free;
    const deeplStarter = DEFAULT_PLANS.deepl.starter;
    const deeplAdvanced = DEFAULT_PLANS.deepl.advanced;
    
    // Always recommend DeepL Free if document fits
    if (characterCount <= deeplFree.monthlyLimit) {
      recommendations.push({
        provider: 'deepl',
        plan: 'free',
        model: 'DeepL Free',
        reason: `Document fits within free tier (${(characterCount / deeplFree.monthlyLimit * 100).toFixed(1)}% of limit)`,
        estimatedChunks: Math.ceil(characterCount / 4000),
        recommendedChunkSize: 4000,
        supportsGlossary: false,
        supportsHtml: true,
        cost: 0
      });
    }
    
    // Always recommend DeepL Pro Starter if document fits
    if (characterCount <= deeplStarter.monthlyLimit) {
      recommendations.push({
        provider: 'deepl',
        plan: 'starter',
        model: 'DeepL Pro Starter',
        reason: `Document fits within starter tier (${(characterCount / deeplStarter.monthlyLimit * 100).toFixed(1)}% of limit)`,
        estimatedChunks: Math.ceil(characterCount / 5000),
        recommendedChunkSize: 5000,
        supportsGlossary: true,
        supportsHtml: true,
        cost: 5.99
      });
    }
    
    // Always recommend DeepL Pro Advanced for larger documents
    if (characterCount <= deeplAdvanced.monthlyLimit) {
      recommendations.push({
        provider: 'deepl',
        plan: 'advanced',
        model: 'DeepL Pro Advanced',
        reason: `Best for large documents (${(characterCount / deeplAdvanced.monthlyLimit * 100).toFixed(1)}% of limit)`,
        estimatedChunks: Math.ceil(characterCount / 6000),
        recommendedChunkSize: 6000,
        supportsGlossary: true,
        supportsHtml: true,
        cost: 29.99
      });
    } else {
      // Even if document exceeds limits, show DeepL as option (user might have higher tier)
      recommendations.push({
        provider: 'deepl',
        plan: 'ultimate',
        model: 'DeepL Pro Ultimate',
        reason: `Best quality with highest limits (20M chars/month)`,
        estimatedChunks: Math.ceil(characterCount / 8000),
        recommendedChunkSize: 8000,
        supportsGlossary: true,
        supportsHtml: true,
        cost: 99.99
      });
    }
    
    // OpenAI recommendations - get current plans (may include dynamically fetched models)
    const currentPlans = this.loadCachedPlans() || DEFAULT_PLANS;
    const openaiPlans = currentPlans.openai || DEFAULT_PLANS.openai;
    
    // Estimate tokens (rough: 1 token ≈ 4 characters)
    const estimatedTokens = Math.ceil(characterCount / 4);
    
    // GPT-5 (if available)
    if (openaiPlans.gpt5) {
      const gpt5 = openaiPlans.gpt5;
      const estimatedCost5 = (estimatedTokens / 1000) * (gpt5.inputCost + gpt5.outputCost);
      recommendations.push({
        provider: 'openai',
        plan: 'gpt-5',
        model: 'GPT-5',
        reason: `Latest model with best quality (estimated cost: $${estimatedCost5.toFixed(2)})`,
        estimatedChunks: Math.ceil(characterCount / 10000),
        recommendedChunkSize: 10000,
        supportsGlossary: false,
        supportsHtml: false,
        cost: estimatedCost5
      });
    }
    
    // GPT-4o
    if (openaiPlans.gpt4o) {
      const gpt4o = openaiPlans.gpt4o;
      const estimatedCost4o = (estimatedTokens / 1000) * (gpt4o.inputCost + gpt4o.outputCost);
      recommendations.push({
        provider: 'openai',
        plan: 'gpt-4o',
        model: 'GPT-4o',
        reason: `Best quality with large context window (estimated cost: $${estimatedCost4o.toFixed(2)})`,
        estimatedChunks: Math.ceil(characterCount / 8000),
        recommendedChunkSize: 8000,
        supportsGlossary: false,
        supportsHtml: false,
        cost: estimatedCost4o
      });
    }
    
    // GPT-4 Turbo
    if (openaiPlans.gpt4turbo) {
      const gpt4turbo = openaiPlans.gpt4turbo;
      const estimatedCost4t = (estimatedTokens / 1000) * (gpt4turbo.inputCost + gpt4turbo.outputCost);
      recommendations.push({
        provider: 'openai',
        plan: 'gpt-4-turbo',
        model: 'GPT-4 Turbo',
        reason: `High quality with large context (estimated cost: $${estimatedCost4t.toFixed(2)})`,
        estimatedChunks: Math.ceil(characterCount / 8000),
        recommendedChunkSize: 8000,
        supportsGlossary: false,
        supportsHtml: false,
        cost: estimatedCost4t
      });
    }
    
    // GPT-3.5 Turbo (always available as fallback)
    if (openaiPlans.gpt35turbo) {
      const gpt35 = openaiPlans.gpt35turbo;
      const estimatedCost = (estimatedTokens / 1000) * (gpt35.inputCost + gpt35.outputCost);
      if (estimatedTokens <= gpt35.contextWindow) {
        recommendations.push({
          provider: 'openai',
          plan: 'gpt-3.5-turbo',
          model: 'GPT-3.5 Turbo',
          reason: `Fast and cost-effective (estimated cost: $${estimatedCost.toFixed(2)})`,
          estimatedChunks: Math.ceil(characterCount / 4000),
          recommendedChunkSize: 4000,
          supportsGlossary: false,
          supportsHtml: false,
          cost: estimatedCost
        });
      }
    }
    
    // Google Translate (always available)
    recommendations.push({
      provider: 'google',
      plan: 'free',
      model: 'Google Translate (Free)',
      reason: 'Free but may be rate-limited',
      estimatedChunks: Math.ceil(characterCount / 3000),
      recommendedChunkSize: 3000,
      supportsGlossary: false,
      supportsHtml: false,
      cost: 0,
      warning: 'May be blocked after heavy usage'
    });
    
    // Sort by cost (free first), then by quality
    recommendations.sort((a, b) => {
      if (a.cost === 0 && b.cost > 0) return -1;
      if (b.cost === 0 && a.cost > 0) return 1;
      return a.cost - b.cost;
    });
    
    return recommendations;
  }
}

export default ApiPlansService;

