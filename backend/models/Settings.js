import db from '../database/db.js';
import Encryption from '../utils/encryption.js';

class Settings {
  // Keys that should be encrypted
  static sensitiveKeys = ['deepl_api_key', 'openai_api_key', 'chatgpt_api_key'];

  static get(key) {
    const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
    const result = stmt.get(key);
    if (!result) return null;

    const value = JSON.parse(result.value);
    
    // Decrypt if it's a sensitive key
    if (this.sensitiveKeys.includes(key) && value) {
      try {
        return Encryption.decrypt(value);
      } catch (error) {
        console.error(`Failed to decrypt ${key}:`, error);
        return null;
      }
    }
    
    return value;
  }

  static set(key, value) {
    let storedValue = value;
    
    // Encrypt sensitive data before storing
    if (this.sensitiveKeys.includes(key) && value) {
      try {
        storedValue = Encryption.encrypt(value);
      } catch (error) {
        console.error(`Failed to encrypt ${key}:`, error);
        throw error;
      }
    }

    const stmt = db.prepare(`
      INSERT INTO settings (key, value, updated_at) 
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET 
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(key, JSON.stringify(storedValue));
  }

  static getAll() {
    const stmt = db.prepare('SELECT key, value FROM settings');
    const rows = stmt.all();
    const settings = {};
    rows.forEach(row => {
      const value = JSON.parse(row.value);
      
      // Decrypt sensitive keys
      if (this.sensitiveKeys.includes(row.key) && value) {
        try {
          settings[row.key] = Encryption.decrypt(value);
        } catch (error) {
          console.error(`Failed to decrypt ${row.key}:`, error);
          settings[row.key] = null;
        }
      } else {
        settings[row.key] = value;
      }
    });
    return settings;
  }

  static delete(key) {
    const stmt = db.prepare('DELETE FROM settings WHERE key = ?');
    stmt.run(key);
  }

  // Get masked version for display (show only last 4 chars)
  static getMasked(key) {
    const value = this.get(key);
    if (!value || !this.sensitiveKeys.includes(key)) return value;
    
    if (value.length <= 8) return '****';
    return '****' + value.slice(-4);
  }
}

export default Settings;

