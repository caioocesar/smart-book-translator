import express from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import Glossary from '../models/Glossary.js';
import Logger from '../utils/logger.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Common language codes for validation
const VALID_LANGUAGE_CODES = new Set([
  'en', 'pt', 'es', 'fr', 'de', 'it', 'ja', 'zh', 'ru', 'ar', 'ko', 'hi', 'nl', 'pl', 'tr', 'sv', 'da', 'fi', 'no', 'cs', 'hu', 'ro', 'el', 'th', 'vi', 'id', 'uk', 'he', 'bg', 'hr', 'sk', 'sl', 'et', 'lv', 'lt', 'mt', 'ga', 'cy', 'eu', 'ca', 'gl', 'is', 'mk', 'sq', 'sr', 'bs', 'be', 'ka', 'hy', 'az', 'kk', 'ky', 'uz', 'mn', 'ne', 'si', 'my', 'km', 'lo', 'ka', 'am', 'ti', 'sw', 'zu', 'af', 'xh', 'yo', 'ig', 'ha', 'so', 'mg', 'rw', 'sn', 'ny', 'st', 'tn', 've', 'ts', 'ss', 'nr', 'nso', 'zu', 'xh', 'af', 'st', 'tn', 've', 'ts', 'ss', 'nr', 'nso'
]);

/**
 * Intelligent column name detection
 * Handles various formats: source_term, Source Term, sourceTerm, termo_origem, Termo Origem
 */
function detectColumnMapping(headers) {
  const mapping = {
    source_term: null,
    target_term: null,
    source_language: null,
    target_language: null,
    category: null
  };

  // Normalize headers for matching
  const normalizedHeaders = headers.map(h => ({
    original: h,
    lower: h.toLowerCase().trim(),
    noSpaces: h.toLowerCase().replace(/\s+/g, '_'),
    noUnderscores: h.toLowerCase().replace(/_/g, ' ')
  }));

  // Patterns to match for each field
  const patterns = {
    source_term: [
      'source_term', 'sourceterm', 'source term', 'termo_origem', 'termo origem', 'origem',
      'source', 'from', 'de', 'from_term', 'fromterm', 'from term', 'original', 'original_term'
    ],
    target_term: [
      'target_term', 'targetterm', 'target term', 'termo_destino', 'termo destino', 'destino',
      'target', 'to', 'para', 'to_term', 'toterm', 'to term', 'translated', 'translated_term', 'traducao', 'tradução'
    ],
    source_language: [
      'source_language', 'sourcelanguage', 'source language', 'idioma_origem', 'idioma origem',
      'source_lang', 'sourcelang', 'source lang', 'from_language', 'fromlanguage', 'from language',
      'from_lang', 'fromlang', 'from lang', 'lang_source', 'langsource', 'lang source', 'idioma_origem', 'idioma origem'
    ],
    target_language: [
      'target_language', 'targetlanguage', 'target language', 'idioma_destino', 'idioma destino',
      'target_lang', 'targetlang', 'target lang', 'to_language', 'tolanguage', 'to language',
      'to_lang', 'tolang', 'to lang', 'lang_target', 'langtarget', 'lang target', 'idioma_destino', 'idioma destino'
    ],
    category: [
      'category', 'categoria', 'cat', 'type', 'tipo', 'tag', 'tags', 'group', 'grupo', 'class', 'classe'
    ]
  };

  // Find matches for each field
  for (const [field, fieldPatterns] of Object.entries(patterns)) {
    for (const normalized of normalizedHeaders) {
      for (const pattern of fieldPatterns) {
        if (normalized.lower === pattern || 
            normalized.noSpaces === pattern || 
            normalized.noUnderscores === pattern ||
            normalized.lower.includes(pattern) ||
            pattern.includes(normalized.lower)) {
          mapping[field] = normalized.original;
          break;
        }
      }
      if (mapping[field]) break;
    }
  }

  // Auto-detect language columns by checking if values look like language codes
  if (!mapping.source_language || !mapping.target_language) {
    for (const normalized of normalizedHeaders) {
      if (!mapping.source_language && (
        normalized.lower.includes('lang') || 
        normalized.lower.includes('idioma') ||
        normalized.lower.includes('language')
      )) {
        // Check if this column might be source or target language
        // We'll validate this later when we see the data
        if (!mapping.source_language) {
          mapping.source_language = normalized.original;
        } else if (!mapping.target_language) {
          mapping.target_language = normalized.original;
        }
      }
    }
  }

  return mapping;
}

/**
 * Validate a glossary entry
 */
function validateEntry(entry, rowIndex) {
  const errors = [];
  
  // Required fields
  if (!entry.source_term || String(entry.source_term).trim() === '') {
    errors.push('Missing source_term');
  }
  if (!entry.target_term || String(entry.target_term).trim() === '') {
    errors.push('Missing target_term');
  }
  if (!entry.source_language || String(entry.source_language).trim() === '') {
    errors.push('Missing source_language');
  }
  if (!entry.target_language || String(entry.target_language).trim() === '') {
    errors.push('Missing target_language');
  }

  // Validate language codes (if provided)
  if (entry.source_language) {
    const sourceLang = String(entry.source_language).trim().toLowerCase();
    if (!VALID_LANGUAGE_CODES.has(sourceLang)) {
      errors.push(`Invalid source_language code: '${entry.source_language}'`);
    }
  }
  if (entry.target_language) {
    const targetLang = String(entry.target_language).trim().toLowerCase();
    if (!VALID_LANGUAGE_CODES.has(targetLang)) {
      errors.push(`Invalid target_language code: '${entry.target_language}'`);
    }
  }

  return errors;
}

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

    // Try to detect encoding (UTF-8, UTF-8 BOM)
    let csvContent = req.file.buffer.toString('utf-8');
    // Remove BOM if present
    if (csvContent.charCodeAt(0) === 0xFEFF) {
      csvContent = csvContent.slice(1);
    }

    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true, // Allow inconsistent column counts
      relax_quotes: true // Allow unquoted fields
    });

    if (records.length === 0) {
      return res.status(400).json({ error: 'CSV file is empty or contains no valid rows' });
    }

    // Detect column mapping intelligently
    const headers = Object.keys(records[0]);
    const columnMapping = detectColumnMapping(headers);
    
    Logger.logInfo('glossary', 'CSV column mapping detected', {
      mapping: columnMapping,
      headers: headers
    });

    // Validate that we found required columns
    const missingColumns = [];
    if (!columnMapping.source_term) missingColumns.push('source_term');
    if (!columnMapping.target_term) missingColumns.push('target_term');
    if (!columnMapping.source_language) missingColumns.push('source_language');
    if (!columnMapping.target_language) missingColumns.push('target_language');

    if (missingColumns.length > 0) {
      return res.status(400).json({ 
        error: `Missing required columns: ${missingColumns.join(', ')}. Found columns: ${headers.join(', ')}` 
      });
    }

    // Process entries with validation
    const entries = [];
    const validationErrors = [];
    let duplicates = 0;

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowIndex = i + 2; // +2 because CSV is 1-indexed and has header row

      // Map columns using detected mapping
      const entry = {
        source_term: record[columnMapping.source_term] || null,
        target_term: record[columnMapping.target_term] || null,
        source_language: record[columnMapping.source_language] || null,
        target_language: record[columnMapping.target_language] || null,
        category: columnMapping.category ? (record[columnMapping.category] || null) : null
      };

      // Trim whitespace
      if (entry.source_term) entry.source_term = String(entry.source_term).trim();
      if (entry.target_term) entry.target_term = String(entry.target_term).trim();
      if (entry.source_language) entry.source_language = String(entry.source_language).trim().toLowerCase();
      if (entry.target_language) entry.target_language = String(entry.target_language).trim().toLowerCase();
      if (entry.category) entry.category = String(entry.category).trim() || null;

      // Validate entry
      const errors = validateEntry(entry, rowIndex);
      if (errors.length > 0) {
        validationErrors.push({
          row: rowIndex,
          errors: errors.join('; ')
        });
        continue;
      }

      entries.push(entry);
    }

    // Import valid entries
    let importResult = { successful: 0, failed: 0, errors: [], duplicates: 0 };
    
    if (entries.length > 0) {
      try {
        importResult = Glossary.importFromArray(entries);
        // Ensure errors is always an array
        if (!Array.isArray(importResult.errors)) {
          importResult.errors = [];
        }
        // Count duplicates (entries that were updated, not inserted)
        duplicates = importResult.duplicates || 0;
      } catch (error) {
        Logger.logError('glossary', 'Failed to import entries', error, {
          entryCount: entries.length
        });
        importResult.failed = entries.length;
        if (!Array.isArray(importResult.errors)) {
          importResult.errors = [];
        }
        importResult.errors.push({
          row: 'all',
          error: `Database error: ${error.message}`
        });
      }
    }

    // Combine validation errors with import errors
    // Ensure both are arrays before spreading
    const allErrors = [
      ...(Array.isArray(validationErrors) ? validationErrors : []),
      ...(Array.isArray(importResult.errors) ? importResult.errors : [])
    ];

    // Build response
    // Always return errors as an array, even if empty
    const response = {
      message: 'Import completed',
      total: records.length,
      successful: importResult.successful || 0,
      failed: validationErrors.length + (importResult.failed || 0),
      duplicates: duplicates || 0,
      errors: Array.isArray(allErrors) ? allErrors : []
    };

    // Log import summary
    Logger.logInfo('glossary', 'CSV import completed', {
      total: records.length,
      successful: response.successful,
      failed: response.failed,
      duplicates: response.duplicates,
      errorCount: allErrors.length
    });

    res.json(response);
  } catch (error) {
    Logger.logError('glossary', 'CSV import failed', error, {});
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



