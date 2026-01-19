import initSqlJs from 'sql.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create data directory if it doesn't exist
const defaultDataDir = path.join(__dirname, '..', 'data');
const externalDataDir = process.env.SBT_DATA_DIR || process.env.ELECTRON_USER_DATA || null;
const dataDir = externalDataDir
  ? path.join(externalDataDir, 'smart-book-translator')
  : defaultDataDir;
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.SBT_DB_PATH
  ? path.resolve(process.env.SBT_DB_PATH)
  : path.join(dataDir, 'translator.db');

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize SQL.js
const SQL = await initSqlJs();

// Load or create database
let sqlDb;
if (fs.existsSync(dbPath)) {
  try {
    const buffer = fs.readFileSync(dbPath);
    sqlDb = new SQL.Database(buffer);
  } catch (error) {
    console.error('Failed to load database file, creating a new database:', error);
    sqlDb = new SQL.Database();
  }
} else {
  sqlDb = new SQL.Database();
}

console.log(`Database path: ${dbPath}`);

// Save database to disk
function saveDatabase() {
  const data = sqlDb.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

// Wrapper class to provide better-sqlite3-like API
class DatabaseWrapper {
  constructor(database) {
    this.db = database;
    // Avoid exporting/saving while a SQL transaction is open.
    // sql.js export during a transaction can lead to "cannot commit - no transaction is active".
    this._txDepth = 0;
  }

  /**
   * Execute SQL statement (for CREATE TABLE, ALTER TABLE, etc.)
   * SQL.js exec() returns array of results, doesn't throw on success
   */
  exec(sql) {
    this.db.exec(sql);
    if (this._txDepth === 0) {
      saveDatabase();
    }
  }

  /**
   * Prepare a statement for parameterized queries
   * Returns an object with run(), get(), and all() methods
   */
  prepare(sql) {
    const self = this;
    return {
      run(...params) {
        const stmt = self.db.prepare(sql);
        try {
          stmt.bind(params);
          stmt.step(); // Execute the statement
          const changes = self.db.getRowsModified();
          let lastInsertRowid = null;
          try {
            const result = self.db.exec('SELECT last_insert_rowid() as id');
            const value = result?.[0]?.values?.[0]?.[0];
            if (value !== undefined) {
              lastInsertRowid = value;
            }
          } catch {
            lastInsertRowid = null;
          }
          if (self._txDepth === 0) {
            saveDatabase();
          }
          return { changes, lastInsertRowid };
        } finally {
          stmt.free();
        }
      },
      get(...params) {
        const stmt = self.db.prepare(sql);
        try {
          stmt.bind(params);
          let result = undefined;
          if (stmt.step()) {
            result = stmt.getAsObject();
          }
          return result;
        } finally {
          stmt.free();
        }
      },
      all(...params) {
        const results = [];
        const stmt = self.db.prepare(sql);
        try {
          stmt.bind(params);
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          return results;
        } finally {
          stmt.free();
        }
      }
    };
  }

  pragma(pragma) {
    // sql.js doesn't need pragma for foreign keys, it's always enabled
    return this;
  }

  /**
   * Create a transaction wrapper for batch operations
   * Mimics better-sqlite3's transaction API for SQL.js
   * @param {Function} callback - Function to execute within transaction
   * @returns {Function} Transaction executor function
   */
  transaction(callback) {
    const self = this;
    return function(items) {
      const isOuter = self._txDepth === 0;
      const savepointName = `sp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      try {
        // Begin transaction / nested savepoint
        if (isOuter) {
          self.db.exec('BEGIN TRANSACTION');
        } else {
          self.db.exec(`SAVEPOINT ${savepointName}`);
        }
        self._txDepth += 1;
        
        // Execute callback with items
        callback(items);
        
        // Commit / release savepoint
        if (isOuter) {
          self.db.exec('COMMIT');
        } else {
          self.db.exec(`RELEASE SAVEPOINT ${savepointName}`);
        }
        self._txDepth -= 1;
        if (self._txDepth === 0) saveDatabase();
        
        return { changes: self.db.getRowsModified() };
      } catch (error) {
        // Rollback on error
        console.error('Transaction error:', error);
        try {
          if (isOuter) {
            self.db.exec('ROLLBACK');
          } else {
            self.db.exec(`ROLLBACK TO SAVEPOINT ${savepointName}`);
            self.db.exec(`RELEASE SAVEPOINT ${savepointName}`);
          }
        } catch (rollbackError) {
          console.error('Rollback error:', rollbackError);
        } finally {
          // Ensure tx depth is decremented if we began a transaction/savepoint
          if (self._txDepth > 0) self._txDepth -= 1;
          if (self._txDepth === 0) saveDatabase();
        }
        throw error;
      }
    };
  }
}

const db = new DatabaseWrapper(sqlDb);

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

  // Migrations for older translation_jobs schema
  const jobColumns = [
    { name: 'output_format', type: 'TEXT', defaultValue: "'txt'" },
    { name: 'total_chunks', type: 'INTEGER', defaultValue: '0' },
    { name: 'completed_chunks', type: 'INTEGER', defaultValue: '0' },
    { name: 'failed_chunks', type: 'INTEGER', defaultValue: '0' },
    { name: 'error_message', type: 'TEXT', defaultValue: 'NULL' }
  ];
  for (const column of jobColumns) {
    try {
      db.exec(`ALTER TABLE translation_jobs ADD COLUMN ${column.name} ${column.type} DEFAULT ${column.defaultValue}`);
    } catch (e) {
      // Column already exists, ignore
    }
  }

  // Translation chunks table (for caching and retry)
  db.exec(`
    CREATE TABLE IF NOT EXISTS translation_chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      source_text TEXT NOT NULL,
      source_html TEXT,
      translated_text TEXT,
      translated_html TEXT,
      status TEXT NOT NULL,
      retry_count INTEGER DEFAULT 0,
      error_message TEXT,
      next_retry_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (job_id) REFERENCES translation_jobs(id) ON DELETE CASCADE,
      UNIQUE(job_id, chunk_index)
    )
  `);
  
  // Add HTML columns if they don't exist (for existing databases)
  try {
    db.exec(`ALTER TABLE translation_chunks ADD COLUMN source_html TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    db.exec(`ALTER TABLE translation_chunks ADD COLUMN translated_html TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }
  
  // Add next_retry_at column if it doesn't exist (for existing databases)
  try {
    db.exec(`ALTER TABLE translation_chunks ADD COLUMN next_retry_at DATETIME`);
  } catch (e) {
    // Column already exists, ignore
  }
  
  // Add processing_layer column if it doesn't exist (for existing databases)
  // Values: 'translating' (first layer), 'llm-enhancing' (second layer), null (not started/completed)
  try {
    db.exec(`ALTER TABLE translation_chunks ADD COLUMN processing_layer TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }

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



