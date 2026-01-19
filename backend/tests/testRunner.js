import db from '../database/db.js';
import Settings from '../models/Settings.js';
import Glossary from '../models/Glossary.js';
import { TranslationJob, TranslationChunk, ApiUsage } from '../models/TranslationJob.js';
import DocumentParser from '../services/documentParser.js';
import LocalTranslationService from '../services/localTranslationService.js';
import TranslationService from '../services/translationService.js';
import ollamaService from '../services/ollamaService.js';
import { stringify } from 'csv-stringify/sync';
import Encryption from '../utils/encryption.js';

class TestRunner {
  constructor(options = {}) {
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: []
    };
    this.onProgress = options.onProgress || null;
    this.shouldCancel = options.shouldCancel || null;
    this.cancelled = false;
  }

  async runTest(name, testFn) {
    if (this.cancelled) return;
    if (this.shouldCancel && this.shouldCancel()) {
      this.cancelled = true;
      this.results.skipped++;
      this.results.tests.push({ name, status: 'skipped', error: 'cancelled' });
      this.reportProgress();
      return;
    }
    try {
      const result = await testFn();
      if (result?.skipped) {
        this.results.skipped++;
        this.results.tests.push({ name, status: 'skipped', error: result.reason || 'skipped' });
        console.warn(`↷ ${name} (${result.reason || 'skipped'})`);
      } else {
        this.results.passed++;
        this.results.tests.push({ name, status: 'passed', error: null });
        console.log(`✓ ${name}`);
      }
    } catch (error) {
      this.results.failed++;
      this.results.tests.push({ name, status: 'failed', error: error.message });
      console.error(`✗ ${name}:`, error.message);
    }
    this.reportProgress();
  }

  reportProgress() {
    if (this.onProgress) {
      this.onProgress(this.getResults());
    }
  }

  skipTest(name, reason = 'skipped') {
    if (this.cancelled) return;
    this.results.skipped++;
    this.results.tests.push({ name, status: 'skipped', error: reason });
    console.warn(`↷ ${name} (${reason})`);
    this.reportProgress();
  }

  async runAllTests(options = {}) {
    console.log('\n========================================');
    console.log('🧪 Running System Tests...');
    console.log('========================================\n');

    // Database Tests
    await this.runTest('Database Connection', async () => {
      const result = db.prepare('SELECT 1 as test').get();
      if (result.test !== 1) throw new Error('Database query failed');
    });

    await this.runTest('Settings Table Exists', async () => {
      const result = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'").get();
      if (!result) throw new Error('Settings table not found');
    });

    await this.runTest('Glossary Table Exists', async () => {
      const result = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='glossary'").get();
      if (!result) throw new Error('Glossary table not found');
    });

    await this.runTest('Translation Jobs Table Exists', async () => {
      const result = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='translation_jobs'").get();
      if (!result) throw new Error('Translation jobs table not found');
    });

    // Encryption Tests
    await this.runTest('Encryption/Decryption', async () => {
      const original = 'test-api-key-12345';
      const encrypted = Encryption.encrypt(original);
      const decrypted = Encryption.decrypt(encrypted);
      if (decrypted !== original) throw new Error('Encryption roundtrip failed');
    });

    await this.runTest('Hash Function', async () => {
      const hash1 = Encryption.hash('test');
      const hash2 = Encryption.hash('test');
      if (hash1 !== hash2) throw new Error('Hash is not deterministic');
    });

    // Settings Tests
    await this.runTest('Settings CRUD Operations', async () => {
      Settings.set('test_key', 'test_value');
      const value = Settings.get('test_key');
      if (value !== 'test_value') throw new Error('Settings get/set failed');
      Settings.delete('test_key');
      const deleted = Settings.get('test_key');
      if (deleted !== null) throw new Error('Settings delete failed');
    });

    await this.runTest('Settings Persisted in Store', async () => {
      Settings.set('test_key_persisted', 'persisted_value');
      const allSettings = Settings.getAll();
      if (!Object.prototype.hasOwnProperty.call(allSettings, 'test_key_persisted')) {
        throw new Error('Settings entry not persisted in store');
      }
      if (allSettings.test_key_persisted !== 'persisted_value') {
        throw new Error('Settings persisted value mismatch');
      }
      Settings.delete('test_key_persisted');
    });

    await this.runTest('Settings Encryption for API Keys', async () => {
      const apiKey = 'sk-test-api-key-12345';
      Settings.set('deepl_api_key', apiKey);
      
      // Check it's encrypted in DB
      const raw = db.prepare('SELECT value FROM settings WHERE key = ?').get('deepl_api_key');
      const storedValue = JSON.parse(raw.value);
      if (storedValue === apiKey) throw new Error('API key not encrypted in database');
      
      // Check decryption works
      const retrieved = Settings.get('deepl_api_key');
      if (retrieved !== apiKey) throw new Error('API key decryption failed');
      
      Settings.delete('deepl_api_key');
    });

    // Glossary Tests
    await this.runTest('Glossary Add/Retrieve', async () => {
      const id = Glossary.add('__test__term', 'prueba', 'en', 'es', 'test');
      const entries = Glossary.getAll();
      const found = entries.find(e => e.id === id);
      if (!found || found.source_term !== '__test__term') throw new Error('Glossary add/retrieve failed');
      Glossary.delete(id);
    });

    await this.runTest('Glossary Search', async () => {
      const id = Glossary.add('__test__hello', 'hola', 'en', 'es');
      const result = Glossary.search('__test__hello', 'en', 'es');
      if (!result || result.target_term !== 'hola') throw new Error('Glossary search failed');
      Glossary.delete(id);
    });

    await this.runTest('Glossary Import/Export', async () => {
      const importEntries = [
        {
          source_term: 'Token',
          target_term: 'TokenPT',
          source_language: 'en',
          target_language: 'pt',
          category: 'test'
        },
        {
          source_term: 'Engine',
          target_term: 'Motor',
          source_language: 'en',
          target_language: 'pt',
          category: 'test'
        }
      ];

      const importResult = Glossary.importFromArray(importEntries);
      if (!importResult || importResult.successful < 2) {
        throw new Error('Glossary import did not insert expected entries');
      }

      const entries = Glossary.getAll('en', 'pt');
      const hasToken = entries.some(entry => entry.source_term === 'Token' && entry.target_term === 'TokenPT');
      const hasEngine = entries.some(entry => entry.source_term === 'Engine' && entry.target_term === 'Motor');
      if (!hasToken || !hasEngine) {
        throw new Error('Glossary entries missing after import');
      }

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

      if (!csv.includes('Source Term') || !csv.includes('Target Term')) {
        throw new Error('Glossary export missing headers');
      }
      if (!csv.includes('Token') || !csv.includes('TokenPT')) {
        throw new Error('Glossary export missing imported entries');
      }

      // Cleanup test entries
      const cleanupEntries = entries.filter(entry => entry.category === 'test');
      for (const entry of cleanupEntries) {
        Glossary.delete(entry.id);
      }
    });

    // Translation Job Tests
    await this.runTest('Translation Job Creation', async () => {
      const jobId = TranslationJob.create('__test__.pdf', 'en', 'es', 'deepl', 'pdf', 10);
      const job = TranslationJob.get(jobId);
      if (!job || job.filename !== '__test__.pdf') throw new Error('Job creation failed');
      
      // Clean up: delete chunks first, then job
      TranslationChunk.deleteByJobId(jobId);
      TranslationJob.delete(jobId);
      
      // Verify deletion
      const deletedJob = TranslationJob.get(jobId);
      if (deletedJob) throw new Error('Job deletion failed');
    });

    await this.runTest('Translation Chunk Operations', async () => {
      const jobId = TranslationJob.create('__test__.pdf', 'en', 'es', 'deepl', 'pdf', 2);
      const chunkId = TranslationChunk.add(jobId, 0, 'Test text');
      TranslationChunk.updateTranslation(chunkId, 'Texto de prueba', 'completed');
      const chunks = TranslationChunk.getByJob(jobId);
      if (chunks.length !== 1 || chunks[0].translated_text !== 'Texto de prueba') {
        throw new Error('Chunk operations failed');
      }
      
      // Clean up: delete chunks first, then job
      TranslationChunk.deleteByJobId(jobId);
      TranslationJob.delete(jobId);
      
      // Verify deletion
      const deletedJob = TranslationJob.get(jobId);
      if (deletedJob) throw new Error('Job deletion failed');
    });

    // Document Parser Tests
    await this.runTest('Document Chunk Splitting (Token-based)', async () => {
      // Create realistic text with multiple paragraphs
      const text = 'This is a test paragraph. It has multiple sentences. '.repeat(200); // ~2000 words
      const chunks = DocumentParser.splitIntoChunks(text, 500, true); // 500 tokens, token mode
      if (chunks.length < 2) throw new Error('Text splitting failed - expected multiple chunks');
      // Token chunks can vary in character length, so don't check character limit
    });

    await this.runTest('Document Chunk Splitting (Character-based)', async () => {
      const text = 'A'.repeat(10000);
      const chunks = DocumentParser.splitIntoChunks(text, 3000, false); // Character mode
      if (chunks.length < 3) throw new Error('Text splitting failed');
      if (chunks[0].length > 3000) throw new Error('Chunk size limit exceeded');
    });

    await this.runTest('Document Chunk Merging', async () => {
      const text = 'Paragraph 1.\n\nParagraph 2.\n\nParagraph 3.';
      const chunks = DocumentParser.splitIntoChunks(text, 50, true); // Token mode
      if (chunks.length === 0) throw new Error('No chunks created');
    });

    // API Usage Tracking Tests
    await this.runTest('API Usage Tracking', async () => {
      ApiUsage.track('test_provider', 1000, 5);
      const usage = ApiUsage.getUsageToday('test_provider');
      if (usage.characters_used < 1000) throw new Error('API usage tracking failed');
    });

    // Translation Smoke Tests (matrix)
    const providers = options.providers || ['local', 'deepl', 'google', 'openai', 'chatgpt'];
    const matrix = options.matrix || {};
    const matrixLLM = matrix.llm ?? [false, true];
    const matrixHtml = matrix.htmlMode ?? [false, true];
    const matrixGlossary = matrix.glossary ?? [false, true];

    const runLocalTranslation = async (useLLM, htmlMode, useGlossary) => {
      const localService = new LocalTranslationService(null, {});
      const available = await localService.isAvailable();
      if (!available) {
        return { skipped: true, reason: 'local-translation-not-running' };
      }

      if (useLLM) {
        const ollamaRunning = await ollamaService.isRunning();
        if (!ollamaRunning) {
          return { skipped: true, reason: 'ollama-not-running' };
        }
      }

      const sourceLang = 'en';
      const targetLang = 'pt';
      const text = htmlMode ? '<p>Hello World</p>' : 'Hello World';
      const glossaryTerms = useGlossary
        ? [{ source_term: 'World', target_term: 'Mundo', id: 'test-glossary' }]
        : [];

      const result = await localService.translate(text, sourceLang, targetLang, glossaryTerms, {
        htmlMode,
        useLLM,
        verifyGlossary: useGlossary
      });

      if (!result?.translatedText || typeof result.translatedText !== 'string') {
        throw new Error('Local translation returned empty result');
      }
      if (/GTERM/i.test(result.translatedText)) {
        throw new Error('Glossary token leaked in translation output');
      }
      if (htmlMode && !/<[^>]+>/.test(result.translatedText)) {
        throw new Error('HTML mode lost tags in translation output');
      }
      if (useGlossary && !/\bMundo\b/i.test(result.translatedText)) {
        const preview =
          typeof result.translatedText === 'string'
            ? result.translatedText
            : String(result.translatedText);
        console.warn('⚠️ Glossary enforcement failed. Translated text:', preview);
        throw new Error('Glossary term was not enforced');
      }
    };

    const runProviderTranslation = async (provider, apiKey, label) => {
      const service = new TranslationService(provider, apiKey, {
        model: Settings.get('openai_model') || 'gpt-3.5-turbo'
      });
      const result = await service.translate('Hello world', 'en', 'pt', []);
      if (!result?.translatedText || typeof result.translatedText !== 'string') {
        throw new Error(`${label} returned empty translation`);
      }
    };

    if (providers.includes('local')) {
      for (const useLLM of matrixLLM) {
        for (const htmlMode of matrixHtml) {
          for (const useGlossary of matrixGlossary) {
            const nameParts = [
              'Local Translation Smoke',
              useLLM ? 'LLM' : 'no-LLM',
              htmlMode ? 'html' : 'text',
              useGlossary ? 'glossary' : 'no-glossary'
            ];
            await this.runTest(nameParts.join(' | '), async () => {
              await runLocalTranslation(useLLM, htmlMode, useGlossary);
            });
            if (this.cancelled) break;
          }
          if (this.cancelled) break;
        }
        if (this.cancelled) break;
      }
    }

    if (providers.includes('deepl')) {
      const deeplKey = Settings.get('deepl_api_key');
      if (!deeplKey) {
        this.skipTest('DeepL Translation Smoke', 'missing-api-key');
      } else {
        await this.runTest('DeepL Translation Smoke', async () => {
          await runProviderTranslation('deepl', deeplKey, 'DeepL');
        });
      }
    }

    if (providers.includes('google')) {
      await this.runTest('Google Translation Smoke', async () => {
        await runProviderTranslation('google', null, 'Google');
      });
    }

    if (providers.includes('openai')) {
      const openaiKey = Settings.get('openai_api_key');
      if (!openaiKey) {
        this.skipTest('OpenAI Translation Smoke', 'missing-api-key');
      } else {
        await this.runTest('OpenAI Translation Smoke', async () => {
          await runProviderTranslation('openai', openaiKey, 'OpenAI');
        });
      }
    }

    if (providers.includes('chatgpt')) {
      const chatgptKey = Settings.get('chatgpt_api_key') || Settings.get('openai_api_key');
      if (!chatgptKey) {
        this.skipTest('ChatGPT Translation Smoke', 'missing-api-key');
      } else {
        await this.runTest('ChatGPT Translation Smoke', async () => {
          await runProviderTranslation('chatgpt', chatgptKey, 'ChatGPT');
        });
      }
    }

    // Final cleanup: Remove any remaining test entries
    await this.runTest('Cleanup Test Data', async () => {
      // Delete any jobs with test filenames
      const testJobs = db.prepare("SELECT id FROM translation_jobs WHERE filename LIKE '__test__%' OR filename LIKE 'test.%'").all();
      for (const job of testJobs) {
        TranslationChunk.deleteByJobId(job.id);
        TranslationJob.delete(job.id);
      }
      
      // Delete any test glossary entries
      const testGlossary = db.prepare("SELECT id FROM glossary WHERE category = 'test'").all();
      for (const entry of testGlossary) {
        Glossary.delete(entry.id);
      }
      
      // Delete any test settings
      Settings.delete('test_key');
      
      console.log(`   Cleaned up ${testJobs.length} test job(s) and ${testGlossary.length} test glossary entries`);
    });

    console.log('\n========================================');
    console.log('📊 Test Results');
    console.log('========================================');
    console.log(`✓ Passed: ${this.results.passed}`);
    console.log(`✗ Failed: ${this.results.failed}`);
    console.log(`Total: ${this.results.tests.length}`);
    console.log('========================================\n');

    if (this.shouldCancel && this.shouldCancel()) {
      this.cancelled = true;
    }

    return {
      ...this.results,
      cancelled: this.cancelled
    };
  }

  getResults() {
    return this.results;
  }
}

export default TestRunner;

// Export a convenience function for running tests
export async function runStartupTests() {
  const runner = new TestRunner();
  const results = await runner.runAllTests();
  return results;
}

