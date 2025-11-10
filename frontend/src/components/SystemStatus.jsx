import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

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
      const baseUrl = API_URL || '';
      console.log('Checking backend status at:', `${baseUrl}/api/health`);
      
      // Try health endpoint first (simplest check)
      try {
        const healthResponse = await axios.get(`${baseUrl}/api/health`, { timeout: 5000 });
        console.log('Backend responded successfully:', healthResponse.data);
        
        // If health check passes, try to get other info (but don't fail if these fail)
        let testResponse = null;
        let infoResponse = null;
        
        try {
          testResponse = await axios.get(`${baseUrl}/api/health/test/results`, { timeout: 3000 });
        } catch (err) {
          console.warn('Could not fetch test results:', err.message);
        }
        
        try {
          infoResponse = await axios.get(`${baseUrl}/api/health/info`, { timeout: 3000 });
        } catch (err) {
          console.warn('Could not fetch system info:', err.message);
        }
        
        setStatus({
          health: healthResponse.data,
          tests: testResponse?.data || null,
          info: infoResponse?.data || null
        });
      } catch (healthError) {
        // If health check fails, backend is definitely offline
        throw healthError;
      }
    } catch (error) {
      console.error('Status check failed:', error);
      console.error('Error details:', error.message, error.response?.status, error.code);
      
      // Provide more helpful error message
      let errorMsg = 'Failed to connect to backend';
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        errorMsg = 'Backend server is not running. Please start the backend server.';
      } else if (error.response?.status === 404) {
        errorMsg = 'Backend endpoint not found. Check if server is running on correct port.';
      } else if (error.message?.includes('timeout')) {
        errorMsg = 'Backend request timed out. Server may be overloaded.';
      }
      
      setStatus({
        error: errorMsg,
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


