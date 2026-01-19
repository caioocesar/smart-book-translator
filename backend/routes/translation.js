import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import db from '../database/db.js';
import DocumentParser from '../services/documentParser.js';
import TranslationService from '../services/translationService.js';
import LocalTranslationService from '../services/localTranslationService.js';
import DocumentBuilder from '../services/documentBuilder.js';
import { TranslationJob, TranslationChunk } from '../models/TranslationJob.js';
import Glossary from '../models/Glossary.js';
import Settings from '../models/Settings.js';
import Logger from '../utils/logger.js';
import RateLimiter from '../utils/rateLimiter.js';
import { io } from '../server.js';

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
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext);
    const safeBase = base.replace(/[^a-zA-Z0-9-_]+/g, '_').slice(0, 80) || 'document';
    const uniqueName = `${Date.now()}-${safeBase}${ext}`;
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
      apiKey,
      chunkSize,
      apiOptions
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

    const normalizedProvider = String(apiProvider).toLowerCase();

    // Google + Local (LibreTranslate) don't need API key
    if (normalizedProvider !== 'google' && normalizedProvider !== 'google-translate' && normalizedProvider !== 'local' && !apiKey) {
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

    // Use provided chunk size or default based on provider and LLM usage
    // TOKEN-BASED CHUNKING (NEW): Use tokens instead of characters
    // LLM-enhanced: 2400 tokens (safe for 4K context models)
    // Local without LLM: 3000 tokens (more efficient)
    // Cloud APIs: 2000 tokens (manage costs)
    
    const useTokenBasedChunking = apiOptions?.useTokenBasedChunking !== false; // Default: true
    let maxChunkSize;
    const isLocalProvider = apiProvider && apiProvider.toLowerCase() === 'local';
    const useLLM = apiOptions?.useLLM || false;
    const llmPipeline = apiOptions?.llmPipeline || {};
    const hasLLMStages = llmPipeline?.validation?.enabled || llmPipeline?.rewrite?.enabled || llmPipeline?.technical?.enabled;
    const isLLMEnabled = useLLM || hasLLMStages;
    
    const MIN_CHUNK_SIZE = useTokenBasedChunking ? 500 : 500;  // 500 tokens or 500 chars
    const MAX_CHUNK_SIZE = useTokenBasedChunking ? 4000 : 10000; // 4000 tokens or 10000 chars
    
    if (chunkSize) {
      const parsedSize = parseInt(chunkSize, 10);
      if (!Number.isFinite(parsedSize)) {
        // Smart defaults based on LLM usage
        if (useTokenBasedChunking) {
          if (isLocalProvider && isLLMEnabled) {
            maxChunkSize = 2400; // 2400 tokens for LLM processing
          } else if (isLocalProvider) {
            maxChunkSize = 3000; // 3000 tokens for LibreTranslate only
          } else {
            maxChunkSize = 2000; // 2000 tokens for Cloud APIs
          }
        } else {
          // Legacy character-based
          if (isLocalProvider && isLLMEnabled) {
            maxChunkSize = 3500; // Smaller chunks for LLM processing
          } else if (isLocalProvider) {
            maxChunkSize = 6000; // Larger chunks for LibreTranslate only
          } else {
            maxChunkSize = 3000; // Cloud APIs
          }
        }
      } else {
        maxChunkSize = Math.max(MIN_CHUNK_SIZE, Math.min(MAX_CHUNK_SIZE, parsedSize));
      }
    } else {
      // Provider-aware defaults with LLM consideration
      if (useTokenBasedChunking) {
        if (isLocalProvider && isLLMEnabled) {
          maxChunkSize = 2400; // 2400 tokens for LLM processing
        } else if (isLocalProvider) {
          maxChunkSize = 3000; // 3000 tokens for LibreTranslate only
        } else {
          maxChunkSize = 2000; // 2000 tokens for Cloud APIs
        }
      } else {
        // Legacy character-based
        if (isLocalProvider && isLLMEnabled) {
          maxChunkSize = 3500; // Smaller chunks for LLM processing
        } else if (isLocalProvider) {
          maxChunkSize = 6000; // Larger chunks for LibreTranslate only
        } else {
          maxChunkSize = 3000; // Cloud APIs
        }
      }
    }
    
    const chunkUnit = useTokenBasedChunking ? 'tokens' : 'chars';
    Logger.logError('upload', `Using chunk size: ${maxChunkSize} ${chunkUnit} (provider: ${apiProvider}, local: ${isLocalProvider}, LLM: ${isLLMEnabled}, tokenBased: ${useTokenBasedChunking})`, null, {});
    
    const chunks = DocumentParser.splitIntoChunks(parsed.text, maxChunkSize, useTokenBasedChunking);
    let htmlChunks = [];
    
    // If HTML is available, split it intelligently preserving tags
    if (parsed.html) {
      htmlChunks = DocumentParser.splitHtmlIntoChunks(parsed.html, chunks.length);
    }

    if (chunks.length === 0) {
      Logger.logError('upload', 'No chunks created from document', null, {
        filename: req.file.originalname,
        textLength: parsed.text.length
      });
      throw new Error('Could not split document into chunks. The document might be too small or contain only whitespace.');
    }

    // Check for duplicate active jobs with same filename
    const duplicateJobs = TranslationJob.findActiveDuplicates(req.file.originalname);
    if (duplicateJobs.length > 0) {
      Logger.logInfo('translation', `Found ${duplicateJobs.length} active job(s) with same filename`, {
        filename: req.file.originalname,
        duplicateJobIds: duplicateJobs.map(j => j.id),
        note: 'User may want to cancel old job before starting new one'
      });
      // Note: We allow duplicates - user can manage them via the History tab
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

    // Store chunks with HTML if available (use batch insert for better performance)
    const chunkData = chunks.map((chunk, index) => ({
      index: index,
      sourceText: chunk,
      sourceHtml: htmlChunks[index] || null
    }));
    TranslationChunk.addBatch(jobId, chunkData);

    // Clean up uploaded file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    Logger.logError('upload', 'Upload successful', null, {
      jobId,
      totalChunks: chunks.length,
      fileExt
    });

    // Calculate document statistics
    const documentStats = {
      fileSize: req.file.size,
      characterCount: parsed.text.length,
      wordCount: parsed.text.split(/\s+/).filter(w => w.length > 0).length,
      pages: parsed.metadata?.pages || null,
      estimatedChunks: chunks.length,
      fileType: fileExt
    };

    res.json({
      jobId,
      totalChunks: chunks.length,
      metadata: parsed.metadata,
      documentStats
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
    const { apiKey, apiOptions, glossaryIds } = req.body;

    const job = TranslationJob.get(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    TranslationJob.updateStatus(jobId, 'translating');

    // Start translation in background
    translateJob(jobId, apiKey, apiOptions, null, glossaryIds).catch(error => {
      console.error('Translation error:', error);
      TranslationJob.updateStatus(jobId, 'failed', error.message);
    });

    res.json({ message: 'Translation started', jobId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pause translation
router.post('/pause/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = TranslationJob.get(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    if (job.status !== 'translating') {
      return res.status(400).json({ error: 'Job is not currently translating' });
    }
    
    TranslationJob.updateStatus(jobId, 'paused');
    io.to(`job-${jobId}`).emit('job-paused', { jobId });
    
    res.json({ message: 'Translation paused', jobId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Resume/Unpause translation
router.post('/resume/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { apiKey, apiOptions, apiProvider } = req.body;
    
    const job = TranslationJob.get(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    if (job.status !== 'paused') {
      return res.status(400).json({ error: 'Job is not paused' });
    }
    
    // Resume from pending/failed chunks
    TranslationJob.updateStatus(jobId, 'translating');
    io.to(`job-${jobId}`).emit('job-resumed', { jobId });
    
    // Start translation in background (will resume from pending chunks)
    translateJob(jobId, apiKey, apiOptions, apiProvider || job.api_provider).catch(error => {
      console.error('Translation error on resume:', error);
      TranslationJob.updateStatus(jobId, 'failed', error.message);
    });
    
    res.json({ message: 'Translation resumed', jobId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update translation settings (when paused)
router.put('/settings/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { chunkSize, apiProvider, apiKey, apiOptions } = req.body;
    
    const job = TranslationJob.get(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    if (job.status !== 'paused') {
      return res.status(400).json({ error: 'Can only update settings when job is paused' });
    }
    
    // Update job settings
    // Note: chunkSize changes would require re-chunking, which is complex
    // For now, we'll update API provider and options
    if (apiProvider) {
      const stmt = db.prepare('UPDATE translation_jobs SET api_provider = ? WHERE id = ?');
      stmt.run(apiProvider, jobId);
    }
    
    // Store updated API key/options in settings or pass them on resume
    // For now, we'll return success and the frontend will pass them on resume
    
    res.json({ 
      message: 'Settings updated', 
      jobId,
      note: 'New settings will be applied when translation is resumed'
    });
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
    // Use HTML if available, otherwise use plain text (preserves formatting)
    const translatedChunks = chunks.map(c => c.translated_html || c.translated_text);

    // Get output directory from settings or use default
    const outputDir = Settings.get('outputDirectory') || path.join(__dirname, '..', 'outputs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Add language tag to filename [SOURCE-TARGET]
    const languageTag = `[${job.source_language.toUpperCase()}-${job.target_language.toUpperCase()}]`;
    const baseFilename = job.filename.replace(/\.[^.]+$/, '');
    const outputFilename = `translated_${baseFilename}_${languageTag}.${job.output_format}`;
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
    const job = TranslationJob.get(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Stop any running translation
    TranslationJob.updateStatus(jobId, 'cancelled');

    // Clean up chunks and job data
    // Delete chunks explicitly to ensure cleanup
    const deleteChunksStmt = db.prepare('DELETE FROM translation_chunks WHERE job_id = ?');
    deleteChunksStmt.run(jobId);
    
    // Delete the job (this will also trigger CASCADE if foreign keys are enabled)
    TranslationJob.delete(jobId);
    
    // Clean up uploaded files if they exist
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const uploadedFile = path.join(uploadsDir, `${jobId}_${job.filename}`);
    if (fs.existsSync(uploadedFile)) {
      try {
        fs.unlinkSync(uploadedFile);
      } catch (err) {
        console.warn(`Failed to delete uploaded file for job ${jobId}:`, err);
      }
    }
    
    // Clean up output files if they exist
    const outputsDir = path.join(__dirname, '..', 'outputs');
    const outputFile = path.join(outputsDir, `${jobId}_translated.${job.output_format}`);
    if (fs.existsSync(outputFile)) {
      try {
        fs.unlinkSync(outputFile);
      } catch (err) {
        console.warn(`Failed to delete output file for job ${jobId}:`, err);
      }
    }
    
    // Notify WebSocket clients to unsubscribe
    io.to(`job-${jobId}`).emit('job-deleted', { jobId });
    io.socketsLeave(`job-${jobId}`);
    
    Logger.logError('translation', `Job ${jobId} deleted`, null, {
      jobId,
      filename: job.filename
    });
    
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    Logger.logError('translation', 'Failed to delete job', error, {
      jobId: req.params.jobId
    });
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

// Background translation function (exported for use by auto-retry service)
export async function translateJob(jobId, apiKey, apiOptions = {}, apiProvider = null, glossaryIds = null) {
  const job = TranslationJob.get(jobId);
  const chunks = TranslationChunk.getPending(jobId);
  
  const provider = apiProvider || job.api_provider;
  const providerLower = String(provider || '').toLowerCase();
  
  // Store glossary IDs in a closure variable so it persists across chunk processing
  // null or undefined = use all, empty array [] = use none, array with IDs = use selected
  let selectedGlossaryIds = null;
  if (glossaryIds !== null && glossaryIds !== undefined && Array.isArray(glossaryIds)) {
    selectedGlossaryIds = glossaryIds.length > 0 ? glossaryIds : []; // Empty array means use no glossary
  } else {
    selectedGlossaryIds = null; // null means use all glossary terms
  }
  
  console.log(`📚 Glossary selection: ${selectedGlossaryIds === null ? 'all' : selectedGlossaryIds.length === 0 ? 'none' : `${selectedGlossaryIds.length} selected`}`);

  // Create appropriate translation service
  const translationService = providerLower === 'local'
    ? null
    : new TranslationService(provider, apiKey, apiOptions);

  // Local provider uses LibreTranslate (no API key)
  const localTranslationService = providerLower === 'local'
    ? new LocalTranslationService(apiOptions?.url || null, apiOptions || {})
    : null;

  // Initialize smart rate limiter
  const rateLimiter = new RateLimiter(providerLower);
  
  let completed = 0;
  let failed = 0;
  const maxRetries = 3;
  const totalChunks = chunks.length;
  
  // Check if we should pause before starting
  if (rateLimiter.shouldPause()) {
    const pauseDuration = rateLimiter.getPauseDuration();
    if (pauseDuration > 0) {
      console.log(`⏸️  Rate limiter recommends pausing for ${pauseDuration/1000}s before starting translation`);
      Logger.logError('translation', 'Rate limiter pause before start', null, {
        jobId,
        pauseDuration: pauseDuration / 1000,
        status: rateLimiter.getStatus()
      });
      await new Promise(resolve => setTimeout(resolve, pauseDuration));
    }
  }
  
  for (let i = 0; i < chunks.length; i++) {
    // Check if job is paused/cancelled/deleted before processing each chunk
    const currentJob = TranslationJob.get(jobId);
    if (!currentJob) {
      console.warn(`⛔ Job ${jobId} not found (deleted). Stopping translation loop.`);
      break;
    }
    if (currentJob.status === 'paused') {
      console.log(`⏸️  Translation job ${jobId} is paused. Stopping translation loop.`);
      TranslationJob.updateStatus(jobId, 'paused');
      return; // Exit the translation loop
    }
    if (currentJob.status === 'cancelled') {
      console.log(`🛑 Translation job ${jobId} is cancelled. Stopping translation loop.`);
      return;
    }
    
    const chunk = chunks[i];
    const chunksRemaining = chunks.length - i - 1;
    let chunkCompleted = false;
    let attempts = 0;
    
    while (!chunkCompleted && attempts < maxRetries) {
      // Check again if paused/cancelled during retry loop
      const jobCheck = TranslationJob.get(jobId);
      if (!jobCheck) {
        console.warn(`⛔ Job ${jobId} not found (deleted). Stopping retries.`);
        return;
      }
      if (jobCheck.status === 'paused') {
        console.log(`⏸️  Translation job ${jobId} paused during chunk ${chunk.chunk_index}. Stopping.`);
        return;
      }
      if (jobCheck.status === 'cancelled') {
        console.log(`🛑 Translation job ${jobId} cancelled during chunk ${chunk.chunk_index}. Stopping.`);
        return;
      }
      try {
        // Calculate smart delay based on multiple factors
        const delay = rateLimiter.calculateDelay(chunksRemaining, totalChunks);
        
        // Log delay information for debugging
        if (i % 10 === 0 || delay > rateLimiter.baseDelay * 1.5) {
          const status = rateLimiter.getStatus();
          console.log(`📊 Chunk ${chunk.chunk_index + 1}/${totalChunks} - Delay: ${delay/1000}s | Success rate: ${(status.successRate * 100).toFixed(0)}% | Rate limit errors: ${status.recentRateLimitErrors}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));

        // Mark chunk as translating (first layer)
        TranslationChunk.updateStatus(chunk.id, 'translating');
        TranslationChunk.updateProcessingLayer(chunk.id, 'translating');
        io.to(`job-${jobId}`).emit('chunk-progress', {
          jobId,
          chunkId: chunk.id,
          chunkIndex: chunk.chunk_index,
          status: 'translating',
          layer: 'translating',
          progress: Math.round(((i) / totalChunks) * 100)
        });

        // Get glossary terms - use selected IDs if provided, otherwise use all for language pair
        // Use the closure variable selectedGlossaryIds instead of job.selectedGlossaryIds
        let glossaryTerms = null;
        if (selectedGlossaryIds !== null && selectedGlossaryIds !== undefined) {
          if (Array.isArray(selectedGlossaryIds) && selectedGlossaryIds.length === 0) {
            // Empty array = use no glossary terms
            glossaryTerms = [];
            console.log(`📚 No glossary terms selected (empty array)`);
          } else if (Array.isArray(selectedGlossaryIds) && selectedGlossaryIds.length > 0) {
            // Use selected glossary IDs
            const allGlossaryTerms = Glossary.getAll(job.source_language, job.target_language);
            glossaryTerms = allGlossaryTerms.filter(term => selectedGlossaryIds.includes(term.id));
            console.log(`📚 Using ${glossaryTerms.length} selected glossary terms (out of ${allGlossaryTerms.length} total)`);
          } else {
            // Invalid format, fallback to all
            glossaryTerms = null;
            console.log(`⚠️  Invalid glossaryIds format, using all glossary terms`);
          }
        } else {
          // null = auto-retrieve all glossary terms from database
          glossaryTerms = null;
        }
        
        let result;
        let finalTranslatedText;
        let translatedHtml = null;

        if (providerLower === 'local') {
          // Local (LibreTranslate) with glossary support
          const localGlossaryTerms = glossaryTerms === null
            ? Glossary.getAll(job.source_language, job.target_language)
            : (Array.isArray(glossaryTerms) ? glossaryTerms : []);

          console.log(`📚 Passing ${localGlossaryTerms.length} glossary terms to local translation`);

          // Check if LLM enhancement is enabled
          const useLLM = apiOptions?.useLLM || false;
          const llmPipeline = apiOptions?.llmPipeline || {};
          const pipelineStages = [
            llmPipeline?.validation?.enabled ? 'validation' : null,
            llmPipeline?.rewrite?.enabled ? 'rewrite' : null,
            llmPipeline?.technical?.enabled ? 'technical' : null
          ].filter(Boolean);
          
          // If LLM is enabled, emit status update before enhancement
          if (useLLM) {
            TranslationChunk.updateProcessingLayer(chunk.id, 'llm-enhancing');
            io.to(`job-${jobId}`).emit('chunk-progress', {
              jobId,
              chunkId: chunk.id,
              chunkIndex: chunk.chunk_index,
              status: 'translating',
              layer: 'llm-enhancing',
              progress: Math.round(((i + 0.5) / totalChunks) * 100)
            });
          }

          const useHtml = !!apiOptions?.htmlMode && !!chunk.source_html;
          const inputForLocal = useHtml ? chunk.source_html : chunk.source_text;

          const abortCheck = () => {
            const jobCheck = TranslationJob.get(jobId);
            if (!jobCheck) return true;
            return jobCheck.status === 'paused' || jobCheck.status === 'cancelled';
          };
          const onPipelineStage = (payload) => {
            if (!payload?.stage) return;
            const layer = payload.status === 'start'
              ? `llm-pipeline-${payload.stage}`
              : 'llm-enhancing';
            TranslationChunk.updateProcessingLayer(chunk.id, layer);
            io.to(`job-${jobId}`).emit('chunk-progress', {
              jobId,
              chunkId: chunk.id,
              chunkIndex: chunk.chunk_index,
              status: 'translating',
              layer,
              progress: Math.round(((i + 0.5) / totalChunks) * 100)
            });
          };

          result = await localTranslationService.translate(
            inputForLocal,
            job.source_language,
            job.target_language,
            localGlossaryTerms,
            {
              ...apiOptions,
              abortCheck,
              onPipelineStage,
              llmPipeline
            } // Pass options including htmlMode, useLLM, formality, etc.
          );
          if (result?.aborted) {
            TranslationChunk.updateProcessingLayer(chunk.id, null);
            console.log(`⏸️  Translation aborted for chunk ${chunk.chunk_index} (job paused/cancelled)`);
            return;
          }
          const translated = result?.translatedText || inputForLocal;
          if (useHtml) {
            translatedHtml = translated;
            finalTranslatedText = localTranslationService.extractTextFromHtml(translatedHtml);
          } else {
            finalTranslatedText = translated;
          }
        } else {
          result = await translationService.translate(
            chunk.source_text,
            job.source_language,
            job.target_language,
            glossaryTerms, // Selected glossary terms or null for all
            chunk.source_html || null // Pass HTML to preserve formatting
          );

          // Extract plain text from HTML if HTML was used, otherwise use translatedText
          finalTranslatedText = result.translatedText;
          if (!finalTranslatedText && result.translatedHtml) {
            // Use the translation service's method to extract text from HTML
            finalTranslatedText = translationService.extractTextFromHtml(result.translatedHtml);
            translatedHtml = result.translatedHtml;
          } else {
            translatedHtml = result.translatedHtml || null;
          }

          // Only fallback to source if we truly have no translation
          if (!finalTranslatedText) {
            finalTranslatedText = chunk.source_text;
            console.warn(`⚠️  No translated text available for chunk ${chunk.chunk_index}, using source text as fallback`);
          }
        }
        
        TranslationChunk.updateTranslation(
          chunk.id, 
          finalTranslatedText,
          'completed',
          translatedHtml
        );
        TranslationChunk.updateProcessingLayer(chunk.id, null); // Clear layer on completion
        completed++;
        TranslationJob.updateProgress(jobId, completed, failed);
        
        // Emit completion status
        io.to(`job-${jobId}`).emit('chunk-progress', {
          jobId,
          chunkId: chunk.id,
          chunkIndex: chunk.chunk_index,
          status: 'completed',
          layer: null,
          progress: Math.round(((i + 1) / totalChunks) * 100)
        });
        
        // Record success in rate limiter
        rateLimiter.recordSuccess();
        chunkCompleted = true;
      } catch (error) {
        attempts++;
        const isRateLimit = error.message.includes('Rate limit') || 
                           error.message.includes('rate limit') ||
                           error.message.includes('429') ||
                           error.message.includes('Too Many Requests') ||
                           error.message.includes('quota exceeded');
        
        // Record error in rate limiter
        if (isRateLimit) {
          rateLimiter.recordRateLimitError();
        } else {
          rateLimiter.recordError();
        }
        
        // Check if it's a network error
        const isNetworkError = error.message.includes('Network error') || 
                              error.message.includes('socket hang up') ||
                              error.message.includes('Connection failed') ||
                              error.message.includes('timeout') ||
                              error.message.includes('ECONNRESET') ||
                              error.message.includes('ETIMEDOUT');
        
        // Log chunk translation error
        const rateLimiterStatus = rateLimiter.getStatus();
        Logger.logError('translation', `Chunk ${chunk.chunk_index} translation failed`, error, {
          jobId,
          chunkIndex: chunk.chunk_index,
          attempts,
          maxRetries,
          isRateLimit,
          isNetworkError,
          provider,
          rateLimiterStatus
        });
        
        // Retry network errors with exponential backoff
        if (isNetworkError && attempts < maxRetries) {
          // Check if rate limiter suggests pausing (high consecutive failures)
          const rateLimiterStatus = rateLimiter.getStatus();
          if (rateLimiterStatus.shouldPause && rateLimiterStatus.pauseDuration > 0) {
            const pauseTime = Math.min(rateLimiterStatus.pauseDuration, 300000); // Max 5 minutes
            console.log(`⏸️  High failure rate detected. Pausing for ${pauseTime/1000}s before retry (attempt ${attempts}/${maxRetries})`);
            console.log(`   This helps avoid DeepL connection throttling.`);
            await new Promise(resolve => setTimeout(resolve, pauseTime));
            // Reset consecutive failures after pause to give it a fresh start
            rateLimiter.consecutiveFailures = 0;
          } else {
            // Exponential backoff: 5s, 15s, 45s
            const baseDelay = 5000; // 5 seconds base
            const waitTime = Math.min(baseDelay * Math.pow(3, attempts - 1), 60000); // Max 60 seconds
            console.log(`🔄 Network error for chunk ${chunk.chunk_index}, retrying in ${waitTime/1000}s (attempt ${attempts}/${maxRetries})`);
            console.log(`   Error: ${error.message}`);
            console.log(`   This may be due to temporary network issues or DeepL server load.`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
          continue; // Retry this chunk
        } else if (isRateLimit && attempts < maxRetries) {
          // Use rate limiter's recommended pause duration
          const pauseDuration = rateLimiter.getPauseDuration();
          const waitTime = pauseDuration > 0 
            ? pauseDuration 
            : Math.min(60000 * Math.pow(2, attempts - 1), 300000); // Fallback: Max 5 minutes
          
          console.log(`⏸️  Rate limit hit for chunk ${chunk.chunk_index}, waiting ${waitTime/1000}s before retry ${attempts}/${maxRetries}`);
          console.log(`📊 Rate limiter status:`, rateLimiterStatus);
          
          Logger.logError('translation', `Rate limit retry for chunk ${chunk.chunk_index}`, null, {
            jobId,
            chunkIndex: chunk.chunk_index,
            attempt: attempts,
            waitTime: waitTime / 1000,
            rateLimiterStatus
          });
          
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue; // Retry this chunk
        } else {
          // Max retries reached or non-rate-limit error
          console.error(`❌ Chunk ${chunk.chunk_index} failed after ${attempts} attempts:`, error.message);
          
          // Check if it's a network error - these should be retried with shorter delay
          const isNetworkError = error.message.includes('Network error') || 
                                error.message.includes('socket hang up') ||
                                error.message.includes('Connection failed') ||
                                error.message.includes('timeout') ||
                                error.message.includes('ECONNRESET') ||
                                error.message.includes('ETIMEDOUT');
          
          // For network errors, use exponential backoff for auto-retry (5s, 15s, 45s)
          // For other errors, use normal retry delay
          let retryDelay = null;
          if (isNetworkError) {
            // Exponential backoff based on retry count: 5s, 15s, 45s
            const baseDelay = 5000;
            const retryCount = chunk.retry_count || 0;
            retryDelay = Math.min(baseDelay * Math.pow(3, retryCount), 60000); // Max 60 seconds
          }
          TranslationChunk.markFailed(chunk.id, error.message, isRateLimit, retryDelay);
          failed++;
          TranslationJob.updateProgress(jobId, completed, failed);
          chunkCompleted = true; // Move to next chunk
          
          // If rate limit and we've exhausted retries, use rate limiter's recommendation
          if (isRateLimit) {
            const pauseDuration = rateLimiter.getPauseDuration() || 120000; // Default 2 minutes
            console.log(`⏸️  Rate limit exhausted, waiting ${pauseDuration/1000}s before continuing...`);
            Logger.logError('translation', 'Rate limit exhausted, waiting before next chunk', null, {
              jobId,
              waitTime: pauseDuration / 1000,
              rateLimiterStatus: rateLimiter.getStatus()
            });
            await new Promise(resolve => setTimeout(resolve, pauseDuration));
          }
        }
      }
    }
    
    // Check if we should pause between chunks (if rate limiter recommends it)
    if (chunksRemaining > 0 && rateLimiter.shouldPause()) {
      const pauseDuration = rateLimiter.getPauseDuration();
      if (pauseDuration > 0) {
        console.log(`⏸️  Rate limiter recommends pausing for ${pauseDuration/1000}s before next chunk`);
        await new Promise(resolve => setTimeout(resolve, pauseDuration));
      }
    }
  }

  // Log final rate limiter status
  const finalStatus = rateLimiter.getStatus();
  console.log(`✅ Translation job ${jobId} completed. Rate limiter final status:`, finalStatus);
  Logger.logError('translation', 'Translation job completed', null, {
    jobId,
    completed,
    failed,
    totalChunks,
    rateLimiterStatus: finalStatus
  });

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

// Schedule retry for failed chunks when limits reset (e.g., next day)
router.post('/schedule-retry/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { apiKey, apiProvider, apiOptions } = req.body;
    
    const job = TranslationJob.get(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Mark failed chunks for scheduled retry
    const failedChunks = TranslationChunk.getByJob(jobId).filter(c => c.status === 'failed');
    
    if (failedChunks.length === 0) {
      return res.json({ message: 'No failed chunks to retry', jobId });
    }

    // Store retry schedule in job metadata or create a scheduled retry job
    // For now, we'll just mark chunks as pending and they'll be retried on next translation start
    TranslationChunk.resetForRetry(jobId);
    TranslationJob.updateStatus(jobId, 'pending');

    res.json({ 
      message: `Scheduled retry for ${failedChunks.length} failed chunks`,
      jobId,
      chunksToRetry: failedChunks.length
    });
  } catch (error) {
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
    // Use HTML if available, otherwise use plain text (preserves formatting)
    const translatedChunks = chunks.map(c => c.translated_html || c.translated_text);

    // Build the output document - use settings output directory or default
    const outputDir = Settings.get('outputDirectory') || path.join(__dirname, '..', 'outputs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Add language tag to filename [SOURCE-TARGET]
    const languageTag = `[${job.source_language.toUpperCase()}-${job.target_language.toUpperCase()}]`;
    const baseFilename = job.filename.replace(/\.[^.]+$/, '');
    const outputFilename = `translated_${baseFilename}_${languageTag}.${job.output_format}`;
    const outputPath = path.join(outputDir, outputFilename);

    // Use DocumentBuilder to create the output file
    // Pass chunks array to preserve HTML formatting when available
    await DocumentBuilder.build(translatedChunks, job.output_format, outputPath);

    // Update job status
    TranslationJob.updateStatus(jobId, 'completed');

    res.json({ 
      success: true, 
      outputPath,
      outputDirectory: outputDir,
      outputFilename,
      message: 'Document generated successfully'
    });
  } catch (error) {
    console.error('Error generating document:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate partial document from completed chunks
// IMPORTANT: This endpoint is read-only and does NOT interfere with ongoing translation.
// It only reads completed chunks from the database and generates a document.
// The translation process continues independently in the background.
router.post('/generate-partial/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    // Read-only operation: Get job info without modifying anything
    const job = TranslationJob.get(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Read-only operation: Get all chunks and filter only completed ones
    // This does not lock or modify the job or chunks in any way
    const allChunks = TranslationChunk.getByJob(jobId);
    const completedChunks = allChunks
      .filter(c => c.status === 'completed')
      .sort((a, b) => a.chunk_index - b.chunk_index); // Ensure correct order

    if (completedChunks.length === 0) {
      return res.status(400).json({ 
        error: 'No completed chunks available to generate document',
        completed: 0,
        total: job.total_chunks
      });
    }

    // Use HTML if available, otherwise use plain text (preserves formatting)
    const translatedChunks = completedChunks.map(c => c.translated_html || c.translated_text);

    // Get output directory from settings or use default
    const outputDir = Settings.get('outputDirectory') || path.join(__dirname, '..', 'outputs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Add language tag to filename [SOURCE-TARGET]
    const languageTag = `[${job.source_language.toUpperCase()}-${job.target_language.toUpperCase()}]`;
    const baseFilename = job.filename.replace(/\.[^.]+$/, '');
    const outputFilename = `translated_partial_${baseFilename}_${languageTag}_${completedChunks.length}of${job.total_chunks}.${job.output_format}`;
    const outputPath = path.join(outputDir, outputFilename);

    // Generate document (file system operation only, doesn't affect translation)
    await DocumentBuilder.build(translatedChunks, job.output_format, outputPath);

    res.json({ 
      success: true, 
      outputPath,
      outputDirectory: outputDir,
      outputFilename,
      completed: completedChunks.length,
      total: job.total_chunks,
      message: 'Partial document generated successfully. Translation continues in background.'
    });
  } catch (error) {
    console.error('Error generating partial document:', error);
    res.status(500).json({ error: error.message });
  }
});

// Download partial document
// IMPORTANT: This endpoint is read-only and does NOT interfere with ongoing translation.
// It only reads completed chunks and serves the generated file.
// The translation process continues independently in the background.
router.get('/download-partial/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    // Read-only operation: Get job info without modifying anything
    const job = TranslationJob.get(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Read-only operation: Get all chunks and filter only completed ones
    // This does not lock or modify the job or chunks in any way
    const allChunks = TranslationChunk.getByJob(jobId);
    const completedChunks = allChunks
      .filter(c => c.status === 'completed')
      .sort((a, b) => a.chunk_index - b.chunk_index); // Ensure correct order

    if (completedChunks.length === 0) {
      return res.status(400).json({ 
        error: 'No completed chunks available to download',
        completed: 0,
        total: job.total_chunks
      });
    }

    // Use HTML if available, otherwise use plain text (preserves formatting)
    const translatedChunks = completedChunks.map(c => c.translated_html || c.translated_text);

    // Get output directory from settings or use default
    const outputDir = Settings.get('outputDirectory') || path.join(__dirname, '..', 'outputs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Add language tag to filename [SOURCE-TARGET]
    const languageTag = `[${job.source_language.toUpperCase()}-${job.target_language.toUpperCase()}]`;
    const baseFilename = job.filename.replace(/\.[^.]+$/, '');
    const outputFilename = `translated_partial_${baseFilename}_${languageTag}_${completedChunks.length}of${job.total_chunks}.${job.output_format}`;
    const outputPath = path.join(outputDir, outputFilename);

    // Generate document if it doesn't exist (file system operation only, doesn't affect translation)
    if (!fs.existsSync(outputPath)) {
      await DocumentBuilder.build(translatedChunks, job.output_format, outputPath);
    }

    // Serve the file (read-only operation)
    res.download(outputPath, outputFilename);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get storage information
router.get('/storage-info', async (req, res) => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // Calculate database size
    const dbPath = path.join(__dirname, '..', 'database', 'translations.db');
    let dbSize = 0;
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      dbSize = stats.size;
    }
    
    // Calculate uploads directory size
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    let uploadsSize = 0;
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      for (const file of files) {
        const filePath = path.join(uploadsDir, file);
        try {
          const stats = fs.statSync(filePath);
          if (stats.isFile()) {
            uploadsSize += stats.size;
          }
        } catch (e) {
          // Skip files that can't be accessed
        }
      }
    }
    
    // Calculate outputs directory size
    const outputsDir = Settings.get('outputDirectory') || path.join(__dirname, '..', 'outputs');
    let outputsSize = 0;
    if (fs.existsSync(outputsDir)) {
      const files = fs.readdirSync(outputsDir);
      for (const file of files) {
        const filePath = path.join(outputsDir, file);
        try {
          const stats = fs.statSync(filePath);
          if (stats.isFile()) {
            outputsSize += stats.size;
          }
        } catch (e) {
          // Skip files that can't be accessed
        }
      }
    }
    
    const totalSize = dbSize + uploadsSize + outputsSize;
    
    res.json({
      dbSize,
      uploadsSize,
      outputsSize,
      totalSize,
      breakdown: {
        database: dbSize,
        uploads: uploadsSize,
        outputs: outputsSize
      }
    });
  } catch (error) {
    console.error('Error calculating storage info:', error);
    res.status(500).json({ error: error.message });
  }
});

// Clear all data
router.delete('/clear-all', async (req, res) => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // Delete all jobs and chunks (cascade will handle chunks)
    db.exec('DELETE FROM translation_jobs');
    
    // Clear uploads directory
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      for (const file of files) {
        const filePath = path.join(uploadsDir, file);
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.error(`Failed to delete ${filePath}:`, e);
        }
      }
    }
    
    // Note: We don't delete outputs directory as user might want to keep translated files
    // But we can add an option for that later
    
    res.json({ 
      success: true, 
      message: 'All translation data cleared successfully',
      note: 'Output files were not deleted. Delete them manually if needed.'
    });
  } catch (error) {
    console.error('Error clearing all data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Open directory in file manager
router.post('/open-directory', async (req, res) => {
  try {
    const { path: dirPath } = req.body;
    
    if (!dirPath) {
      return res.status(400).json({ error: 'Path is required' });
    }

    // Normalize path
    const normalizedPath = path.resolve(dirPath);
    
    // Check if directory exists
    if (!fs.existsSync(normalizedPath)) {
      return res.status(404).json({ error: 'Directory not found' });
    }

    const platform = process.platform;
    const openWithFallback = (commands, args, onSuccess, onError, index = 0) => {
      if (index >= commands.length) {
        onError(new Error('No compatible file manager found'));
        return;
      }
      execFile(commands[index], args, (error) => {
        if (!error) {
          onSuccess();
          return;
        }
        openWithFallback(commands, args, onSuccess, onError, index + 1);
      });
    };

    let commands = [];
    if (platform === 'win32') {
      commands = ['explorer'];
    } else if (platform === 'darwin') {
      commands = ['open'];
    } else {
      commands = ['xdg-open', 'nautilus', 'dolphin', 'thunar', 'nemo'];
    }

    openWithFallback(
      commands,
      [normalizedPath],
      () => res.json({ success: true, message: 'Directory opened' }),
      (error) => {
        console.error('Error opening directory:', error);
        res.status(500).json({ error: 'Failed to open directory', details: error.message });
      }
    );
  } catch (error) {
    console.error('Error opening directory:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

