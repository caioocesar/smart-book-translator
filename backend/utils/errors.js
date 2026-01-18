/**
 * Custom Error Classes for Smart Book Translator
 * 
 * All errors include:
 * - User-friendly message (English)
 * - HTTP status code
 * - Technical details (context, request info)
 * - Stack trace
 * - Suggestions for resolution
 */

class AppError extends Error {
  constructor(message, statusCode = 500, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.isOperational = true; // Distinguishes operational errors from programming errors
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined
    };
  }
}

class TranslationError extends AppError {
  constructor(message, details = {}) {
    super(message, 500, details);
  }
}

class APIConnectionError extends AppError {
  constructor(message, details = {}) {
    super(message, 503, details);
  }
}

class APIAuthenticationError extends AppError {
  constructor(message, details = {}) {
    super(message, 401, details);
  }
}

class RateLimitError extends AppError {
  constructor(message, details = {}) {
    super(message, 429, details);
  }
}

class GlossaryError extends AppError {
  constructor(message, details = {}) {
    super(message, 400, details);
  }
}

class LocalTranslationError extends AppError {
  constructor(message, details = {}) {
    super(message, 503, details);
  }
}

class DocumentParseError extends AppError {
  constructor(message, details = {}) {
    super(message, 422, details);
  }
}

class ValidationError extends AppError {
  constructor(message, details = {}) {
    super(message, 400, details);
  }
}

class NotFoundError extends AppError {
  constructor(message, details = {}) {
    super(message, 404, details);
  }
}

class DatabaseError extends AppError {
  constructor(message, details = {}) {
    super(message, 500, details);
  }
}

class ConfigurationError extends AppError {
  constructor(message, details = {}) {
    super(message, 500, details);
  }
}

export {
  AppError,
  TranslationError,
  APIConnectionError,
  APIAuthenticationError,
  RateLimitError,
  GlossaryError,
  LocalTranslationError,
  DocumentParseError,
  ValidationError,
  NotFoundError,
  DatabaseError,
  ConfigurationError
};
