import db from '../database/db.js';

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

    const transaction = db.transaction((items) => {
      for (const item of items) {
        stmt.run(
          item.source_term,
          item.target_term,
          item.source_language,
          item.target_language,
          item.category || null
        );
      }
    });

    transaction(entries);
  }
}

export default Glossary;



