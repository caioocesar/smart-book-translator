import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import net from 'net';

// Import routes
import translationRoutes from './routes/translation.js';
import glossaryRoutes from './routes/glossary.js';
import settingsRoutes from './routes/settings.js';
import healthRoutes from './routes/health.js';
import termLookupRoutes from './routes/termLookup.js';
import apiPlansRoutes from './routes/apiPlans.js';
import documentAnalysisRoutes from './routes/documentAnalysis.js';
import localTranslationRoutes from './routes/localTranslation.js';

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

async function runStartupTests() {
  console.log('\n🚀 Starting Smart Book Translator...\n');
  const runner = new TestRunner();
  const results = await runner.runAllTests();
  
  if (results.failed > 0) {
    console.warn('⚠️  Some tests failed. System may not work correctly.');
  } else {
    console.log('✅ All system tests passed!\n');
  }
  
  return results;
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

    // Check for existing containers that might be blocking the port
    const existingContainers = await libreTranslateManager.getAllLibreTranslateContainers();
    if (existingContainers.length > 0) {
      console.log(`🧹 Found ${existingContainers.length} existing LibreTranslate container(s), cleaning up...`);
    }

    // Start LibreTranslate
    console.log('🚀 Auto-starting LibreTranslate...');
    console.log('   ⏳ This may take 10-30 seconds on first run (downloading Docker image)');
    console.log('   ⏳ Subsequent starts will be much faster');
    
    const result = await libreTranslateManager.startLibreTranslate();
    
    if (result.success) {
      console.log('✅ LibreTranslate started successfully!');
      console.log(`   📍 Running at: ${libreTranslateManager.getEffectiveUrl()}`);
      console.log(`   🌍 Available languages: ${result.languageCount || 'checking...'}`);
    } else {
      console.log(`⚠️  Failed to auto-start LibreTranslate`);
      console.log(`   Error: ${result.message}`);
      console.log('   💡 You can start it manually from the Local Translation panel');
      console.log('   💡 Or run: docker run -d -p 5001:5000 --name libretranslate libretranslate/libretranslate');
    }
  } catch (error) {
    console.error('⚠️  Error during LibreTranslate auto-start:', error.message);
    console.log('   💡 You can start it manually from the Local Translation panel');
  }
}

startServer();

