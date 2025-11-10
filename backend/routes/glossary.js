import express from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import Glossary from '../models/Glossary.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Get all glossary entries
router.get('/', (req, res) => {
  try {
    const { sourceLanguage, targetLanguage } = req.query;
    const entries = Glossary.getAll(sourceLanguage, targetLanguage);
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add glossary entry
router.post('/', (req, res) => {
  try {
    const { sourceTerm, targetTerm, sourceLanguage, targetLanguage, category } = req.body;
    
    if (!sourceTerm || !targetTerm || !sourceLanguage || !targetLanguage) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = Glossary.add(sourceTerm, targetTerm, sourceLanguage, targetLanguage, category);
    res.json({ id, message: 'Glossary entry added' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete glossary entry
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    Glossary.delete(id);
    res.json({ message: 'Glossary entry deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Import glossary from CSV
router.post('/import', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const csvContent = req.file.buffer.toString('utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    const entries = records.map(record => ({
      source_term: record.source_term || record.sourceTerm || record['Source Term'],
      target_term: record.target_term || record.targetTerm || record['Target Term'],
      source_language: record.source_language || record.sourceLanguage || record['Source Language'] || 'en',
      target_language: record.target_language || record.targetLanguage || record['Target Language'] || 'es',
      category: record.category || record.Category || null
    }));

    Glossary.importFromArray(entries);

    res.json({ 
      message: 'Glossary imported successfully',
      count: entries.length 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export glossary to CSV
router.get('/export', (req, res) => {
  try {
    const { sourceLanguage, targetLanguage } = req.query;
    const entries = Glossary.getAll(sourceLanguage, targetLanguage);

    const csv = stringify(entries, {
      header: true,
      columns: [
        { key: 'source_term', header: 'Source Term' },
        { key: 'target_term', header: 'Target Term' },
        { key: 'source_language', header: 'Source Language' },
        { key: 'target_language', header: 'Target Language' },
        { key: 'category', header: 'Category' }
      ]
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=glossary.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search glossary
router.get('/search', (req, res) => {
  try {
    const { term, sourceLanguage, targetLanguage } = req.query;
    
    if (!term || !sourceLanguage || !targetLanguage) {
      return res.status(400).json({ error: 'Missing search parameters' });
    }

    const result = Glossary.search(term, sourceLanguage, targetLanguage);
    res.json(result || { message: 'Term not found in glossary' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear all glossary entries
router.delete('/', (req, res) => {
  try {
    Glossary.deleteAll();
    res.json({ message: 'All glossary entries deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

