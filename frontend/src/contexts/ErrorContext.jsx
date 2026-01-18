import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import setupAxiosInterceptor from '../utils/axiosInterceptor.js';

const ErrorContext = createContext();

export function ErrorProvider({ children }) {
  const [currentError, setCurrentError] = useState(null);
  const [errorHistory, setErrorHistory] = useState([]);
  const [retryAction, setRetryAction] = useState(null);

  const showError = useCallback((error, retryFn = null) => {
    const errorObj = {
      id: Date.now(),
      message: error.message || 'An unexpected error occurred',
      statusCode: error.statusCode || error.status || 500,
      code: error.code || 'UNKNOWN_ERROR',
      timestamp: error.timestamp || new Date().toISOString(),
      details: error.details || {},
      suggestion: error.suggestion || null,
      stack: error.stack || null,
      requestInfo: error.requestInfo || null
    };

    setCurrentError(errorObj);
    setErrorHistory(prev => [errorObj, ...prev].slice(0, 20)); // Keep last 20 errors
    setRetryAction(() => retryFn);
  }, []);

  const clearError = useCallback(() => {
    setCurrentError(null);
    setRetryAction(null);
  }, []);

  const retry = useCallback(() => {
    if (retryAction) {
      clearError();
      retryAction();
    }
  }, [retryAction, clearError]);

  const value = {
    currentError,
    errorHistory,
    showError,
    clearError,
    retry,
    hasRetry: !!retryAction
  };

  // Setup axios interceptor when provider mounts
  useEffect(() => {
    setupAxiosInterceptor(value);
  }, []);

  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  );
}

export function useError() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
}

export default ErrorContext;
