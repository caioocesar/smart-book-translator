import { AppError } from '../utils/errors.js';
import { getSuggestion } from '../utils/errorSuggestions.js';
import Logger from '../utils/logger.js';

/**
 * Global Error Handler Middleware
 * 
 * Catches all errors in the application and formats them into a consistent structure
 * Provides detailed error information in development and sanitized errors in production
 */

/**
 * Sanitize request body for logging (remove sensitive data)
 */
function sanitizeRequestBody(body) {
  if (!body) return undefined;
  
  const sanitized = { ...body };
  const sensitiveFields = ['apiKey', 'api_key', 'password', 'token', 'secret'];
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  }
  
  return sanitized;
}

/**
 * Extract error code from various error types
 */
function getErrorCode(error) {
  // Check for custom error code
  if (error.code) return error.code;
  
  // Check for HTTP status-based codes
  if (error.statusCode === 429) return 'RATE_LIMIT_EXCEEDED';
  if (error.statusCode === 401) return 'UNAUTHORIZED';
  if (error.statusCode === 403) return 'FORBIDDEN';
  if (error.statusCode === 404) return 'NOT_FOUND';
  if (error.statusCode === 422) return 'VALIDATION_ERROR';
  if (error.statusCode === 503) return 'SERVICE_UNAVAILABLE';
  
  // Check for system error codes
  if (error.errno) {
    const errorMap = {
      'ECONNREFUSED': 'ECONNREFUSED',
      'ETIMEDOUT': 'ETIMEDOUT',
      'ENOTFOUND': 'ENOTFOUND',
      'ECONNRESET': 'ECONNRESET',
      'EHOSTUNREACH': 'EHOSTUNREACH'
    };
    return errorMap[error.code] || error.code;
  }
  
  return 'INTERNAL_SERVER_ERROR';
}

/**
 * Main error handler middleware
 */
export default function errorHandler(err, req, res, next) {
  // Log the error
  Logger.logError('errorHandler', `Error caught: ${err.message}`, err, {
    url: req.url,
    method: req.method,
    statusCode: err.statusCode
  });

  // Determine if this is an operational error
  const isOperational = err.isOperational || err instanceof AppError;
  
  // Get error code
  const errorCode = getErrorCode(err);
  
  // Get suggestion for this error
  const suggestion = getSuggestion(errorCode, err.message);
  
  // Determine status code
  const statusCode = err.statusCode || 500;
  
  // Build error response
  const errorResponse = {
    error: {
      message: err.message || 'An unexpected error occurred',
      statusCode: statusCode,
      code: errorCode,
      timestamp: err.timestamp || new Date().toISOString(),
      isOperational: isOperational,
      
      // Include details if available
      details: err.details || undefined,
      
      // Include suggestion if available
      suggestion: suggestion || undefined,
      
      // Include request info for debugging
      requestInfo: {
        method: req.method,
        url: req.url,
        body: sanitizeRequestBody(req.body),
        query: req.query,
        params: req.params
      }
    }
  };
  
  // Include stack trace only in development mode
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = err.stack;
  }
  
  // For non-operational errors in production, use generic message
  if (!isOperational && process.env.NODE_ENV === 'production') {
    errorResponse.error.message = 'An internal error occurred. Please try again later.';
    errorResponse.error.details = undefined;
  }
  
  // Send error response
  res.status(statusCode).json(errorResponse);
}

/**
 * Handle 404 errors (route not found)
 */
export function notFoundHandler(req, res, next) {
  const error = new AppError(
    `Route not found: ${req.method} ${req.url}`,
    404,
    {
      method: req.method,
      url: req.url,
      availableRoutes: 'Check API documentation for available routes'
    }
  );
  
  next(error);
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors and pass to error middleware
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Handle unhandled promise rejections globally
 */
export function setupGlobalErrorHandlers() {
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Promise Rejection:', reason);
    Logger.logError('unhandledRejection', 'Unhandled Promise Rejection', reason, {
      promise: promise
    });
    
    // In production, you might want to restart the process
    if (process.env.NODE_ENV === 'production') {
      console.error('🔄 Shutting down gracefully...');
      process.exit(1);
    }
  });
  
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    Logger.logError('uncaughtException', 'Uncaught Exception', error, {});
    
    // Always exit on uncaught exceptions
    console.error('🔄 Shutting down...');
    process.exit(1);
  });
}
