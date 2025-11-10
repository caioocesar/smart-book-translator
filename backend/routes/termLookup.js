import express from 'express';
import TermLookupService from '../services/termLookup.js';
import Glossary from '../models/Glossary.js';

const router = express.Router();

// Search for a term online
router.get('/search', async (req, res) => {
  try {
    const { term, sourceLanguage, targetLanguage } = req.query;

    if (!term || !sourceLanguage || !targetLanguage) {
      return res.status(400).json({ 
        error: 'Missing required parameters: term, sourceLanguage, targetLanguage' 
      });
    }

    // First check local glossary
    const glossaryResult = Glossary.search(term, sourceLanguage, targetLanguage);

    // Then search online
    const onlineResults = await TermLookupService.searchTerm(
      term, 
      sourceLanguage, 
      targetLanguage
    );

    res.json({
      term,
      inGlossary: !!glossaryResult,
      glossaryTranslation: glossaryResult?.target_term || null,
      onlineResults: onlineResults.suggestions,
      sources: onlineResults.sources
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search multiple terms
router.post('/search-batch', async (req, res) => {
  try {
    const { terms, sourceLanguage, targetLanguage } = req.body;

    if (!terms || !Array.isArray(terms) || !sourceLanguage || !targetLanguage) {
      return res.status(400).json({ 
        error: 'Missing required parameters: terms (array), sourceLanguage, targetLanguage' 
      });
    }

    const results = await TermLookupService.searchMultipleTerms(
      terms,
      sourceLanguage,
      targetLanguage
    );

    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add online search result to glossary
router.post('/add-to-glossary', async (req, res) => {
  try {
    const { sourceTerm, targetTerm, sourceLanguage, targetLanguage, source } = req.body;

    if (!sourceTerm || !targetTerm || !sourceLanguage || !targetLanguage) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const id = Glossary.add(
      sourceTerm,
      targetTerm,
      sourceLanguage,
      targetLanguage,
      `From: ${source || 'Online Search'}`
    );

    res.json({ 
      id, 
      message: 'Term added to glossary',
      entry: {
        sourceTerm,
        targetTerm,
        sourceLanguage,
        targetLanguage
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

