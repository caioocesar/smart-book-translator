import express from 'express';
import TestRunner from '../tests/testRunner.js';
import db from '../database/db.js';
import Logger from '../utils/logger.js';

const router = express.Router();
let cachedTestResults = null;
let lastTestRun = null;
let currentTestRun = null;

function startAsyncTestRun(options = {}) {
  const runId = `run_${Date.now()}`;
  const runState = {
    id: runId,
    status: 'running',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    cancelRequested: false,
    results: null,
    options
  };
  currentTestRun = runState;

  const runner = new TestRunner({
    onProgress: (results) => {
      if (currentTestRun?.id === runId) {
        currentTestRun.results = results;
      }
    },
    shouldCancel: () => currentTestRun?.cancelRequested === true
  });

  setImmediate(async () => {
    try {
      const results = await runner.runAllTests(options);
      if (currentTestRun?.id === runId) {
        currentTestRun.results = results;
        currentTestRun.status = results.cancelled
          ? 'cancelled'
          : results.failed === 0
            ? 'healthy'
            : 'degraded';
        currentTestRun.finishedAt = new Date().toISOString();
        cachedTestResults = results;
        lastTestRun = currentTestRun.finishedAt;
      }
    } catch (error) {
      if (currentTestRun?.id === runId) {
        currentTestRun.status = 'error';
        currentTestRun.finishedAt = new Date().toISOString();
        currentTestRun.error = error.message;
      }
    }
  });

  return runState;
}

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

// Start async system tests
router.post('/test/run', (req, res) => {
  try {
    if (currentTestRun && currentTestRun.status === 'running') {
      return res.status(409).json({
        status: 'running',
        runId: currentTestRun.id,
        message: 'A test run is already in progress'
      });
    }
    const options = req.body || {};
    const runState = startAsyncTestRun(options);
    res.json({
      status: 'started',
      runId: runState.id,
      startedAt: runState.startedAt
    });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

// Get async test status
router.get('/test/status/:runId', (req, res) => {
  const { runId } = req.params;
  if (!currentTestRun || currentTestRun.id !== runId) {
    return res.status(404).json({ status: 'not_found', message: 'Test run not found' });
  }
  res.json({
    status: currentTestRun.status,
    runId: currentTestRun.id,
    startedAt: currentTestRun.startedAt,
    finishedAt: currentTestRun.finishedAt,
    results: currentTestRun.results
  });
});

// Cancel async test run
router.post('/test/cancel/:runId', (req, res) => {
  const { runId } = req.params;
  if (!currentTestRun || currentTestRun.id !== runId) {
    return res.status(404).json({ status: 'not_found', message: 'Test run not found' });
  }
  currentTestRun.cancelRequested = true;
  res.json({ status: 'cancelling', runId });
});

// Get cached test results
router.get('/test/results', (req, res) => {
  res.json({
    results: cachedTestResults,
    lastRun: lastTestRun,
    cached: true,
    currentRun: currentTestRun && currentTestRun.status === 'running' ? {
      runId: currentTestRun.id,
      startedAt: currentTestRun.startedAt
    } : null
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

// Get logs
router.get('/logs', (req, res) => {
  try {
    const { type = 'errors', lines = 100 } = req.query;
    const logType = ['errors', 'connections', 'api', 'app'].includes(type) ? type : 'errors';
    const lineCount = parseInt(lines) || 100;
    
    const logs = Logger.getRecentLogs(logType, lineCount);
    
    res.json({
      type: logType,
      count: logs.length,
      logs
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

export default router;



