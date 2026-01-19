import { useEffect, useRef, useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

function StartupTestModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [runId, setRunId] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const pollRef = useRef(null);

  const startTests = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/health/test/run`, {
        providers: ['local', 'deepl', 'google', 'openai', 'chatgpt'],
        matrix: {
          llm: [false, true],
          htmlMode: [false, true],
          glossary: [false, true]
        }
      });
      setRunId(response.data.runId);
      setIsOpen(true);
    } catch (error) {
      if (error?.response?.status === 409 && error.response?.data?.runId) {
        setRunId(error.response.data.runId);
        setIsOpen(true);
      } else {
        setStatus({ status: 'error', error: error.message });
        setIsOpen(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const requestRunTests = () => {
    localStorage.removeItem('startupTestsCompleted');
    startTests();
  };

  const pollStatus = async (activeRunId) => {
    if (!activeRunId) return;
    try {
      const response = await axios.get(`${API_URL}/api/health/test/status/${activeRunId}`);
      setStatus(response.data);
      if (response.data.status && response.data.status !== 'running') {
        stopPolling();
        localStorage.setItem('startupTestsCompleted', 'true');
      }
    } catch (error) {
      setStatus({ status: 'error', error: error.message });
      stopPolling();
    }
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const handleCancel = async () => {
    if (!runId) return;
    try {
      await axios.post(`${API_URL}/api/health/test/cancel/${runId}`);
      setStatus(prev => ({ ...prev, status: 'cancelling' }));
    } catch (error) {
      setStatus(prev => ({ ...prev, status: 'error', error: error.message }));
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    if (status?.status && status.status !== 'running') {
      localStorage.setItem('startupTestsCompleted', 'true');
    }
  };

  useEffect(() => {
    const hasRun = localStorage.getItem('startupTestsCompleted');
    if (!hasRun) {
      startTests();
    }
    const handler = () => requestRunTests();
    window.addEventListener('run-startup-tests', handler);
    return () => {
      window.removeEventListener('run-startup-tests', handler);
      stopPolling();
    };
  }, []);

  useEffect(() => {
    if (runId && !pollRef.current) {
      pollRef.current = setInterval(() => pollStatus(runId), 1500);
      pollStatus(runId);
    }
    return () => stopPolling();
  }, [runId]);

  if (!isOpen) return null;

  const results = status?.results;
  const tests = results?.tests || [];
  const failedTests = tests.filter(test => test.status === 'failed');
  const isRunning = status?.status === 'running' || status?.status === 'cancelling';

  return (
    <div className="startup-tests-overlay">
      <div className="startup-tests-modal">
        <button className="modal-close" onClick={handleClose} aria-label="Close">
          ×
        </button>
        <h3>System Tests</h3>
        <p>
          {loading || isRunning
            ? 'Running startup tests...'
            : status?.status === 'cancelled'
              ? 'Tests cancelled.'
              : status?.status === 'error'
                ? `Tests failed to run: ${status?.error || 'Unknown error'}`
                : 'Tests completed.'}
        </p>

        {results && (
          <div className="startup-tests-summary">
            <span>Passed: {results.passed}</span>
            <span>Failed: {results.failed}</span>
            <span>Skipped: {results.skipped}</span>
          </div>
        )}

        {failedTests.length > 0 && !isRunning && (
          <div className="startup-tests-warning">
            Some tests failed. You can continue, but review the details.
          </div>
        )}

        <div className="startup-tests-actions">
          <button className="btn-small" onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
          {isRunning && (
            <button className="btn-small btn-danger" onClick={handleCancel}>
              Cancel Tests
            </button>
          )}
          <button className="btn-small btn-secondary" onClick={handleClose}>
            {isRunning ? 'Hide' : 'Close'}
          </button>
        </div>

        {showDetails && (
          <div className="startup-tests-details">
            {tests.length === 0 && <p>No test details yet.</p>}
            {tests.map((test, index) => (
              <div key={`${test.name}-${index}`} className={`test-item ${test.status}`}>
                <span className="test-icon">{test.status === 'passed' ? '✓' : test.status === 'skipped' ? '↷' : '✗'}</span>
                <span className="test-name">{test.name}</span>
                {test.error && <span className="test-error">{test.error}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default StartupTestModal;
