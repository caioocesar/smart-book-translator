import express from 'express';
import TestRunner from '../tests/testRunner.js';
import db from '../database/db.js';

const router = express.Router();
let cachedTestResults = null;
let lastTestRun = null;

// Basic health check
router.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Smart Book Translator API is running',
    timestamp: new Date().toISOString()
  });
});

// Run system tests
router.get('/test', async (req, res) => {
  try {
    const runner = new TestRunner();
    const results = await runner.runAllTests();
    
    cachedTestResults = results;
    lastTestRun = new Date().toISOString();
    
    res.json({
      status: results.failed === 0 ? 'healthy' : 'degraded',
      results,
      timestamp: lastTestRun
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// Get cached test results
router.get('/test/results', (req, res) => {
  res.json({
    results: cachedTestResults,
    lastRun: lastTestRun,
    cached: true
  });
});

// System info
router.get('/info', (req, res) => {
  try {
    // Check database
    const dbCheck = db.prepare('SELECT COUNT(*) as count FROM sqlite_master WHERE type="table"').get();
    
    // Get stats
    const jobCount = db.prepare('SELECT COUNT(*) as count FROM translation_jobs').get();
    const glossaryCount = db.prepare('SELECT COUNT(*) as count FROM glossary').get();
    
    res.json({
      status: 'ok',
      database: {
        connected: true,
        tables: dbCheck.count
      },
      stats: {
        jobs: jobCount.count,
        glossaryEntries: glossaryCount.count
      },
      node: process.version,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

export default router;


