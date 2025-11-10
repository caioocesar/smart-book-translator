/**
 * Document Analysis Routes
 * Analyzes documents before upload to provide metadata and recommendations
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import DocumentParser from '../services/documentParser.js';
import ApiPlansService from '../services/apiPlansService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for temporary file upload
const upload = multer({
  dest: path.join(__dirname, '..', 'uploads', 'temp'),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Analyze document before upload
router.post('/analyze', upload.single('document'), async (req, res) => {
  let filePath;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).substring(1).toLowerCase();

    // Parse document to get metadata
    const parsed = await DocumentParser.parse(filePath, fileExt);
    
    if (!parsed || !parsed.text || parsed.text.trim().length === 0) {
      return res.status(400).json({ error: 'Document contains no readable text' });
    }

    // Calculate statistics
    const characterCount = parsed.text.length;
    const wordCount = parsed.text.split(/\s+/).filter(w => w.length > 0).length;
    const pages = parsed.metadata?.pages || null;
    
    // Get recommendations
    const recommendations = ApiPlansService.recommendApi(
      req.file.size,
      characterCount,
      false // hasGlossary - could be determined from settings
    );

    // Clean up temp file
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.warn('Failed to clean up temp file:', err);
      }
    }

    res.json({
      fileSize: req.file.size,
      fileName: req.file.originalname,
      fileType: fileExt,
      characterCount,
      wordCount,
      pages,
      estimatedChunks: recommendations[0]?.estimatedChunks || Math.ceil(characterCount / 4000),
      recommendations
    });
  } catch (error) {
    // Clean up temp file on error
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.warn('Failed to clean up temp file:', err);
      }
    }
    
    console.error('Document analysis error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze document' });
  }
});

export default router;

