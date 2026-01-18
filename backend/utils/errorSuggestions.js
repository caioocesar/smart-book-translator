/**
 * Error Suggestions Engine
 * Maps common error codes/messages to helpful suggestions for users
 */

const errorSuggestions = {
  // Network and Connection Errors
  'ECONNREFUSED': 'LibreTranslate is not running. Click "Start Local Translation" in the app or run: docker run -p 5001:5000 libretranslate/libretranslate',
  'ETIMEDOUT': 'Request timed out. Check your internet connection or try increasing the timeout in Settings.',
  'ENOTFOUND': 'Could not resolve hostname. Check your internet connection and DNS settings.',
  'ECONNRESET': 'Connection was reset. This may be temporary - try again in a few seconds.',
  'EHOSTUNREACH': 'Host is unreachable. Check your internet connection or firewall settings.',
  
  // API-specific Errors
  'RATE_LIMIT_EXCEEDED': 'Rate limit exceeded. Wait 60 seconds before retrying, or switch to local translation (free, unlimited).',
  'INVALID_API_KEY': 'Invalid API key. Check your API key in the Settings tab and test the connection.',
  'INSUFFICIENT_QUOTA': 'API quota exceeded. Upgrade your API plan or switch to local translation (free).',
  'API_KEY_EXPIRED': 'API key has expired. Generate a new key from your provider\'s dashboard.',
  
  // Translation Errors
  'TRANSLATION_FAILED': 'Translation failed. Try reducing the chunk size in Settings or use a different translation provider.',
  'UNSUPPORTED_LANGUAGE': 'Language pair not supported by this provider. Try a different translation service or check the language codes.',
  'TEXT_TOO_LONG': 'Text chunk is too long for this API. Reduce the chunk size in Settings.',
  
  // Document Errors
  'DOCUMENT_PARSE_ERROR': 'Failed to parse document. Ensure the file is not corrupted and is a valid EPUB, DOCX, or PDF file.',
  'DOCUMENT_TOO_LARGE': 'Document is too large. Try splitting it into smaller parts or increasing the chunk size.',
  'UNSUPPORTED_FORMAT': 'File format not supported. Only EPUB, DOCX, and PDF files are accepted.',
  
  // Glossary Errors
  'GLOSSARY_IMPORT_FAILED': 'Failed to import glossary. Ensure the CSV file has the correct format: Source Term, Target Term, Source Language, Target Language, Category.',
  'GLOSSARY_DUPLICATE': 'Glossary entry already exists for this language pair. Update the existing entry instead.',
  
  // Database Errors
  'DATABASE_ERROR': 'Database error occurred. Try restarting the application. If the problem persists, check the database file permissions.',
  'DATABASE_LOCKED': 'Database is locked by another process. Close other instances of the application and try again.',
  
  // Local Translation Errors
  'LIBRETRANSLATE_NOT_RUNNING': 'LibreTranslate is not running. Start it by clicking "Start Local Translation" or run: docker run -p 5001:5000 libretranslate/libretranslate',
  'LIBRETRANSLATE_DOCKER_NOT_FOUND': 'Docker is not installed or not running. Install Docker Desktop from https://www.docker.com/get-started or install LibreTranslate manually with: pip install libretranslate',
  'LOCAL_TRANSLATION_LANGUAGE_NOT_AVAILABLE': 'This language pair is not available in your LibreTranslate installation. Install additional language models or use a cloud API.',
  
  // Configuration Errors
  'MISSING_CONFIGURATION': 'Required configuration is missing. Check the Settings tab and ensure all required fields are filled.',
  'INVALID_CONFIGURATION': 'Invalid configuration value. Check the Settings tab and correct any invalid entries.',
  
  // General Errors
  'UNAUTHORIZED': 'Authentication required. Please provide valid API credentials in the Settings tab.',
  'FORBIDDEN': 'Access forbidden. Check your API plan permissions or API key validity.',
  'NOT_FOUND': 'Resource not found. The requested item may have been deleted or moved.',
  'INTERNAL_SERVER_ERROR': 'Internal server error. Please try again. If the problem persists, check the application logs.',
  'SERVICE_UNAVAILABLE': 'Service temporarily unavailable. Try again in a few minutes.',
  
  // Chunk-specific Errors
  'CHUNK_TRANSLATION_FAILED': 'Failed to translate a chunk. The job will retry automatically. If many chunks fail, check your API key and internet connection.',
  'ALL_CHUNKS_FAILED': 'All translation chunks failed. Check your API configuration, internet connection, and API quota.',
};

/**
 * Get a helpful suggestion based on error code or message
 * @param {string} errorCode - Error code (e.g., 'ECONNREFUSED')
 * @param {string} errorMessage - Error message
 * @returns {string|null} - Suggestion or null if no suggestion available
 */
export function getSuggestion(errorCode, errorMessage = '') {
  // Try exact match on error code
  if (errorCode && errorSuggestions[errorCode]) {
    return errorSuggestions[errorCode];
  }
  
  // Try to match keywords in error message
  const message = errorMessage.toLowerCase();
  
  if (message.includes('rate limit')) {
    return errorSuggestions['RATE_LIMIT_EXCEEDED'];
  }
  if (message.includes('api key') && (message.includes('invalid') || message.includes('unauthorized'))) {
    return errorSuggestions['INVALID_API_KEY'];
  }
  if (message.includes('quota') || message.includes('billing')) {
    return errorSuggestions['INSUFFICIENT_QUOTA'];
  }
  if (message.includes('timeout')) {
    return errorSuggestions['ETIMEDOUT'];
  }
  if (message.includes('connection') && message.includes('refused')) {
    return errorSuggestions['ECONNREFUSED'];
  }
  if (message.includes('libretranslate') && message.includes('not') && message.includes('running')) {
    return errorSuggestions['LIBRETRANSLATE_NOT_RUNNING'];
  }
  if (message.includes('docker') && message.includes('not found')) {
    return errorSuggestions['LIBRETRANSLATE_DOCKER_NOT_FOUND'];
  }
  if (message.includes('parse') || message.includes('parsing')) {
    return errorSuggestions['DOCUMENT_PARSE_ERROR'];
  }
  if (message.includes('language') && (message.includes('not supported') || message.includes('unsupported'))) {
    return errorSuggestions['UNSUPPORTED_LANGUAGE'];
  }
  
  return null;
}

export default errorSuggestions;
