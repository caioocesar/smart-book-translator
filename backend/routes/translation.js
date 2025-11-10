import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from '../database/db.js';
import DocumentParser from '../services/documentParser.js';
import TranslationService from '../services/translationService.js';
import DocumentBuilder from '../services/documentBuilder.js';
import { TranslationJob, TranslationChunk } from '../models/TranslationJob.js';
import Settings from '../models/Settings.js';
import Logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.docx', '.epub'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOCX, and EPUB files are allowed'));
    }
  }
});

// Upload and start translation
router.post('/upload', upload.single('document'), async (req, res) => {
  let filePath;
  try {
    if (!req.file) {
      Logger.logError('upload', 'No file uploaded', null, {});
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const {
      sourceLanguage,
      targetLanguage,
      apiProvider,
      outputFormat,
      apiKey
    } = req.body;

    if (!sourceLanguage || !targetLanguage || !apiProvider) {
      Logger.logError('upload', 'Missing required parameters', null, {
        hasSourceLanguage: !!sourceLanguage,
        hasTargetLanguage: !!targetLanguage,
        hasApiProvider: !!apiProvider,
        hasApiKey: !!apiKey
      });
      return res.status(400).json({ error: 'Missing required parameters: sourceLanguage, targetLanguage, and apiProvider are required' });
    }

    // Google doesn't need API key
    if (apiProvider !== 'google' && apiProvider !== 'google-translate' && !apiKey) {
      Logger.logError('upload', 'API key required', null, { apiProvider });
      return res.status(400).json({ error: 'API key is required for this provider' });
    }

    filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).substring(1).toLowerCase();

    Logger.logError('upload', 'Starting document parse', null, {
      filename: req.file.originalname,
      fileExt,
      fileSize: req.file.size
    });

    // Parse document
    const parsed = await DocumentParser.parse(filePath, fileExt);
    
    if (!parsed || !parsed.text || parsed.text.trim().length === 0) {
      Logger.logError('upload', 'Document parsed but contains no text', null, {
        filename: req.file.originalname,
        fileExt
      });
      throw new Error('Document parsed successfully but contains no text. The file might be empty or corrupted.');
    }

    const chunks = DocumentParser.splitIntoChunks(parsed.text);

    if (chunks.length === 0) {
      Logger.logError('upload', 'No chunks created from document', null, {
        filename: req.file.originalname,
        textLength: parsed.text.length
      });
      throw new Error('Could not split document into chunks. The document might be too small or contain only whitespace.');
    }

    // Create translation job
    const jobId = TranslationJob.create(
      req.file.originalname,
      sourceLanguage,
      targetLanguage,
      apiProvider,
      outputFormat || fileExt,
      chunks.length
    );

    // Store chunks
    chunks.forEach((chunk, index) => {
      TranslationChunk.add(jobId, index, chunk);
    });

    // Clean up uploaded file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    Logger.logError('upload', 'Upload successful', null, {
      jobId,
      totalChunks: chunks.length,
      fileExt
    });

    res.json({
      jobId,
      totalChunks: chunks.length,
      metadata: parsed.metadata
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (unlinkError) {
        console.error('Failed to clean up uploaded file:', unlinkError);
      }
    }

    Logger.logError('upload', 'Upload failed', error, {
      filename: req.file?.originalname,
      fileExt: req.file ? path.extname(req.file.originalname).substring(1) : 'unknown',
      errorMessage: error.message
    });

    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Upload failed' });
  }
});

// Start translation process
router.post('/translate/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { apiKey, apiOptions } = req.body;

    const job = TranslationJob.get(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    TranslationJob.updateStatus(jobId, 'translating');

    // Start translation in background
    translateJob(jobId, apiKey, apiOptions).catch(error => {
      console.error('Translation error:', error);
      TranslationJob.updateStatus(jobId, 'failed', error.message);
    });

    res.json({ message: 'Translation started', jobId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get job status
router.get('/status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = TranslationJob.get(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const chunks = TranslationChunk.getByJob(jobId);
    const completed = chunks.filter(c => c.status === 'completed').length;
    const failed = chunks.filter(c => c.status === 'failed').length;

    res.json({
      job,
      progress: {
        total: chunks.length,
        completed,
        failed,
        pending: chunks.length - completed - failed,
        percentage: Math.round((completed / chunks.length) * 100)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download translated document
router.get('/download/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = TranslationJob.get(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({ error: 'Translation not completed' });
    }

    const chunks = TranslationChunk.getByJob(jobId);
    const translatedChunks = chunks.map(c => c.translated_text);

    // Get output directory from settings or use default
    const outputDir = Settings.get('outputDirectory') || path.join(__dirname, '..', 'outputs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputFilename = `translated_${job.filename.replace(/\.[^.]+$/, '')}.${job.output_format}`;
    const outputPath = path.join(outputDir, outputFilename);

    await DocumentBuilder.build(translatedChunks, job.output_format, outputPath);

    res.download(outputPath, outputFilename);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Retry failed chunks
router.post('/retry/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { apiKey, apiOptions } = req.body;

    const job = TranslationJob.get(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    TranslationChunk.resetForRetry(jobId);
    TranslationJob.updateStatus(jobId, 'translating');

    translateJob(jobId, apiKey, apiOptions).catch(error => {
      console.error('Translation error:', error);
      TranslationJob.updateStatus(jobId, 'failed', error.message);
    });

    res.json({ message: 'Retry started', jobId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all jobs
router.get('/jobs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const jobs = TranslationJob.getAll(limit);
    
    // Add progress information for each job
    const jobsWithProgress = jobs.map(job => {
      try {
        const chunks = TranslationChunk.getByJob(job.id);
        const completed = chunks.filter(c => c.status === 'completed').length;
        const failed = chunks.filter(c => c.status === 'failed').length;
        const pending = chunks.filter(c => c.status === 'pending').length;
        
        return {
          ...job,
          progress: {
            total: chunks.length,
            completed,
            failed,
            pending,
            percentage: chunks.length > 0 ? Math.round((completed / chunks.length) * 100) : 0
          }
        };
      } catch (err) {
        console.error(`Error getting progress for job ${job.id}:`, err);
        return {
          ...job,
          progress: {
            total: job.total_chunks || 0,
            completed: job.completed_chunks || 0,
            failed: job.failed_chunks || 0,
            pending: 0,
            percentage: 0
          }
        };
      }
    });
    
    res.json(jobsWithProgress);
  } catch (error) {
    Logger.logError('translation', 'Failed to load translation history', error, {});
    console.error('Error loading jobs:', error);
    res.status(500).json({ error: error.message || 'Failed to load translation history' });
  }
});

// Delete a job
router.delete('/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    TranslationJob.delete(jobId);
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Retry all chunks (from beginning)
router.post('/retry-all/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { apiKey, apiProvider, apiOptions } = req.body;

    const job = TranslationJob.get(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Reset all chunks to pending
    const chunks = TranslationChunk.getByJob(jobId);
    chunks.forEach(chunk => {
      const stmt = db.prepare(`
        UPDATE translation_chunks 
        SET status = 'pending', error_message = NULL, translated_text = NULL
        WHERE id = ?
      `);
      stmt.run(chunk.id);
    });

    // Update job
    TranslationJob.updateStatus(jobId, 'translating');
    TranslationJob.updateProgress(jobId, 0, 0);

    // Update API provider if changed
    if (apiProvider && apiProvider !== job.api_provider) {
      const stmt = db.prepare('UPDATE translation_jobs SET api_provider = ? WHERE id = ?');
      stmt.run(apiProvider, jobId);
    }

    // Start translation in background
    translateJob(jobId, apiKey, apiOptions, apiProvider || job.api_provider).catch(error => {
      console.error('Translation error:', error);
      TranslationJob.updateStatus(jobId, 'failed', error.message);
    });

    res.json({ message: 'Retrying all chunks', jobId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Background translation function
async function translateJob(jobId, apiKey, apiOptions = {}, apiProvider = null) {
  const job = TranslationJob.get(jobId);
  const chunks = TranslationChunk.getPending(jobId);
  
  const provider = apiProvider || job.api_provider;

  const translationService = new TranslationService(
    provider,
    apiKey,
    apiOptions
  );

  let completed = 0;
  let failed = 0;
  const maxRetries = 3;
  
  for (const chunk of chunks) {
    let chunkCompleted = false;
    let attempts = 0;
    
    while (!chunkCompleted && attempts < maxRetries) {
      try {
        // Add delay to respect rate limits (longer delay for OpenAI)
        const delay = provider === 'openai' || provider === 'chatgpt' ? 2000 : 1000;
        await new Promise(resolve => setTimeout(resolve, delay));

        const result = await translationService.translate(
          chunk.source_text,
          job.source_language,
          job.target_language
        );

        TranslationChunk.updateTranslation(chunk.id, result.translatedText);
        completed++;
        TranslationJob.updateProgress(jobId, completed, failed);
        chunkCompleted = true;
      } catch (error) {
        attempts++;
        const isRateLimit = error.message.includes('Rate limit') || 
                           error.message.includes('rate limit') ||
                           error.message.includes('429');
        
        // Log chunk translation error
        Logger.logError('translation', `Chunk ${chunk.chunk_index} translation failed`, error, {
          jobId,
          chunkIndex: chunk.chunk_index,
          attempts,
          maxRetries,
          isRateLimit,
          provider
        });
        
        if (isRateLimit && attempts < maxRetries) {
          // Exponential backoff for rate limits
          const waitTime = Math.min(60000 * Math.pow(2, attempts - 1), 300000); // Max 5 minutes
          console.log(`Rate limit hit for chunk ${chunk.chunk_index}, waiting ${waitTime/1000}s before retry ${attempts}/${maxRetries}`);
          Logger.logError('translation', `Rate limit retry for chunk ${chunk.chunk_index}`, null, {
            jobId,
            chunkIndex: chunk.chunk_index,
            attempt: attempts,
            waitTime: waitTime / 1000
          });
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue; // Retry this chunk
        } else {
          // Max retries reached or non-rate-limit error
          console.error(`Chunk ${chunk.chunk_index} failed after ${attempts} attempts:`, error.message);
          TranslationChunk.markFailed(chunk.id, error.message);
          failed++;
          TranslationJob.updateProgress(jobId, completed, failed);
          chunkCompleted = true; // Move to next chunk
          
          // If rate limit and we've exhausted retries, wait before next chunk
          if (isRateLimit) {
            console.log('Rate limit exhausted, waiting 2 minutes before continuing...');
            Logger.logError('translation', 'Rate limit exhausted, waiting before next chunk', null, {
              jobId,
              waitTime: 120
            });
            await new Promise(resolve => setTimeout(resolve, 120000));
          }
        }
      }
    }
  }

  if (failed === 0) {
    TranslationJob.updateStatus(jobId, 'completed');
  } else if (completed === 0) {
    TranslationJob.updateStatus(jobId, 'failed', 'All chunks failed');
  } else {
    TranslationJob.updateStatus(jobId, 'partial', `${failed} chunks failed`);
  }
}

// Get chunks for a job
router.get('/chunks/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const chunks = TranslationChunk.getByJob(jobId);
    res.json(chunks);
  } catch (error) {
    console.error('Error fetching chunks:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate final document from completed chunks
router.post('/generate/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = TranslationJob.get(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Check if all chunks are completed
    if (job.completed_chunks !== job.total_chunks || job.failed_chunks > 0) {
      return res.status(400).json({ 
        error: 'Cannot generate document: not all chunks are completed successfully',
        completed: job.completed_chunks,
        total: job.total_chunks,
        failed: job.failed_chunks
      });
    }

    // Get all chunks
    const chunks = TranslationChunk.getByJob(jobId);
    const translatedTexts = chunks.map(c => c.translated_text);
    const combinedText = translatedTexts.join('\n\n');

    // Build the output document
    const outputsDir = path.join(__dirname, '..', 'outputs');
    if (!fs.existsSync(outputsDir)) {
      fs.mkdirSync(outputsDir, { recursive: true });
    }

    const outputFilename = `translated_${job.filename}`;
    const outputPath = path.join(outputsDir, outputFilename);

    // Use DocumentBuilder to create the output file
    const builder = new DocumentBuilder();
    await builder.build(combinedText, job.output_format, outputPath);

    // Update job status
    TranslationJob.updateStatus(jobId, 'completed');

    res.json({ 
      success: true, 
      outputPath,
      message: 'Document generated successfully'
    });
  } catch (error) {
    console.error('Error generating document:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

