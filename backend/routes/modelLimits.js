import express from 'express';
import MODEL_LIMITS, { getRecommendedChunkSize, getModelInfo, getModelsByRole, validateChunkSize } from '../config/modelLimits.js';

const router = express.Router();

/**
 * GET /api/model-limits
 * Get all model limits and recommendations
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    models: MODEL_LIMITS
  });
});

/**
 * GET /api/model-limits/model/:modelName
 * Get specific model info
 */
router.get('/model/:modelName', (req, res) => {
  const { modelName } = req.params;
  const info = getModelInfo(modelName);
  
  if (!info) {
    return res.status(404).json({
      success: false,
      error: `Model '${modelName}' not found in limits database`
    });
  }
  
  res.json({
    success: true,
    model: modelName,
    info
  });
});

/**
 * GET /api/model-limits/role/:role
 * Get models available for a specific role
 */
router.get('/role/:role', (req, res) => {
  const { role } = req.params;
  const models = getModelsByRole(role);
  
  res.json({
    success: true,
    role,
    models: models.map(modelName => ({
      name: modelName,
      info: getModelInfo(modelName)
    }))
  });
});

/**
 * POST /api/model-limits/recommend-chunk-size
 * Get recommended chunk size for a pipeline configuration
 * Body: { pipeline: { validation: {...}, rewrite: {...}, technical: {...} } }
 */
router.post('/recommend-chunk-size', (req, res) => {
  try {
    const { pipeline } = req.body;
    const recommended = getRecommendedChunkSize(pipeline);
    
    res.json({
      success: true,
      recommendedChunkSize: recommended,
      pipeline
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/model-limits/validate-chunk-size
 * Validate if a chunk size is appropriate
 * Body: { chunkSize: 2400, pipeline: {...} }
 */
router.post('/validate-chunk-size', (req, res) => {
  try {
    const { chunkSize, pipeline } = req.body;
    const validation = validateChunkSize(chunkSize, pipeline);
    
    res.json({
      success: true,
      validation
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
