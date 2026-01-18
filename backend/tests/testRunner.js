import db from '../database/db.js';
import Settings from '../models/Settings.js';
import Glossary from '../models/Glossary.js';
import { TranslationJob, TranslationChunk, ApiUsage } from '../models/TranslationJob.js';
import DocumentParser from '../services/documentParser.js';
import Encryption from '../utils/encryption.js';

class TestRunner {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async runTest(name, testFn) {
    try {
      await testFn();
      this.results.passed++;
      this.results.tests.push({ name, status: 'passed', error: null });
      console.log(`✓ ${name}`);
    } catch (error) {
      this.results.failed++;
      this.results.tests.push({ name, status: 'failed', error: error.message });
      console.error(`✗ ${name}:`, error.message);
    }
  }

  async runAllTests() {
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
      const id = Glossary.add('test', 'prueba', 'en', 'es', 'test');
      const entries = Glossary.getAll();
      const found = entries.find(e => e.id === id);
      if (!found || found.source_term !== 'test') throw new Error('Glossary add/retrieve failed');
      Glossary.delete(id);
    });

    await this.runTest('Glossary Search', async () => {
      const id = Glossary.add('hello', 'hola', 'en', 'es');
      const result = Glossary.search('hello', 'en', 'es');
      if (!result || result.target_term !== 'hola') throw new Error('Glossary search failed');
      Glossary.delete(id);
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
    await this.runTest('Document Chunk Splitting', async () => {
      const text = 'A'.repeat(10000);
      const chunks = DocumentParser.splitIntoChunks(text, 3000);
      if (chunks.length < 3) throw new Error('Text splitting failed');
      if (chunks[0].length > 3000) throw new Error('Chunk size limit exceeded');
    });

    await this.runTest('Document Chunk Merging', async () => {
      const text = 'Paragraph 1.\n\nParagraph 2.\n\nParagraph 3.';
      const chunks = DocumentParser.splitIntoChunks(text, 50);
      if (chunks.length === 0) throw new Error('No chunks created');
    });

    // API Usage Tracking Tests
    await this.runTest('API Usage Tracking', async () => {
      ApiUsage.track('test_provider', 1000, 5);
      const usage = ApiUsage.getUsageToday('test_provider');
      if (usage.characters_used < 1000) throw new Error('API usage tracking failed');
    });

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

    return this.results;
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

