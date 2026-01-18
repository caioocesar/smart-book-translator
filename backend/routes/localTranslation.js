import express from 'express';
import libreTranslateManager from '../services/libreTranslateManager.js';
import LocalTranslationService from '../services/localTranslationService.js';
import { LocalTranslationError } from '../utils/errors.js';

const router = express.Router();

// GET /api/local-translation/status - Check LibreTranslate status
router.get('/status', async (req, res, next) => {
  try {
    const health = await libreTranslateManager.healthCheck();
    const status = libreTranslateManager.getStatus();
    const dockerAvailable = await libreTranslateManager.isDockerAvailable();
    const dockerRunning = await libreTranslateManager.isDockerRunning();
    const containerStatus = await libreTranslateManager.isContainerRunning();
    
    // Determine the actual status
    let detailedStatus = status.status || 'stopped';
    let statusMessage = 'LibreTranslate is not running';
    
    if (health.running) {
      detailedStatus = 'running';
      statusMessage = 'LibreTranslate is running and ready';
    } else if (containerStatus.running && containerStatus.booting) {
      detailedStatus = 'booting';
      statusMessage = 'LibreTranslate is starting up (downloading and loading language models - this may take 1-3 minutes)';
    } else if (containerStatus.running && !health.running) {
      detailedStatus = 'starting';
      statusMessage = 'Container is running but service not ready yet';
    }
    
    res.json({
      ...health,
      ...status,
      status: detailedStatus,
      statusMessage: statusMessage,
      booting: containerStatus.booting,
      dockerAvailable,
      dockerRunning,
      containerId: containerStatus.containerId
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/local-translation/languages - Get supported languages
router.get('/languages', async (req, res, next) => {
  try {
    const languages = await libreTranslateManager.getLanguages();
    res.json({ languages, count: languages.length });
  } catch (error) {
    next(new LocalTranslationError('Failed to get languages', { error: error.message }));
  }
});

// POST /api/local-translation/start - Start LibreTranslate via Docker
router.post('/start', async (req, res, next) => {
  try {
    const result = await libreTranslateManager.startLibreTranslate();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/local-translation/stop - Stop LibreTranslate
router.post('/stop', async (req, res, next) => {
  try {
    const result = await libreTranslateManager.stopLibreTranslate();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/local-translation/test - Test translation
router.post('/test', async (req, res, next) => {
  try {
    const { text = 'Hello, world!', sourceLang = 'en', targetLang = 'pt' } = req.body;
    
    const service = new LocalTranslationService();
    const result = await service.translate(text, sourceLang, targetLang, []);
    
    res.json({
      success: true,
      result,
      message: 'Local translation is working!'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/local-translation/stats - Get usage statistics
router.get('/stats', async (req, res, next) => {
  try {
    const service = new LocalTranslationService();
    const stats = service.getStats();
    
    res.json({
      stats,
      status: libreTranslateManager.getStatus()
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/local-translation/containers - Get container information (debugging)
router.get('/containers', async (req, res, next) => {
  try {
    const containerInfo = await libreTranslateManager.getContainerInfo();
    const dockerRunning = await libreTranslateManager.isDockerRunning();
    const portInUse = await libreTranslateManager.isPortInUse();
    
    res.json({
      docker: {
        available: await libreTranslateManager.isDockerAvailable(),
        running: dockerRunning
      },
      port: portInUse,
      containers: containerInfo
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/local-translation/logs - Get container logs
router.get('/logs', async (req, res, next) => {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    // Get container ID
    const { stdout: containerId } = await execAsync('docker ps --filter "name=libretranslate" --format "{{.ID}}"');
    
    if (!containerId.trim()) {
      return res.json({
        success: false,
        logs: '',
        message: 'No container found'
      });
    }
    
    // Get last 50 lines of logs
    const { stdout: logs } = await execAsync(`docker logs ${containerId.trim()} --tail 50`);
    
    res.json({
      success: true,
      logs: logs,
      containerId: containerId.trim()
    });
  } catch (error) {
    res.json({
      success: false,
      logs: '',
      error: error.message
    });
  }
});

// GET /api/local-translation/resources - Get system and container resource usage
router.get('/resources', async (req, res, next) => {
  try {
    const os = await import('os');
    
    // Get system resources
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    const systemResources = {
      cpu: {
        model: os.cpus()[0]?.model || 'Unknown',
        cores: os.cpus().length,
        usage: await getCPUUsage()
      },
      memory: {
        total: totalMem,
        totalGB: (totalMem / (1024 ** 3)).toFixed(2),
        free: freeMem,
        freeGB: (freeMem / (1024 ** 3)).toFixed(2),
        used: usedMem,
        usedGB: (usedMem / (1024 ** 3)).toFixed(2),
        usagePercent: ((usedMem / totalMem) * 100).toFixed(2)
      },
      platform: os.platform(),
      arch: os.arch()
    };

    // Get Docker container stats if running
    let containerStats = null;
    const health = await libreTranslateManager.healthCheck();
    
    if (health.running) {
      try {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        
        // Get container ID
        const { stdout: containerId } = await execAsync('docker ps --filter "ancestor=libretranslate/libretranslate" --format "{{.ID}}"');
        
        if (containerId.trim()) {
          // Get container stats
          const { stdout: statsOutput } = await execAsync(`docker stats ${containerId.trim()} --no-stream --format "{{.CPUPerc}},{{.MemUsage}},{{.MemPerc}}"`);
          const [cpuPerc, memUsage, memPerc] = statsOutput.trim().split(',');
          
          containerStats = {
            cpu: cpuPerc || 'N/A',
            cpuPercent: parseFloat(cpuPerc) || 0,
            memory: memUsage || 'N/A',
            memoryPercent: parseFloat(memPerc) || 0
          };
        }
      } catch (error) {
        // Non-fatal: container stats are optional
        console.warn('Failed to get container stats:', error.message);
      }
    }

    res.json({
      system: systemResources,
      container: containerStats,
      libreTranslate: {
        running: health.running,
        url: health.url
      }
    });
  } catch (error) {
    next(error);
  }
});

// Helper function to calculate CPU usage
async function getCPUUsage() {
  const os = await import('os');
  
  // Get initial CPU info
  const cpus1 = os.cpus();
  const idle1 = cpus1.reduce((acc, cpu) => acc + cpu.times.idle, 0);
  const total1 = cpus1.reduce((acc, cpu) => 
    acc + cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq, 0);
  
  // Wait 100ms
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Get CPU info again
  const cpus2 = os.cpus();
  const idle2 = cpus2.reduce((acc, cpu) => acc + cpu.times.idle, 0);
  const total2 = cpus2.reduce((acc, cpu) => 
    acc + cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq, 0);
  
  // Calculate usage
  const idleDiff = idle2 - idle1;
  const totalDiff = total2 - total1;
  const usage = 100 - (100 * idleDiff / totalDiff);
  
  return usage.toFixed(2);
}

export default router;
