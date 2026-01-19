import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import net from 'net';

// Import models
import Settings from './models/Settings.js';

// Import routes
import translationRoutes from './routes/translation.js';
import glossaryRoutes from './routes/glossary.js';
import settingsRoutes from './routes/settings.js';
import healthRoutes from './routes/health.js';
import termLookupRoutes from './routes/termLookup.js';
import apiPlansRoutes from './routes/apiPlans.js';
import documentAnalysisRoutes from './routes/documentAnalysis.js';
import localTranslationRoutes from './routes/localTranslation.js';
import ollamaRoutes from './routes/ollama.js';

// Import error handling middleware
import errorHandler, { notFoundHandler, setupGlobalErrorHandlers } from './middleware/errorHandler.js';

// Import database to initialize
import './database/db.js';

// Run startup tests
import TestRunner from './tests/testRunner.js';

// Import auto-retry service
import autoRetryService from './services/autoRetryService.js';

// Import LibreTranslate manager for auto-start
import libreTranslateManager from './services/libreTranslateManager.js';

// Startup tests are now disabled by default to avoid creating test entries in the database
// They can be manually triggered via the /api/health/test endpoint
async function runStartupTests() {
  console.log('\n🚀 Starting Smart Book Translator...\n');
  console.log('ℹ️  Startup tests disabled (can be run manually via System Status)');
  
  // Return empty results without running tests
  return {
    passed: 0,
    failed: 0,
    tests: [],
    skipped: true
  };
}

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
// Allow multiple frontend origins (for different ports)
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:5173'
];

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('localhost')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const PORT = process.env.PORT || 5000;

// Check if port is available
async function checkPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(true);
      }
    });
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

// Middleware - Allow all localhost origins for development
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for development
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make io accessible to routes
app.set('io', io);

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/translation', translationRoutes);
app.use('/api/glossary', glossaryRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/term-lookup', termLookupRoutes);
app.use('/api/plans', apiPlansRoutes);
app.use('/api/document', documentAnalysisRoutes);
app.use('/api/local-translation', localTranslationRoutes);
app.use('/api/ollama', ollamaRoutes);

// Initialize new pipeline settings
console.log('🔧 Initializing new pipeline settings...');
Settings.initializeNewPipelineSettings();

// Port info endpoint
app.get('/api/port-info', (req, res) => {
  res.json({
    backendPort: httpServer.address()?.port || PORT,
    backendUrl: `http://localhost:${httpServer.address()?.port || PORT}`,
    timestamp: new Date().toISOString()
  });
});

// Serve static files (outputs)
app.use('/outputs', express.static(path.join(__dirname, 'outputs')));

// Serve frontend static files (production mode)
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res, next) => {
  // Skip if it's an API route
  if (req.path.startsWith('/api/') || req.path.startsWith('/outputs/') || req.path.startsWith('/socket.io/')) {
    return next();
  }
  
  // Check if public/index.html exists (production mode)
  const indexPath = path.join(publicPath, 'index.html');
  const fs = require('fs');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    // Development mode - frontend runs separately
    next();
  }
});

// WebSocket connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('subscribe-job', (jobId) => {
    socket.join(`job-${jobId}`);
    console.log(`Client ${socket.id} subscribed to job ${jobId}`);
  });

  socket.on('unsubscribe-job', (jobId) => {
    socket.leave(`job-${jobId}`);
    console.log(`Client ${socket.id} unsubscribed from job ${jobId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Export io for use in other modules
export { io };

// Setup global error handlers for unhandled rejections and exceptions
setupGlobalErrorHandlers();

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Global error handling middleware - must be last
app.use(errorHandler);

// Start server with port check and auto-fallback
async function startServer() {
  let currentPort = PORT;
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const isPortAvailable = await checkPortAvailable(currentPort);
    
    if (isPortAvailable) {
      httpServer.listen(currentPort, async () => {
        console.log(`✅ Server is running on http://localhost:${currentPort}`);
        console.log('✅ Database initialized');
        console.log('✅ WebSocket server ready');
        
        // Run startup tests
        await runStartupTests();
        
        // Fetch API plans information on startup
        try {
          const ApiPlansService = (await import('./services/apiPlansService.js')).default;
          await ApiPlansService.fetchApiPlans();
          console.log('✅ API plans information loaded');
        } catch (error) {
          console.warn('⚠️  Failed to fetch API plans:', error.message);
        }
        
        // Start auto-retry service
        autoRetryService.start();
        
        console.log('🎉 Smart Book Translator is ready!');
        console.log(`\n📝 Backend Port: ${currentPort}`);
        console.log(`📝 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}\n`);
        
        // Save port info to a file for frontend to read
        const fs = await import('fs');
        const portInfo = {
          backendPort: currentPort,
          backendUrl: `http://localhost:${currentPort}`,
          timestamp: new Date().toISOString()
        };
        fs.writeFileSync(
          path.join(__dirname, '../.port-info.json'),
          JSON.stringify(portInfo, null, 2)
        );

        // Auto-start LibreTranslate if enabled
        autoStartLibreTranslate();
        
        // Auto-start Ollama if enabled
        autoStartOllama();
      });
      return;
    }
    
    console.log(`⚠️  Port ${currentPort} is in use, trying ${currentPort + 1}...`);
    currentPort++;
    attempts++;
  }
  
  console.error(`❌ ERROR: Could not find an available port after ${maxAttempts} attempts!`);
  console.error(`Please free up some ports starting from ${PORT}`);
  process.exit(1);
}

/**
 * Auto-start LibreTranslate if Docker is available and setting is enabled
 */
async function autoStartLibreTranslate() {
  try {
    // Check if auto-start is enabled (default: true)
    const Settings = (await import('./models/Settings.js')).default;
    const autoStartEnabled = Settings.get('autoStartLibreTranslate');
    
    // Default to true if not set
    if (autoStartEnabled === false) {
      console.log('ℹ️  LibreTranslate auto-start is disabled');
      return;
    }

    console.log('🐳 Checking LibreTranslate status...');
    
    // Check if Docker is available
    const dockerAvailable = await libreTranslateManager.isDockerAvailable();
    if (!dockerAvailable) {
      console.log('ℹ️  Docker not installed, skipping LibreTranslate auto-start');
      console.log('   💡 Install Docker Desktop from: https://www.docker.com/get-started');
      return;
    }

    // Check if Docker daemon is running
    const dockerRunning = await libreTranslateManager.isDockerRunning();
    if (!dockerRunning) {
      console.log('ℹ️  Docker is installed but not running');
      console.log('   💡 Please start Docker Desktop and restart the app');
      return;
    }

    // Check if already running and healthy
    const health = await libreTranslateManager.healthCheck();
    if (health.running) {
      console.log('✅ LibreTranslate is already running and healthy');
      return;
    }

    // Check if container is already running or booting
    const containerStatus = await libreTranslateManager.isContainerRunning();
    if (containerStatus.running && containerStatus.booting) {
      console.log('🟡 LibreTranslate container is already booting');
      console.log('   ⏳ Waiting for it to finish (this may take 1-3 minutes)...');
      // Don't kill it, just wait for it to be ready
      return;
    }

    // Start LibreTranslate with retries
    console.log('🚀 Auto-starting LibreTranslate...');
    console.log('   ⏳ This may take 10-30 seconds on first run (downloading Docker image)');
    console.log('   ⏳ Subsequent starts will be much faster');
    
    const maxRetries = 3;
    let lastError = null;
    let lastResult = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          console.log(`   🔄 Retry attempt ${attempt}/${maxRetries}...`);
        }
        
        const result = await libreTranslateManager.startLibreTranslate();
        lastResult = result;
        
        if (result.success) {
          // Verify it's actually running by polling health check (reduced frequency: every 10s)
          let verified = false;
          for (let i = 0; i < 6; i++) { // Check for up to 60 seconds (6 * 10s) - reduced frequency
            const health = await libreTranslateManager.healthCheck();
            if (health.running) {
              verified = true;
              break;
            }
            // Reduced frequency: wait 10 seconds between checks
            await new Promise(resolve => setTimeout(resolve, 10000));
          }
          
          if (verified) {
            console.log('✅ LibreTranslate started successfully!');
            console.log(`   📍 Running at: ${libreTranslateManager.getEffectiveUrl()}`);
            console.log(`   🌍 Available languages: ${result.languageCount || 'checking...'}`);
            return;
          } else {
            lastError = new Error('Container started but health check failed');
            console.log(`   ⚠️  Container started but not responding (attempt ${attempt}/${maxRetries})`);
          }
        } else {
          lastError = new Error(result.message);
          console.log(`   ⚠️  Start failed: ${result.message} (attempt ${attempt}/${maxRetries})`);
        }
      } catch (error) {
        lastError = error;
        console.log(`   ⚠️  Error: ${error.message} (attempt ${attempt}/${maxRetries})`);
      }
      
      // Wait before retry (exponential backoff: 5s, 10s, 20s)
      if (attempt < maxRetries) {
        const delay = attempt * 5000;
        console.log(`   ⏳ Waiting ${delay / 1000} seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // All retries failed
    console.log(`⚠️  Failed to auto-start LibreTranslate after ${maxRetries} attempts`);
    console.log(`   Error: ${lastError?.message || lastResult?.message || 'Unknown error'}`);
    console.log('   💡 You can start it manually from the Local Translation panel');
    console.log('   💡 Or run: docker run -d -p 5001:5000 --name libretranslate libretranslate/libretranslate');
  } catch (error) {
    console.error('⚠️  Error during LibreTranslate auto-start:', error.message);
    console.log('   💡 You can start it manually from the Local Translation panel');
  }
}

/**
 * Auto-start Ollama if installed and setting is enabled
 */
async function autoStartOllama() {
  try {
    const ollamaService = (await import('./services/ollamaService.js')).default;
    const Settings = (await import('./models/Settings.js')).default;
    
    // Check if auto-start is enabled (default: true)
    const autoStartEnabled = Settings.get('autoStartOllama');
    
    // Default to true if not set
    if (autoStartEnabled === false) {
      console.log('ℹ️  Ollama auto-start is disabled');
      return;
    }

    console.log('🤖 Checking Ollama status...');
    
    // Check if Ollama is installed
    const installed = await ollamaService.isInstalled();
    if (!installed) {
      console.log('ℹ️  Ollama not installed, skipping auto-start');
      console.log('   💡 Install Ollama from: https://ollama.com');
      return;
    }

    // Check if already running
    const running = await ollamaService.isRunning();
    if (running) {
      console.log('✅ Ollama is already running');
      return;
    }

    // Start Ollama with retries
    console.log('🚀 Auto-starting Ollama...');
    console.log('   ⏳ This may take a few seconds');
    
    let lastError = null;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await ollamaService.start();
        
        if (result.success) {
          console.log('✅ Ollama started successfully!');
          console.log(`   📍 Running at: ${ollamaService.baseUrl}`);
          
          // Verify it's actually running by checking status
          let verified = false;
          for (let i = 0; i < 6; i++) {
            const isRunning = await ollamaService.isRunning();
            if (isRunning) {
              verified = true;
              break;
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
          if (verified) {
            return;
          } else {
            lastError = new Error('Service started but not responding');
          }
        } else {
          lastError = new Error(result.message);
        }
      } catch (error) {
        lastError = error;
        const Logger = (await import('./utils/logger.js')).default;
        Logger.logError('ollama', `Auto-start attempt ${attempt} failed`, error, {});
      }
      
      // Wait before retry (exponential backoff: 5s, 10s)
      if (attempt < maxRetries) {
        const delay = attempt * 5000;
        console.log(`   ⏳ Retrying in ${delay / 1000} seconds... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // All retries failed
    console.log(`⚠️  Failed to auto-start Ollama after ${maxRetries} attempts`);
    console.log(`   Error: ${lastError?.message || 'Unknown error'}`);
    console.log('   💡 You can start it manually from the LLM Enhancement panel');
    console.log('   💡 Or run: ollama serve');
  } catch (error) {
    console.error('⚠️  Error during Ollama auto-start:', error.message);
    console.log('   💡 You can start it manually from the LLM Enhancement panel');
  }
}

startServer();

