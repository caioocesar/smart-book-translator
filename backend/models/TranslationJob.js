import db from '../database/db.js';
import { randomUUID } from 'crypto';

class TranslationJob {
  static create(filename, sourceLanguage, targetLanguage, apiProvider, outputFormat, totalChunks) {
    const id = randomUUID();
    const stmt = db.prepare(`
      INSERT INTO translation_jobs 
      (id, filename, source_language, target_language, api_provider, output_format, status, total_chunks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, filename, sourceLanguage, targetLanguage, apiProvider, outputFormat, 'pending', totalChunks);
    return id;
  }

  static get(id) {
    const stmt = db.prepare('SELECT * FROM translation_jobs WHERE id = ?');
    return stmt.get(id);
  }

  static getAll(limit = 50) {
    const stmt = db.prepare(`
      SELECT * FROM translation_jobs 
      ORDER BY created_at DESC 
      LIMIT ?
    `);
    return stmt.all(limit);
  }

  static updateStatus(id, status, errorMessage = null) {
    const stmt = db.prepare(`
      UPDATE translation_jobs 
      SET status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(status, errorMessage, id);
  }

  static updateProgress(id, completedChunks, failedChunks) {
    const stmt = db.prepare(`
      UPDATE translation_jobs 
      SET completed_chunks = ?, failed_chunks = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(completedChunks, failedChunks, id);
  }

  static delete(id) {
    const stmt = db.prepare('DELETE FROM translation_jobs WHERE id = ?');
    stmt.run(id);
  }
}

class TranslationChunk {
  static add(jobId, chunkIndex, sourceText, sourceHtml = null) {
    const stmt = db.prepare(`
      INSERT INTO translation_chunks 
      (job_id, chunk_index, source_text, source_html, status)
      VALUES (?, ?, ?, ?, 'pending')
    `);
    const result = stmt.run(jobId, chunkIndex, sourceText, sourceHtml);
    return result.lastInsertRowid;
  }

  static getByJob(jobId) {
    const stmt = db.prepare(`
      SELECT * FROM translation_chunks 
      WHERE job_id = ? 
      ORDER BY chunk_index
    `);
    return stmt.all(jobId);
  }

  static getPending(jobId) {
    const stmt = db.prepare(`
      SELECT * FROM translation_chunks 
      WHERE job_id = ? AND status = 'pending'
      ORDER BY chunk_index
    `);
    return stmt.all(jobId);
  }

  static updateTranslation(id, translatedText, status = 'completed', translatedHtml = null) {
    const stmt = db.prepare(`
      UPDATE translation_chunks 
      SET translated_text = ?, translated_html = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(translatedText, translatedHtml, status, id);
  }

  static markFailed(id, errorMessage, isRateLimit = false) {
    // Calculate next retry time based on error type
    let nextRetryAt = null;
    if (isRateLimit) {
      // For rate limits, retry in 5-10 minutes
      const retryMinutes = 5 + Math.floor(Math.random() * 5); // 5-10 minutes
      const retryDate = new Date();
      retryDate.setMinutes(retryDate.getMinutes() + retryMinutes);
      nextRetryAt = retryDate.toISOString();
    } else {
      // For other errors, retry in 1 minute
      const retryDate = new Date();
      retryDate.setMinutes(retryDate.getMinutes() + 1);
      nextRetryAt = retryDate.toISOString();
    }
    
    const stmt = db.prepare(`
      UPDATE translation_chunks 
      SET status = 'failed', error_message = ?, retry_count = retry_count + 1, 
          next_retry_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(errorMessage, nextRetryAt, id);
  }

  static resetForRetry(jobId) {
    const stmt = db.prepare(`
      UPDATE translation_chunks 
      SET status = 'pending', error_message = NULL, next_retry_at = NULL
      WHERE job_id = ? AND status = 'failed'
    `);
    stmt.run(jobId);
  }

  static getFailedReadyForRetry() {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      SELECT * FROM translation_chunks 
      WHERE status = 'failed' 
        AND next_retry_at IS NOT NULL 
        AND next_retry_at <= ?
      ORDER BY next_retry_at ASC
    `);
    return stmt.all(now);
  }

  static getJobsWithPendingChunks() {
    const stmt = db.prepare(`
      SELECT DISTINCT job_id 
      FROM translation_chunks 
      WHERE status = 'pending'
    `);
    return stmt.all().map(row => row.job_id);
  }

  static markChunkForRetry(chunkId) {
    const stmt = db.prepare(`
      UPDATE translation_chunks 
      SET status = 'pending', error_message = NULL, next_retry_at = NULL
      WHERE id = ?
    `);
    stmt.run(chunkId);
  }
}

class ApiUsage {
  static track(provider, charactersUsed, requestsCount = 1) {
    const date = new Date().toISOString().split('T')[0];
    const stmt = db.prepare(`
      INSERT INTO api_usage (provider, characters_used, requests_count, date)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(provider, date) DO UPDATE SET
        characters_used = characters_used + excluded.characters_used,
        requests_count = requests_count + excluded.requests_count
    `);
    stmt.run(provider, charactersUsed, requestsCount, date);
  }

  static getUsageToday(provider) {
    const date = new Date().toISOString().split('T')[0];
    const stmt = db.prepare(`
      SELECT * FROM api_usage 
      WHERE provider = ? AND date = ?
    `);
    return stmt.get(provider, date) || { characters_used: 0, requests_count: 0 };
  }

  static getUsageHistory(provider, days = 30) {
    const stmt = db.prepare(`
      SELECT * FROM api_usage 
      WHERE provider = ? 
      ORDER BY date DESC 
      LIMIT ?
    `);
    return stmt.all(provider, days);
  }
}

export { TranslationJob, TranslationChunk, ApiUsage };



