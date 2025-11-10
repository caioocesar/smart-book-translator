import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

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
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
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

// Start server
httpServer.listen(PORT, async () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log('Database initialized');
  console.log('WebSocket server ready');
  
  // Run startup tests
  await runStartupTests();
  
  console.log('🎉 Smart Book Translator is ready!');
  console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log('\n');
});

