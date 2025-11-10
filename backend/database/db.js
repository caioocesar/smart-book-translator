import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'translator.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
function initDatabase() {
  // Settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Glossary table
  db.exec(`
    CREATE TABLE IF NOT EXISTS glossary (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_term TEXT NOT NULL,
      target_term TEXT NOT NULL,
      source_language TEXT NOT NULL,
      target_language TEXT NOT NULL,
      category TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(source_term, source_language, target_language)
    )
  `);

  // Translation jobs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS translation_jobs (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      source_language TEXT NOT NULL,
      target_language TEXT NOT NULL,
      api_provider TEXT NOT NULL,
      output_format TEXT NOT NULL,
      status TEXT NOT NULL,
      total_chunks INTEGER DEFAULT 0,
      completed_chunks INTEGER DEFAULT 0,
      failed_chunks INTEGER DEFAULT 0,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Translation chunks table (for caching and retry)
  db.exec(`
    CREATE TABLE IF NOT EXISTS translation_chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      source_text TEXT NOT NULL,
      translated_text TEXT,
      status TEXT NOT NULL,
      retry_count INTEGER DEFAULT 0,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (job_id) REFERENCES translation_jobs(id) ON DELETE CASCADE,
      UNIQUE(job_id, chunk_index)
    )
  `);

  // API usage tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS api_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL,
      characters_used INTEGER DEFAULT 0,
      requests_count INTEGER DEFAULT 0,
      date DATE NOT NULL,
      UNIQUE(provider, date)
    )
  `);

  console.log('Database initialized successfully');
}

initDatabase();

export default db;


