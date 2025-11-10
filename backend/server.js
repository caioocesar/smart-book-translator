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

// Import database to initialize
import './database/db.js';

// Run startup tests
import TestRunner from './tests/testRunner.js';

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

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

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
        
        console.log('🎉 Smart Book Translator is ready!');
        console.log(`\n📝 Backend Port: ${currentPort}`);
        console.log(`📝 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}\n`);
        
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

startServer();

