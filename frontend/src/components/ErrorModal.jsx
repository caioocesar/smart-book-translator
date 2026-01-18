import { useState } from 'react';
import { useError } from '../contexts/ErrorContext.jsx';
import './ErrorModal.css';

function ErrorModal() {
  const { currentError, clearError, retry, hasRetry } = useError();
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!currentError) return null;

  const handleCopy = async () => {
    const errorDetails = JSON.stringify(currentError, null, 2);
    try {
      await navigator.clipboard.writeText(errorDetails);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy error details:', err);
    }
  };

  const handleClose = () => {
    clearError();
    setShowTechnicalDetails(false);
  };

  const handleRetry = () => {
    retry();
    setShowTechnicalDetails(false);
  };

  return (
    <div className="error-modal-overlay" onClick={handleClose}>
      <div className="error-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="error-modal-header">
          <div className="error-modal-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10" strokeWidth="2"/>
              <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="12" cy="16" r="1" fill="currentColor"/>
            </svg>
          </div>
          <div className="error-modal-title">
            <h2>Error {currentError.statusCode}</h2>
            <span className="error-code">{currentError.code}</span>
          </div>
          <button 
            className="error-modal-close" 
            onClick={handleClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="error-modal-body">
          {/* Main Message */}
          <div className="error-message">
            <p>{currentError.message}</p>
          </div>

          {/* Suggestion Box */}
          {currentError.suggestion && (
            <div className="error-suggestion">
              <div className="error-suggestion-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                  <path d="M12 16v-4M12 8h.01" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <strong>Suggestion:</strong>
              </div>
              <p>{currentError.suggestion}</p>
            </div>
          )}

          {/* Technical Details (Expandable) */}
          <div className="error-technical-section">
            <button
              className="error-technical-toggle"
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            >
              <svg 
                width="12" 
                height="12" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor"
                style={{ 
                  transform: showTechnicalDetails ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }}
              >
                <polyline points="9 18 15 12 9 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Technical Details
            </button>

            {showTechnicalDetails && (
              <div className="error-technical-content">
                {/* Timestamp */}
                <div className="error-detail-item">
                  <strong>Timestamp:</strong>
                  <span>{new Date(currentError.timestamp).toLocaleString()}</span>
                </div>

                {/* Status Code */}
                <div className="error-detail-item">
                  <strong>Status Code:</strong>
                  <span>{currentError.statusCode}</span>
                </div>

                {/* Error Code */}
                <div className="error-detail-item">
                  <strong>Error Code:</strong>
                  <span>{currentError.code}</span>
                </div>

                {/* Details */}
                {currentError.details && Object.keys(currentError.details).length > 0 && (
                  <div className="error-detail-item">
                    <strong>Details:</strong>
                    <pre className="error-detail-code">
                      {JSON.stringify(currentError.details, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Request Info */}
                {currentError.requestInfo && (
                  <div className="error-detail-item">
                    <strong>Request:</strong>
                    <pre className="error-detail-code">
                      {JSON.stringify(currentError.requestInfo, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Stack Trace */}
                {currentError.stack && (
                  <div className="error-detail-item">
                    <strong>Stack Trace:</strong>
                    <pre className="error-detail-code error-stack">
                      {currentError.stack}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="error-modal-footer">
          <button 
            className="btn-error-copy" 
            onClick={handleCopy}
            title="Copy error details to clipboard"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeWidth="2"/>
            </svg>
            {copied ? 'Copied!' : 'Copy Error Details'}
          </button>
          
          {hasRetry && (
            <button className="btn-error-retry" onClick={handleRetry}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="23 4 23 10 17 10" strokeWidth="2"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" strokeWidth="2"/>
              </svg>
              Retry
            </button>
          )}
          
          <button className="btn-error-close" onClick={handleClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ErrorModal;
