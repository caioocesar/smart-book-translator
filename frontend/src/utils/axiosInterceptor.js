import axios from 'axios';

/**
 * Setup Axios Global Interceptor
 * Automatically handles errors from API requests and formats them for ErrorContext
 */

let errorContextInstance = null;

export function setupAxiosInterceptor(errorContext) {
  errorContextInstance = errorContext;

  // Response interceptor
  axios.interceptors.response.use(
    // Success handler - pass through
    (response) => response,
    
    // Error handler
    (error) => {
      // Format error for ErrorContext
      const formattedError = {
        message: extractErrorMessage(error),
        statusCode: error.response?.status || 500,
        code: error.code || error.response?.data?.error?.code || 'UNKNOWN_ERROR',
        timestamp: error.response?.data?.error?.timestamp || new Date().toISOString(),
        details: error.response?.data?.error?.details || {},
        suggestion: error.response?.data?.error?.suggestion || null,
        stack: error.response?.data?.error?.stack || null,
        requestInfo: error.response?.data?.error?.requestInfo || {
          method: error.config?.method?.toUpperCase(),
          url: error.config?.url
        }
      };

      // Show error in modal
      if (errorContextInstance) {
        // Don't show modal for aborted requests
        if (error.code !== 'ERR_CANCELED' && error.code !== 'ECONNABORTED') {
          errorContextInstance.showError(formattedError);
        }
      }

      // Still reject the promise so calling code can handle it if needed
      return Promise.reject(error);
    }
  );

  // Request interceptor (optional - for adding auth tokens, etc.)
  axios.interceptors.request.use(
    (config) => {
      // You can add auth tokens or other headers here if needed
      // config.headers.Authorization = `Bearer ${token}`;
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );
}

/**
 * Extract a user-friendly error message from various error structures
 */
function extractErrorMessage(error) {
  // Check for custom error response structure
  if (error.response?.data?.error?.message) {
    return error.response.data.error.message;
  }

  // Check for standard error response
  if (error.response?.data?.error) {
    if (typeof error.response.data.error === 'string') {
      return error.response.data.error;
    }
  }

  // Check for message field
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  // Check for axios network errors
  if (error.message) {
    // Network errors
    if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
      return 'Network error: Could not connect to the server. Please check your internet connection.';
    }
    
    if (error.code === 'ECONNREFUSED') {
      return 'Connection refused: The server is not running or not reachable.';
    }
    
    if (error.code === 'ETIMEDOUT') {
      return 'Request timed out: The server took too long to respond.';
    }
    
    return error.message;
  }

  // Status code messages
  if (error.response?.status) {
    const statusMessages = {
      400: 'Bad Request: The request contains invalid data.',
      401: 'Unauthorized: Authentication is required.',
      403: 'Forbidden: You don\'t have permission to access this resource.',
      404: 'Not Found: The requested resource was not found.',
      429: 'Rate Limit Exceeded: Too many requests. Please wait and try again.',
      500: 'Internal Server Error: Something went wrong on the server.',
      502: 'Bad Gateway: The server received an invalid response.',
      503: 'Service Unavailable: The server is temporarily unavailable.',
      504: 'Gateway Timeout: The server took too long to respond.'
    };
    
    return statusMessages[error.response.status] || `HTTP Error ${error.response.status}`;
  }

  return 'An unexpected error occurred. Please try again.';
}

export default setupAxiosInterceptor;
