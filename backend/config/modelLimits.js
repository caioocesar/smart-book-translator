/**
 * Model-specific limits and recommendations
 * These values are based on real-world testing with offline models
 */

const MODEL_LIMITS = {
  // Validation models (smaller, focused on issue detection)
  'qwen2.5:7b': {
    contextWindow: 4096,
    recommendedInputTokens: 2000,
    maxOutputTokens: 200,  // Validation outputs are short
    timeout: 60000,
    description: 'Semantic validation - detects grammar & style issues'
  },
  'qwen2.5:14b': {
    contextWindow: 8192,
    recommendedInputTokens: 3000,
    maxOutputTokens: 300,
    timeout: 90000,
    description: 'Larger validation model - better accuracy'
  },
  
  // Rewrite models (medium-sized, for targeted corrections)
  'llama3.2:3b': {
    contextWindow: 4096,
    recommendedInputTokens: 1200,  // Reduced for reliability
    maxOutputTokens: 2000,         // Reduced - struggles with longer outputs
    timeout: 120000,
    description: 'Fast rewrite - best for small chunks',
    limitations: {
      maxHtmlChunkSize: 1500,      // Struggles with HTML above this
      warning: 'NOT recommended for HTML content or chunks >1500 tokens. Use llama3.1:8b instead.'
    }
  },
  'llama3.1:8b': {
    contextWindow: 8192,
    recommendedInputTokens: 2400,
    maxOutputTokens: 4096,
    timeout: 120000,
    description: 'Balanced rewrite - good quality/speed ratio (RECOMMENDED)',
    limitations: {
      maxHtmlChunkSize: 2400,
      note: 'Best choice for HTML content and general rewriting'
    }
  },
  'llama3.1:70b': {
    contextWindow: 8192,
    recommendedInputTokens: 2000,
    maxOutputTokens: 4096,
    timeout: 180000,
    description: 'High-quality rewrite - slower but best results'
  },
  
  // Technical check models (final polish)
  'mistral:7b': {
    contextWindow: 8192,
    recommendedInputTokens: 2400,
    maxOutputTokens: 4096,
    timeout: 120000,
    description: 'Technical review - grammar & consistency'
  },
  'mistral-nemo:12b': {
    contextWindow: 8192,
    recommendedInputTokens: 3000,
    maxOutputTokens: 4096,
    timeout: 150000,
    description: 'Advanced technical review - very stable'
  }
};

/**
 * Get recommended chunk size for a given pipeline configuration
 * @param {Object} pipeline - Pipeline configuration
 * @returns {number} Recommended chunk size in tokens
 */
export function getRecommendedChunkSize(pipeline) {
  if (!pipeline) return 2400; // Default safe value
  
  // Find the most restrictive model in the enabled pipeline
  const enabledModels = [];
  
  if (pipeline.validation?.enabled && pipeline.validation?.model) {
    enabledModels.push(pipeline.validation.model);
  }
  if (pipeline.rewrite?.enabled && pipeline.rewrite?.model) {
    enabledModels.push(pipeline.rewrite.model);
  }
  if (pipeline.technical?.enabled && pipeline.technical?.model) {
    enabledModels.push(pipeline.technical.model);
  }
  
  if (enabledModels.length === 0) {
    return 2400; // Default if no pipeline enabled
  }
  
  // Find the smallest recommended input size among enabled models
  const recommendations = enabledModels
    .map(model => MODEL_LIMITS[model]?.recommendedInputTokens)
    .filter(val => val != null);
  
  if (recommendations.length === 0) {
    return 2400; // Fallback if models not found
  }
  
  return Math.min(...recommendations);
}

/**
 * Get model info by name
 * @param {string} modelName - Model identifier
 * @returns {Object|null} Model limits and info
 */
export function getModelInfo(modelName) {
  return MODEL_LIMITS[modelName] || null;
}

/**
 * Get all available models by role
 * @param {string} role - 'validation', 'rewrite', or 'technical'
 * @returns {Array} Array of model names suitable for the role
 */
export function getModelsByRole(role) {
  const roleMapping = {
    validation: ['qwen2.5:7b', 'qwen2.5:14b'],
    rewrite: ['llama3.2:3b', 'llama3.1:8b', 'llama3.1:70b'],
    technical: ['mistral:7b', 'mistral-nemo:12b']
  };
  
  return roleMapping[role] || [];
}

/**
 * Validate if a chunk size is appropriate for the pipeline
 * @param {number} chunkSize - Chunk size in tokens
 * @param {Object} pipeline - Pipeline configuration
 * @returns {Object} Validation result with warnings
 */
export function validateChunkSize(chunkSize, pipeline) {
  const recommended = getRecommendedChunkSize(pipeline);
  const warnings = [];
  
  if (chunkSize > recommended * 1.5) {
    warnings.push({
      type: 'too-large',
      message: `Chunk size (${chunkSize}) exceeds recommended size (${recommended}) by 50%+. May cause timeouts or truncation.`,
      severity: 'warning'
    });
  }
  
  if (chunkSize > recommended * 2) {
    warnings.push({
      type: 'critical',
      message: `Chunk size (${chunkSize}) is more than double the recommended size (${recommended}). High risk of failure.`,
      severity: 'error'
    });
  }
  
  if (chunkSize < 500) {
    warnings.push({
      type: 'too-small',
      message: `Chunk size (${chunkSize}) is very small. Context may be insufficient for quality translation.`,
      severity: 'info'
    });
  }
  
  return {
    isValid: warnings.filter(w => w.severity === 'error').length === 0,
    recommended,
    warnings
  };
}

export default MODEL_LIMITS;
