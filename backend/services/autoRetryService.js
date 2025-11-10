/**
 * Auto-Retry Service
 * Automatically retries failed chunks and resumes pending translations
 * based on configuration settings
 */

import { TranslationJob, TranslationChunk } from '../models/TranslationJob.js';
import Settings from '../models/Settings.js';
import Logger from '../utils/logger.js';

// Dynamic import to avoid circular dependency
let translateJobFunction = null;
async function getTranslateJob() {
  if (!translateJobFunction) {
    const translationModule = await import('../routes/translation.js');
    translateJobFunction = translationModule.translateJob;
  }
  return translateJobFunction;
}

class AutoRetryService {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    this.checkInterval = 5 * 60 * 1000; // Check every 5 minutes
  }

  /**
   * Initialize default settings if they don't exist
   */
  initializeSettings() {
    if (Settings.get('autoRetryFailed') === null) {
      Settings.set('autoRetryFailed', true);
    }
    if (Settings.get('autoResumePending') === null) {
      Settings.set('autoResumePending', true);
    }
  }

  /**
   * Check if auto-retry is enabled
   */
  isAutoRetryEnabled() {
    return Settings.get('autoRetryFailed') !== false; // Default true
  }

  /**
   * Check if auto-resume is enabled
   */
  isAutoResumeEnabled() {
    return Settings.get('autoResumePending') !== false; // Default true
  }

  /**
   * Retry failed chunks that are ready (next_retry_at has passed)
   */
  async retryFailedChunks() {
    if (!this.isAutoRetryEnabled()) {
      return;
    }

    try {
      const readyChunks = TranslationChunk.getFailedReadyForRetry();
      
      if (readyChunks.length === 0) {
        return;
      }

      console.log(`🔄 Auto-retry: Found ${readyChunks.length} failed chunks ready for retry`);

      // Group chunks by job_id
      const chunksByJob = {};
      for (const chunk of readyChunks) {
        if (!chunksByJob[chunk.job_id]) {
          chunksByJob[chunk.job_id] = [];
        }
        chunksByJob[chunk.job_id].push(chunk);
      }

      // Retry chunks for each job
      for (const [jobId, chunks] of Object.entries(chunksByJob)) {
        const job = TranslationJob.get(jobId);
        if (!job) continue;

        // Get API key for this job's provider
        const provider = job.api_provider;
        let apiKey = null;
        let apiOptions = {};

        if (provider === 'google' || provider === 'google-translate') {
          apiKey = 'not-needed'; // Google doesn't need API key
        } else {
          apiKey = Settings.get(`${provider}_api_key`);
          if (provider === 'openai' || provider === 'chatgpt') {
            const options = Settings.get('openai_options');
            if (options) {
              try {
                apiOptions = typeof options === 'string' ? JSON.parse(options) : options;
              } catch (e) {
                apiOptions = { model: Settings.get('openai_model') || 'gpt-3.5-turbo' };
              }
            } else {
              apiOptions = { model: Settings.get('openai_model') || 'gpt-3.5-turbo' };
            }
          }
        }

        // Skip if no API key (except for Google)
        if (!apiKey && provider !== 'google' && provider !== 'google-translate') {
          console.log(`⏭️  Auto-retry: Skipping job ${jobId} - no API key for ${provider}`);
          continue;
        }

        // Mark chunks as pending for retry
        for (const chunk of chunks) {
          TranslationChunk.markChunkForRetry(chunk.id);
        }

        // Update job status
        TranslationJob.updateStatus(jobId, 'translating');

        console.log(`🚀 Auto-retry: Resuming job ${jobId} with ${chunks.length} chunks`);

        // Start translation in background
        const translateJob = await getTranslateJob();
        translateJob(jobId, apiKey, apiOptions, provider).catch(error => {
          console.error(`❌ Auto-retry error for job ${jobId}:`, error);
          Logger.logError('auto-retry', `Failed to auto-retry job ${jobId}`, error, {
            jobId,
            chunksCount: chunks.length,
            provider
          });
        });
      }
    } catch (error) {
      console.error('❌ Error in auto-retry service:', error);
      Logger.logError('auto-retry', 'Error retrying failed chunks', error);
    }
  }

  /**
   * Resume jobs with pending chunks
   */
  async resumePendingJobs() {
    if (!this.isAutoResumeEnabled()) {
      return;
    }

    try {
      const jobIds = TranslationChunk.getJobsWithPendingChunks();
      
      if (jobIds.length === 0) {
        return;
      }

      console.log(`🔄 Auto-resume: Found ${jobIds.length} jobs with pending chunks`);

      for (const jobId of jobIds) {
        const job = TranslationJob.get(jobId);
        if (!job) continue;

        // Skip if job is already translating or completed
        if (job.status === 'translating' || job.status === 'completed') {
          continue;
        }

        // Get API key for this job's provider
        const provider = job.api_provider;
        let apiKey = null;
        let apiOptions = {};

        if (provider === 'google' || provider === 'google-translate') {
          apiKey = 'not-needed';
        } else {
          apiKey = Settings.get(`${provider}_api_key`);
          if (provider === 'openai' || provider === 'chatgpt') {
            const options = Settings.get('openai_options');
            if (options) {
              try {
                apiOptions = typeof options === 'string' ? JSON.parse(options) : options;
              } catch (e) {
                apiOptions = { model: Settings.get('openai_model') || 'gpt-3.5-turbo' };
              }
            } else {
              apiOptions = { model: Settings.get('openai_model') || 'gpt-3.5-turbo' };
            }
          }
        }

        // Skip if no API key (except for Google)
        if (!apiKey && provider !== 'google' && provider !== 'google-translate') {
          console.log(`⏭️  Auto-resume: Skipping job ${jobId} - no API key for ${provider}`);
          continue;
        }

        // Update job status
        TranslationJob.updateStatus(jobId, 'translating');

        console.log(`🚀 Auto-resume: Resuming job ${jobId}`);

        // Start translation in background
        const translateJob = await getTranslateJob();
        translateJob(jobId, apiKey, apiOptions, provider).catch(error => {
          console.error(`❌ Auto-resume error for job ${jobId}:`, error);
          Logger.logError('auto-resume', `Failed to auto-resume job ${jobId}`, error, {
            jobId,
            provider
          });
        });
      }
    } catch (error) {
      console.error('❌ Error in auto-resume service:', error);
      Logger.logError('auto-resume', 'Error resuming pending jobs', error);
    }
  }

  /**
   * Run both auto-retry and auto-resume
   */
  async run() {
    if (this.isRunning) {
      return; // Prevent concurrent runs
    }

    this.isRunning = true;
    try {
      await this.retryFailedChunks();
      await this.resumePendingJobs();
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Start the auto-retry service
   */
  start() {
    this.initializeSettings();
    
    // Run immediately on startup
    console.log('🔄 Starting auto-retry service...');
    this.run().catch(error => {
      console.error('❌ Error in initial auto-retry run:', error);
    });

    // Then run periodically
    this.intervalId = setInterval(() => {
      this.run().catch(error => {
        console.error('❌ Error in periodic auto-retry run:', error);
      });
    }, this.checkInterval);

    console.log(`✅ Auto-retry service started (checking every ${this.checkInterval / 1000}s)`);
  }

  /**
   * Stop the auto-retry service
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('⏹️  Auto-retry service stopped');
    }
  }
}

// Export singleton instance
const autoRetryService = new AutoRetryService();
export default autoRetryService;

