/**
 * API Plans Routes
 * Provides API plan information and recommendations
 */

import express from 'express';
import ApiPlansService from '../services/apiPlansService.js';

const router = express.Router();

// Get API plans information
router.get('/plans', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const plans = await ApiPlansService.getApiPlans(forceRefresh);
    res.json(plans);
  } catch (error) {
    console.error('Error fetching API plans:', error);
    // Return defaults on error
    res.json(ApiPlansService.loadCachedPlans() || {});
  }
});

// Get recommendations for a document
router.post('/recommend', async (req, res) => {
  try {
    const { characterCount, fileSize, hasGlossary } = req.body;
    
    if (!characterCount) {
      return res.status(400).json({ error: 'characterCount is required' });
    }
    
    const recommendations = ApiPlansService.recommendApi(
      fileSize || 0,
      characterCount,
      hasGlossary || false
    );
    
    res.json({ recommendations });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

