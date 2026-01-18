import db from '../database/db.js';
import Logger from '../utils/logger.js';

class Glossary {
  static add(sourceTerm, targetTerm, sourceLanguage, targetLanguage, category = null) {
    const stmt = db.prepare(`
      INSERT INTO glossary (source_term, target_term, source_language, target_language, category)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(source_term, source_language, target_language) DO UPDATE SET
        target_term = excluded.target_term,
        category = excluded.category
    `);
    const result = stmt.run(sourceTerm, targetTerm, sourceLanguage, targetLanguage, category);
    return result.lastInsertRowid;
  }

  static getAll(sourceLanguage = null, targetLanguage = null) {
    let query = 'SELECT * FROM glossary WHERE 1=1';
    const params = [];

    if (sourceLanguage) {
      query += ' AND source_language = ?';
      params.push(sourceLanguage);
    }
    if (targetLanguage) {
      query += ' AND target_language = ?';
      params.push(targetLanguage);
    }

    query += ' ORDER BY source_term';

    const stmt = db.prepare(query);
    return stmt.all(...params);
  }

  static search(term, sourceLanguage, targetLanguage) {
    const stmt = db.prepare(`
      SELECT * FROM glossary 
      WHERE LOWER(source_term) = LOWER(?) 
        AND source_language = ? 
        AND target_language = ?
    `);
    return stmt.get(term, sourceLanguage, targetLanguage);
  }

  static delete(id) {
    const stmt = db.prepare('DELETE FROM glossary WHERE id = ?');
    stmt.run(id);
  }

  static deleteAll() {
    const stmt = db.prepare('DELETE FROM glossary');
    stmt.run();
  }

  static importFromArray(entries) {
    const stmt = db.prepare(`
      INSERT INTO glossary (source_term, target_term, source_language, target_language, category)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(source_term, source_language, target_language) DO UPDATE SET
        target_term = excluded.target_term,
        category = excluded.category
    `);

    let successful = 0;
    let failed = 0;
    let duplicates = 0;
    const errors = [];

    // Check for duplicates before inserting
    const checkStmt = db.prepare(`
      SELECT id FROM glossary 
      WHERE source_term = ? AND source_language = ? AND target_language = ?
    `);

    const transaction = db.transaction((items) => {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        try {
          // Check if entry already exists (duplicate)
          const existing = checkStmt.get(
            item.source_term,
            item.source_language,
            item.target_language
          );
          
          if (existing) {
            duplicates++;
          }
          
          // Insert or update
          stmt.run(
            item.source_term,
            item.target_term,
            item.source_language,
            item.target_language,
            item.category || null
          );
          
          successful++;
        } catch (error) {
          failed++;
          errors.push({
            row: i + 1,
            error: error.message || String(error),
            entry: {
              source_term: item.source_term,
              source_language: item.source_language,
              target_language: item.target_language
            }
          });
          
          // Log individual entry errors without breaking transaction
          Logger.logError('glossary', `Failed to import entry at index ${i}`, error, {
            entry: item
          });
        }
      }
    });

    try {
      transaction(entries);
      
      return {
        successful,
        failed,
        duplicates,
        errors: errors, // Always return array, even if empty
        total: entries.length
      };
    } catch (error) {
      Logger.logError('glossary', 'Transaction failed during import', error, {
        entryCount: entries.length,
        successful,
        failed
      });
      
      // Return partial results if transaction failed
      return {
        successful,
        failed: failed + (entries.length - successful - failed),
        duplicates,
        errors: [
          ...errors,
          {
            row: 'transaction',
            error: `Transaction failed: ${error.message}`
          }
        ],
        total: entries.length
      };
    }
  }
}

export default Glossary;



