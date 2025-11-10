# Changelog

All notable changes to Smart Book Translator will be documented in this file.

## [1.0.0] - 2025-11-10

### 🔐 Security Enhancements

#### Added
- **API Key Encryption**: All API keys now encrypted with AES-256-CBC before database storage
- **Encryption Utility**: New encryption/decryption module with industry-standard algorithms
- **Secure Settings Model**: Automatic encryption for sensitive keys (deepl_api_key, openai_api_key)
- **Password Input Fields**: API keys masked in all input fields
- **Security Documentation**: Comprehensive SECURITY.md with best practices
- **Test Connection Buttons**: Validate API keys in both Translation and Settings tabs
- **Connection Feedback**: Real-time success/failure messages with test translations

### 🧪 Testing Features

#### Added
- **Automated Test Suite**: Comprehensive unit and integration tests
- **Startup Tests**: Automatic system validation when backend starts
- **Test Runner**: Structured test execution with detailed reporting
- **Health Check Endpoints**: `/api/health/test` for system diagnostics
- **System Status UI**: Real-time test results and system information panel
- **Test Categories**: 
  - Database connectivity
  - Table schema validation
  - Encryption/decryption
  - Settings operations
  - Glossary functionality
  - Translation job management
  - Document parsing
  - API usage tracking

### 🎨 UI Improvements

#### Added
- **System Status Button**: Header button to view health and test results
- **Connection Test UI**: Inline test results with visual feedback
- **Security Notes**: Prominent encryption notices near API key fields
- **Animated Feedback**: Smooth animations for test results
- **Test Details Panel**: Expandable system information and test breakdown
- **Color-Coded Results**: Green for pass, red for fail, yellow for warnings

### 🔧 Technical Improvements

#### Added
- **Health Routes**: New `/api/health/*` endpoints for monitoring
- **Encryption Module**: `backend/utils/encryption.js`
- **Test Runner**: `backend/tests/testRunner.js`
- **SystemStatus Component**: `frontend/src/components/SystemStatus.jsx`
- **Enhanced Error Handling**: Better encryption error recovery

#### Changed
- Settings model now automatically encrypts/decrypts sensitive keys
- Server startup includes automated test execution
- API health check returns more detailed information
- Frontend displays encrypted storage notices

### 📚 Documentation

#### Added
- **SECURITY.md**: Complete security documentation
- **CHANGELOG.md**: This file
- Security best practices guide
- Threat model and limitations
- Security checklist for production
- Testing documentation

#### Updated
- README.md with security features section
- README.md with testing information
- Installation instructions include security notes

### 🐛 Bug Fixes
- Fixed potential memory leaks with API keys in frontend state
- Improved error messages for encryption failures
- Better handling of corrupted encrypted data

---

## [0.9.0] - 2025-11-09

### Initial Release

#### Features
- Document translation (EPUB, DOCX, PDF)
- Multiple AI providers (DeepL, OpenAI)
- Glossary management with CSV import/export
- Settings panel for API configuration
- Progress tracking with real-time updates
- Translation caching and retry logic
- Beautiful modern UI with tabs
- Cross-platform installation scripts
- Desktop launcher support
- Comprehensive documentation

---

## Version History Summary

- **v1.0.0**: Security & Testing enhancements
- **v0.9.0**: Initial release with core features

---

**Note**: Following [Semantic Versioning](https://semver.org/)
- MAJOR version for incompatible API changes
- MINOR version for new functionality (backwards compatible)
- PATCH version for backwards compatible bug fixes


