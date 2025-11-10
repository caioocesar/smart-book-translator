import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function SystemStatus() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    checkSystemStatus();
  }, []);

  const checkSystemStatus = async () => {
    setLoading(true);
    try {
      const [healthResponse, testResponse, infoResponse] = await Promise.all([
        axios.get(`${API_URL}/api/health`),
        axios.get(`${API_URL}/api/health/test/results`),
        axios.get(`${API_URL}/api/health/info`)
      ]);

      setStatus({
        health: healthResponse.data,
        tests: testResponse.data,
        info: infoResponse.data
      });
    } catch (error) {
      console.error('Status check failed:', error);
      setStatus({
        error: 'Failed to connect to backend',
        health: { status: 'error' }
      });
    } finally {
      setLoading(false);
    }
  };

  const runTests = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/health/test`);
      setStatus(prev => ({
        ...prev,
        tests: response.data
      }));
    } catch (error) {
      console.error('Test run failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !status) {
    return (
      <div className="system-status loading">
        <p>⏳ Checking system status...</p>
      </div>
    );
  }

  if (!status || status.error) {
    return (
      <div className="system-status error">
        <p>🔴 Backend Offline</p>
        <button onClick={checkSystemStatus} className="btn-small">Retry</button>
      </div>
    );
  }

  const testsStatus = status.tests?.results;
  const hasTests = testsStatus && testsStatus.tests;

  return (
    <div className="system-status">
      <div className="status-summary">
        <span className={`status-indicator ${status.health.status === 'ok' ? 'online' : 'offline'}`}>
          {status.health.status === 'ok' ? '🟢 System Online' : '🔴 System Issues'}
        </span>
        
        {hasTests && (
          <span className={`test-summary ${testsStatus.failed === 0 ? 'pass' : 'fail'}`}>
            Tests: {testsStatus.passed}/{testsStatus.tests.length} passed
          </span>
        )}

        <button 
          onClick={() => setShowDetails(!showDetails)} 
          className="btn-small"
        >
          {showDetails ? '▼ Hide' : '▶ Details'}
        </button>
      </div>

      {showDetails && (
        <div className="status-details">
          {status.info && (
            <div className="info-section">
              <h4>System Information</h4>
              <p>Database: {status.info.database.connected ? '✓ Connected' : '✗ Disconnected'}</p>
              <p>Tables: {status.info.database.tables}</p>
              <p>Translation Jobs: {status.info.stats.jobs}</p>
              <p>Glossary Entries: {status.info.stats.glossaryEntries}</p>
              <p>Uptime: {Math.floor(status.info.uptime / 60)} minutes</p>
            </div>
          )}

          {hasTests && (
            <div className="tests-section">
              <h4>System Tests</h4>
              {testsStatus.tests.map((test, index) => (
                <div key={index} className={`test-item ${test.status}`}>
                  <span className="test-icon">{test.status === 'passed' ? '✓' : '✗'}</span>
                  <span className="test-name">{test.name}</span>
                  {test.error && <span className="test-error">{test.error}</span>}
                </div>
              ))}
              <button onClick={runTests} className="btn-secondary" disabled={loading}>
                {loading ? '⏳ Running...' : '🔄 Run Tests Again'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SystemStatus;


