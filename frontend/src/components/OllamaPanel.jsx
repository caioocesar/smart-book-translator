import { useState, useEffect } from 'react';
import axios from 'axios';
import { t } from '../utils/i18n.js';

const API_URL = import.meta.env.VITE_API_URL || '';

function OllamaPanel() {
  const [status, setStatus] = useState(null);
  const [systemInfo, setSystemInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    loadStatus();
    loadSystemInfo();
    
    // Poll status every 10 seconds
    const interval = setInterval(loadStatus, 30000); // Every 30s (reduced from 10s)
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/ollama/status`);
      setStatus(response.data);
    } catch (error) {
      console.error('Failed to load Ollama status:', error);
      setStatus({ installed: false, running: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const loadSystemInfo = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/ollama/system-info`);
      setSystemInfo(response.data);
    } catch (error) {
      console.error('Failed to load system info:', error);
    }
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/ollama/start`);
      
      if (response.data.success) {
        alert('✓ Ollama started successfully!');
        await loadStatus();
      } else {
        alert(`Failed to start: ${response.data.message}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadModel = async () => {
    if (!confirm(`Download recommended model (${status?.recommendedModel})?\n\nThis will download ~2GB of data.`)) {
      return;
    }

    setDownloading(true);
    try {
      const response = await axios.post(`${API_URL}/api/ollama/download-model`, {
        modelName: status.recommendedModel
      });

      if (response.data.success) {
        alert('✓ Model downloaded successfully!');
        await loadStatus();
      } else {
        alert(`Failed to download model: ${response.data.message}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setDownloading(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      const response = await axios.post(`${API_URL}/api/ollama/test`);
      setTestResult(response.data);
    } catch (error) {
      setTestResult({
        success: false,
        message: error.message
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading && !status) {
    return (
      <div className="ollama-panel loading">
        <p>⏳ Checking Ollama status...</p>
      </div>
    );
  }

  const isInstalled = status?.installed;
  const isRunning = status?.running;
  const hasRecommendedModel = status?.recommendedInstalled;

  return (
    <div className="ollama-panel">
      <div className="panel-header">
        <h3>🤖 {t('ollamaTitle') || 'LLM Enhancement Layer (Ollama)'}</h3>
        <span className={`status-badge ${isRunning ? 'running' : 'stopped'}`}>
          {isRunning ? '🟢 Running' : isInstalled ? '🟡 Stopped' : '🔴 Not Installed'}
        </span>
      </div>

      <div className="panel-body">
        {/* Installation Status */}
        {!isInstalled && (
          <div className="info-card warning">
            <h4>⚠️ Ollama Not Installed</h4>
            <p>Ollama is required for the LLM enhancement layer. This layer provides:</p>
            <ul>
              <li>✨ Formality adjustment (formal/informal/neutral)</li>
              <li>✨ Text structure improvements (cohesion, coherence, grammar)</li>
              <li>✨ Glossary term verification</li>
            </ul>
            <p><strong>Installation:</strong></p>
            <ul>
              <li><strong>Windows:</strong> Run <code>scripts\install-ollama-windows.ps1</code></li>
              <li><strong>Linux:</strong> Run <code>scripts/install-ollama-linux.sh</code></li>
              <li><strong>Manual:</strong> Visit <a href="https://ollama.com" target="_blank" rel="noopener noreferrer">ollama.com</a></li>
            </ul>
          </div>
        )}

        {/* Service Status */}
        {isInstalled && !isRunning && (
          <div className="info-card warning">
            <h4>⚠️ Ollama Service Not Running</h4>
            <p>The Ollama service needs to be started to use LLM enhancements.</p>
            <button 
              className="btn-primary" 
              onClick={handleStart}
              disabled={loading}
            >
              {loading ? '⏳ Starting...' : '▶️ Start Ollama'}
            </button>
          </div>
        )}

        {/* Model Status */}
        {isInstalled && isRunning && (
          <div className="status-card">
            <div className="status-info">
              <p><strong>Status:</strong> ✓ Ready</p>
              <p><strong>Version:</strong> {status.version || 'Unknown'}</p>
              <p><strong>Models Installed:</strong> {status.modelCount || 0}</p>
              
              {!hasRecommendedModel && (
                <div className="warning-box" style={{ marginTop: '12px' }}>
                  <p><strong>⚠️ Recommended model not installed</strong></p>
                  <p>Model: <code>{status.recommendedModel}</code> (~2GB)</p>
                  <button 
                    className="btn-primary" 
                    onClick={handleDownloadModel}
                    disabled={downloading}
                  >
                    {downloading ? '⏳ Downloading...' : '⬇️ Download Model'}
                  </button>
                </div>
              )}

              {hasRecommendedModel && (
                <p style={{ color: '#28a745', marginTop: '8px' }}>
                  ✓ Recommended model installed: <code>{status.recommendedModel}</code>
                </p>
              )}
            </div>

            <div className="status-actions">
              <button 
                className="btn-secondary" 
                onClick={handleTest}
                disabled={testing || !hasRecommendedModel}
              >
                {testing ? '⏳ Testing...' : '🧪 Test LLM'}
              </button>
              <button 
                className="btn-secondary" 
                onClick={loadStatus}
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        )}

        {/* Test Result */}
        {testResult && (
          <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
            <h4>{testResult.success ? '✓ Test Successful!' : '❌ Test Failed'}</h4>
            <p>{testResult.message}</p>
            {testResult.needsModel && (
              <button 
                className="btn-primary" 
                onClick={handleDownloadModel}
                disabled={downloading}
              >
                {downloading ? '⏳ Downloading...' : '⬇️ Download Model'}
              </button>
            )}
          </div>
        )}

        {/* System Information */}
        {systemInfo && (
          <div className="system-info-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4>💻 System Information</h4>
              <button 
                className="btn-small"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? '▼ Hide' : '▶ Show'}
              </button>
            </div>

            {showAdvanced && (
              <div style={{ marginTop: '12px' }}>
                <div className="info-grid">
                  <div className="info-item">
                    <strong>CPU:</strong>
                    <span>{systemInfo.cpuModel}</span>
                  </div>
                  <div className="info-item">
                    <strong>Cores:</strong>
                    <span>{systemInfo.cpuCores}</span>
                  </div>
                  <div className="info-item">
                    <strong>RAM:</strong>
                    <span>{(systemInfo.totalMemory / (1024 * 1024 * 1024)).toFixed(1)} GB</span>
                  </div>
                  <div className="info-item">
                    <strong>RAM Usage:</strong>
                    <span>{systemInfo.memoryUsagePercent}%</span>
                  </div>
                  {systemInfo.gpu && (
                    <>
                      <div className="info-item">
                        <strong>GPU:</strong>
                        <span>{systemInfo.gpu.name}</span>
                      </div>
                      <div className="info-item">
                        <strong>VRAM:</strong>
                        <span>{systemInfo.gpu.vram}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Performance Estimate */}
                {systemInfo.performanceEstimate && (
                  <div className="performance-estimate" style={{ marginTop: '12px' }}>
                    <h5>⚡ Performance Estimate</h5>
                    <p>
                      <span style={{ fontSize: '1.5em' }}>{systemInfo.performanceEstimate.icon}</span>
                      {' '}
                      <strong>{systemInfo.performanceEstimate.description}</strong>
                    </p>
                    <p style={{ fontSize: '0.9em', color: '#666' }}>
                      Estimated processing time: ~{systemInfo.performanceEstimate.estimatedSecondsPerPage} seconds per page
                      <br />
                      (~{systemInfo.performanceEstimate.estimatedSecondsPerKChars} seconds per 1000 characters)
                    </p>
                  </div>
                )}

                {/* Real-time Resource Usage */}
                {isRunning && (
                  <div style={{ marginTop: '12px', padding: '12px', background: '#f0f8ff', borderRadius: '8px', border: '1px solid #b3d9ff' }}>
                    <h5 style={{ margin: '0 0 8px 0', color: '#1565c0' }}>💻 Current Resource Usage</h5>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '0.9em' }}>
                      <div style={{ padding: '6px', background: 'white', borderRadius: '4px' }}>
                        <strong>CPU:</strong> {systemInfo.cpu.usage}%
                      </div>
                      <div style={{ padding: '6px', background: 'white', borderRadius: '4px' }}>
                        <strong>RAM:</strong> {systemInfo.memory.usagePercent}%
                      </div>
                      <div style={{ padding: '6px', background: 'white', borderRadius: '4px' }}>
                        <strong>Free RAM:</strong> {(systemInfo.memory.free / (1024 * 1024 * 1024)).toFixed(1)} GB
                      </div>
                      <div style={{ padding: '6px', background: 'white', borderRadius: '4px' }}>
                        <strong>Used RAM:</strong> {(systemInfo.memory.used / (1024 * 1024 * 1024)).toFixed(1)} GB
                      </div>
                    </div>
                    <p style={{ fontSize: '0.8em', color: '#666', marginTop: '8px', marginBottom: 0 }}>
                      ℹ️ Resource usage updates automatically every 10 seconds
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Benefits Card */}
        <div className="benefits-card">
          <h4>✨ LLM Enhancement Benefits</h4>
          <ul>
            <li>✅ <strong>Formality Control</strong> - Adjust translation tone (formal/informal/neutral)</li>
            <li>✅ <strong>Text Structure</strong> - Improve cohesion, coherence, and grammar</li>
            <li>✅ <strong>Glossary Verification</strong> - Ensure technical terms are correctly translated</li>
            <li>✅ <strong>100% Local</strong> - All processing happens on your computer</li>
            <li>✅ <strong>Privacy</strong> - No data sent to external services</li>
            <li>⚠️ <strong>Note:</strong> Adds processing time (~2-20 seconds per page depending on hardware)</li>
          </ul>
        </div>

        {/* Quick Links */}
        <div className="quick-links" style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
          <h5>📚 Resources</h5>
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li><a href="https://ollama.com" target="_blank" rel="noopener noreferrer">Ollama Official Website</a></li>
            <li><a href="https://ollama.com/library" target="_blank" rel="noopener noreferrer">Browse Available Models</a></li>
            <li>Installation scripts: <code>scripts/</code> folder</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default OllamaPanel;
