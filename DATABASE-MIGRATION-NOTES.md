# Database Migration: better-sqlite3 → SQL.js

## Overview
The application was migrated from `better-sqlite3` (native SQLite) to `sql.js` (WebAssembly SQLite) for better cross-platform compatibility.

## Key Differences

### 1. **Database Initialization**
```javascript
// better-sqlite3 (OLD)
import Database from 'better-sqlite3';
const db = new Database('translator.db');

// SQL.js (NEW)
import initSqlJs from 'sql.js';
const SQL = await initSqlJs();
const db = new SQL.Database(buffer); // Load from file buffer
```

### 2. **Persistence**
- **better-sqlite3**: Automatically persists to disk
- **SQL.js**: In-memory database, must manually save to disk

```javascript
function saveDatabase() {
  const data = sqlDb.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}
```

### 3. **Statement Execution**

#### Simple SQL (CREATE, ALTER, DELETE without params)
```javascript
// Use exec() for DDL and non-parameterized statements
db.exec('CREATE TABLE users (id INTEGER PRIMARY KEY)');
db.exec('BEGIN TRANSACTION');
db.exec('COMMIT');
```

#### Parameterized Queries
```javascript
// Prepare statement, bind params, step through results
const stmt = db.prepare('INSERT INTO users (name) VALUES (?)');
stmt.bind(['John']);
stmt.step(); // Execute
stmt.free(); // Clean up
```

> Note: In SQL.js there is **no `db.run()`** like better-sqlite3. Use `db.exec()` for non-parameterized SQL, and `db.prepare()` + `stmt.bind()` + `stmt.step()` (or `stmt.run(...)`) for parameterized statements.

### 4. **Transactions**

**SQL.js doesn't have a built-in transaction API**, so we created a wrapper:

```javascript
transaction(callback) {
  return function(items) {
    try {
      db.exec('BEGIN TRANSACTION');
      callback(items);
      db.exec('COMMIT');
      saveDatabase();
    } catch (error) {
      db.exec('ROLLBACK');
      saveDatabase();
      throw error;
    }
  };
}
```

## DatabaseWrapper API

Our wrapper provides a better-sqlite3-compatible API:

### `exec(sql)`
Execute non-parameterized SQL statements.
```javascript
db.exec('CREATE TABLE users (id INTEGER PRIMARY KEY)');
db.exec('DELETE FROM users');
```

### `prepare(sql)`
Returns an object with `run()`, `get()`, and `all()` methods.

#### `run(...params)`
Execute INSERT/UPDATE/DELETE with parameters.
```javascript
const stmt = db.prepare('INSERT INTO users (name) VALUES (?)');
stmt.run('John'); // Returns { changes: 1 }
```

#### `get(...params)`
Get single row.
```javascript
const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
const user = stmt.get(1); // Returns { id: 1, name: 'John' } or undefined
```

#### `all(...params)`
Get all rows.
```javascript
const stmt = db.prepare('SELECT * FROM users');
const users = stmt.all(); // Returns array of objects
```

### `transaction(callback)`
Create a transaction wrapper.
```javascript
const insertMany = db.transaction((items) => {
  const stmt = db.prepare('INSERT INTO users (name) VALUES (?)');
  for (const item of items) {
    stmt.run(item.name);
  }
});

insertMany([{ name: 'John' }, { name: 'Jane' }]);
```

## Common Issues & Solutions

### Issue 1: "cannot commit - no transaction is active"
**Cause**: Using `db.run()` instead of `db.exec()` for transaction commands.

**Solution**: Use `db.exec()` for BEGIN/COMMIT/ROLLBACK:
```javascript
// ❌ Wrong
db.run('BEGIN TRANSACTION');

// ✅ Correct
db.exec('BEGIN TRANSACTION');
```

### Issue 2: Statement not freed
**Cause**: Forgetting to call `stmt.free()` after use.

**Solution**: Always free statements in try/finally:
```javascript
const stmt = db.prepare(sql);
try {
  stmt.bind(params);
  stmt.step();
  return stmt.getAsObject();
} finally {
  stmt.free();
}
```

### Issue 3: Database not persisting
**Cause**: Forgetting to call `saveDatabase()` after modifications.

**Solution**: Our wrapper automatically calls `saveDatabase()` after every operation.

## Migration Checklist

- [x] Replace `better-sqlite3` with `sql.js` in package.json
- [x] Update database initialization
- [x] Implement DatabaseWrapper class
- [x] Add saveDatabase() calls after all modifications
- [x] Fix exec() to use db.exec() not db.run()
- [x] Fix prepare().run() to properly execute statements
- [x] Implement transaction() method
- [x] Test all CRUD operations
- [x] Test transactions (CSV import)
- [x] Test concurrent operations

## Performance Notes

1. **SQL.js is slower** than better-sqlite3 (WebAssembly vs native)
2. **Every operation saves to disk** - consider batching for performance
3. **In-memory database** - entire DB loaded into RAM
4. **Good for**: Cross-platform compatibility, small-medium databases
5. **Not ideal for**: Very large databases, high-frequency writes

## Files Modified

- `backend/database/db.js` - Main database wrapper
- `backend/models/Glossary.js` - Uses transactions
- `backend/models/TranslationJob.js` - Added batch insert with transactions
- `backend/routes/translation.js` - Uses batch operations
- `backend/package.json` - Dependency change

## Testing

To test the database operations:

1. **CSV Import** (tests transactions):
   ```bash
   # Import a CSV file with 100+ entries
   # Should complete without "cannot commit" error
   ```

2. **Translation Job** (tests batch inserts):
   ```bash
   # Upload a document with 50+ chunks
   # Should create job and all chunks in one transaction
   ```

3. **Concurrent Operations** (tests locking):
   ```bash
   # Start multiple translations simultaneously
   # Should handle without corruption
   ```

## References

- [SQL.js Documentation](https://sql.js.org/documentation/)
- [SQL.js GitHub](https://github.com/sql-js/sql.js)
- [SQLite Transaction Documentation](https://www.sqlite.org/lang_transaction.html)
