# 🧪 Smart Book Translator - Test Suite

## Overview

This directory contains the comprehensive test suite for the Smart Book Translator backend. The tests are automatically run on server startup to ensure everything is working correctly.

## Test Runner

**File**: `testRunner.js`

The test runner provides a framework for executing unit and integration tests, with detailed reporting of results.

## Test Coverage

### 🗄️ Database Tests (4 tests)

1. **Database Connection**
   - Verifies SQLite database is accessible
   - Tests basic query execution

2. **Settings Table Exists**
   - Confirms settings table is created
   - Validates schema integrity

3. **Glossary Table Exists**
   - Confirms glossary table is created
   - Validates schema integrity

4. **Translation Jobs Table Exists**
   - Confirms translation_jobs table is created
   - Validates schema integrity

### 🔐 Security Tests (3 tests)

5. **Encryption/Decryption**
   - Tests AES-256-CBC encryption
   - Verifies encryption roundtrip
   - Ensures data can be encrypted and decrypted correctly

6. **Hash Function**
   - Tests SHA-256 hashing
   - Verifies deterministic output
   - Ensures consistent hashing

7. **Settings Encryption for API Keys**
   - Verifies API keys are encrypted before storage
   - Tests decryption on retrieval
   - Ensures keys are never stored in plain text

### ⚙️ Settings Tests (1 test)

8. **Settings CRUD Operations**
   - Tests Create, Read, Update, Delete
   - Verifies data persistence
   - Tests cleanup

### 📖 Glossary Tests (2 tests)

9. **Glossary Add/Retrieve**
   - Tests adding new terms
   - Verifies retrieval
   - Tests deletion

10. **Glossary Search**
    - Tests search by source term
    - Tests language filtering
    - Verifies translation lookup

### 📝 Translation Job Tests (2 tests)

11. **Translation Job Creation**
    - Tests job creation
    - Verifies job retrieval
    - Tests job deletion

12. **Translation Chunk Operations**
    - Tests chunk creation
    - Tests chunk updates
    - Verifies chunk-job relationship

### 📄 Document Parser Tests (2 tests)

13. **Document Chunk Splitting**
    - Tests splitting long text
    - Verifies chunk size limits
    - Ensures proper segmentation

14. **Document Chunk Merging**
    - Tests paragraph-aware splitting
    - Verifies content preservation

### 📊 API Usage Tests (1 test)

15. **API Usage Tracking**
    - Tests character counting
    - Tests request counting
    - Verifies usage retrieval

## Total Test Count

**15+ Comprehensive Tests**

- ✅ 4 Database Tests
- ✅ 3 Security Tests
- ✅ 1 Settings Test
- ✅ 2 Glossary Tests
- ✅ 2 Translation Job Tests
- ✅ 2 Document Parser Tests
- ✅ 1 API Usage Test

## Running Tests

### Automatic (On Startup)

Tests run automatically when the backend server starts:

```bash
cd backend
npm start
```

You'll see output like:

```
========================================
🧪 Running System Tests...
========================================

✓ Database Connection
✓ Settings Table Exists
✓ Glossary Table Exists
✓ Translation Jobs Table Exists
✓ Encryption/Decryption
✓ Hash Function
✓ Settings CRUD Operations
✓ Settings Encryption for API Keys
✓ Glossary Add/Retrieve
✓ Glossary Search
✓ Translation Job Creation
✓ Translation Chunk Operations
✓ Document Chunk Splitting
✓ Document Chunk Merging
✓ API Usage Tracking

========================================
📊 Test Results
========================================
✓ Passed: 15
✗ Failed: 0
Total: 15
========================================
```

### Via API

```bash
# Get test results
curl http://localhost:5000/api/health/test
```

Response:

```json
{
  "passed": 15,
  "failed": 0,
  "tests": [
    {
      "name": "Database Connection",
      "status": "passed",
      "error": null
    },
    ...
  ]
}
```

### Via UI

1. Click **"🔧 System Status"** button in the app header
2. View test results in the System Status panel
3. See which tests passed/failed
4. Expand details for error messages

## Test Results Interpretation

### ✓ All Passed (Green)

Everything is working correctly. The system is healthy and ready to use.

### ✗ Some Failed (Red)

If any tests fail:

1. Check the error message
2. Verify database file exists (`backend/data/translator.db`)
3. Ensure environment variables are set correctly
4. Check file permissions
5. Review backend logs

## Test Philosophy

### Unit Tests

- Test individual components in isolation
- Fast execution
- No external dependencies where possible

### Integration Tests

- Test components working together
- Database interactions
- Service integrations

### Automated Testing

- Run on every startup
- Catch issues early
- Provide immediate feedback

## Adding New Tests

To add a new test, edit `testRunner.js`:

```javascript
await this.runTest('Your Test Name', async () => {
  // Your test code here
  if (condition !== expected) {
    throw new Error('Test failed: reason');
  }
});
```

## Test Best Practices

1. **Clean Up After Tests**
   - Delete test data after assertions
   - Don't leave test artifacts

2. **Use Descriptive Names**
   - Clear test names help debugging
   - Names should indicate what's being tested

3. **Test One Thing**
   - Each test should verify one behavior
   - Makes failures easier to diagnose

4. **Handle Errors Gracefully**
   - Throw descriptive error messages
   - Include context in errors

5. **Keep Tests Fast**
   - Tests run on every startup
   - Slow tests delay development

## Continuous Improvement

The test suite is continuously expanded as new features are added. Each new feature should include:

- Unit tests for individual functions
- Integration tests for component interactions
- Error handling tests
- Edge case tests

## Support

If tests fail and you're not sure why:

1. Read the error message carefully
2. Check the terminal output for details
3. Review recent code changes
4. Verify system dependencies are installed
5. Check file permissions and paths

## Related Documentation

- [SECURITY.md](../../SECURITY.md) - Security features and testing
- [README.md](../../README.md) - Main project documentation
- [CONTRIBUTING.md](../../CONTRIBUTING.md) - Development guidelines


