import { useState, useEffect } from 'react';
import axios from 'axios';
import { t } from '../utils/i18n.js';
import NotificationModal from './NotificationModal.jsx';
import ConfirmModal from './ConfirmModal.jsx';

const API_URL = import.meta.env.VITE_API_URL || '';

function OllamaPanel() {
  const [status, setStatus] = useState(null);
  const [systemInfo, setSystemInfo] = useState(null);
  const [models, setModels] = useState([]);
  const [modelsSizeBytes, setModelsSizeBytes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [modelAction, setModelAction] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [notification, setNotification] = useState({ show: false, type: 'info', title: '', message: '' });
  const [installOutput, setInstallOutput] = useState(''); // NEW: for installation output

  useEffect(() => {
    loadStatus();
    loadModels();
    loadSystemInfo();
    
    // Poll status every 10 seconds
    const interval = setInterval(() => {
      loadStatus();
      loadModels();
    }, 30000); // Every 30s (reduced from 10s)
    return () => clearInterval(interval);
  }, []);

  // Poll system info while expanded + running (resource usage updates)
  useEffect(() => {
    if (!showAdvanced) return;
    if (!status?.running) return;

    const interval = setInterval(() => {
      loadSystemInfo();
    }, 10000);

    return () => clearInterval(interval);
  }, [showAdvanced, status?.running]);

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

  const loadModels = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/ollama/models`);
      setModels(response.data?.models || []);
      setModelsSizeBytes(response.data?.totalSizeBytes || 0);
    } catch (error) {
      console.error('Failed to load Ollama models:', error);
      setModels([]);
      setModelsSizeBytes(0);
    }
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/ollama/start`);
      
      if (response.data.success) {
        setNotification({
          show: true,
          type: 'success',
          title: 'Success',
          message: '✓ Ollama started successfully!'
        });
        await loadStatus();
      } else {
        setNotification({
          show: true,
          type: 'error',
          title: 'Failed to Start',
          message: `Failed to start: ${response.data.message}`
        });
      }
    } catch (error) {
      setNotification({
        show: true,
        type: 'error',
        title: 'Error',
        message: `Error: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAutoInstall = async () => {
    setLoading(true);
    setInstallOutput('Starting Ollama installation...\n');
    
    try {
      const response = await axios.post(`${API_URL}/api/ollama/install`);
      
      if (response.data.success) {
        setInstallOutput(prev => prev + '\n' + response.data.output);
        setNotification({
          show: true,
          type: 'success',
          title: 'Installation Started',
          message: 'Ollama installation has been started. Please restart your computer after installation completes.'
        });
        // Poll status to detect when installed
        setTimeout(() => loadStatus(), 5000);
      } else {
        setInstallOutput(prev => prev + '\nError: ' + response.data.message);
        setNotification({
          show: true,
          type: 'error',
          title: 'Installation Failed',
          message: response.data.message || 'Failed to install Ollama. Please try manual installation.'
        });
      }
    } catch (error) {
      setInstallOutput(prev => prev + '\nError: ' + error.message);
      setNotification({
        show: true,
        type: 'error',
        title: 'Installation Error',
        message: `Error: ${error.message}. Please try manual installation.`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadModel = async (modelName = status?.recommendedModel) => {
    if (!modelName) {
      console.error('No model name provided to handleDownloadModel');
      setNotification({
        show: true,
        type: 'error',
        title: 'Download Error',
        message: 'No model name specified. Please refresh the page and try again.'
      });
      return;
    }
    
    setModelAction({
      action: 'install',
      modelName,
      status: 'starting',
      message: 'Starting download...'
    });
    setDownloading(true);
    
    try {
      const response = await axios.post(`${API_URL}/api/ollama/download-model`, {
        modelName
      });

      if (response.data.success) {
        setModelAction({
          action: 'install',
          modelName,
          status: 'success',
          message: response.data.message || `Model installed: ${modelName}`
        });
        await loadStatus();
        await loadModels();
      } else {
        setModelAction({
          action: 'install',
          modelName,
          status: 'error',
          message: response.data.message || response.data.error || 'Failed to download model'
        });
      }
    } catch (error) {
      console.error('Download model error:', error);
      setModelAction({
        action: 'install',
        modelName,
        status: 'error',
        message: error.response?.data?.error || error.message || 'Network error'
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleDeleteModel = async (modelName) => {
    if (!modelName) return;
    setModelAction({
      action: 'uninstall',
      modelName,
      status: 'starting',
      message: 'Removing model...'
    });
    try {
      const response = await axios.post(`${API_URL}/api/ollama/delete-model`, { modelName });
      if (response.data.success) {
        setModelAction({
          action: 'uninstall',
          modelName,
          status: 'success',
          message: response.data.message || `Model removed: ${modelName}`
        });
        await loadModels();
      } else {
        setModelAction({
          action: 'uninstall',
          modelName,
          status: 'error',
          message: response.data.message || 'Failed to remove model'
        });
      }
    } catch (error) {
      setModelAction({
        action: 'uninstall',
        modelName,
        status: 'error',
        message: error.message
      });
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
  const installedNames = models.map(model => model.name);
  const formatBytes = (value) => {
    if (!value || typeof value !== 'number' || isNaN(value)) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = value;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
  };
  const pipelineModels = [
    { key: 'qwen', label: 'Qwen 2.5', name: 'qwen2.5:7b' },
    { key: 'llama', label: 'Llama 3.1', name: 'llama3.1:8b' },
    { key: 'mistral', label: 'Mistral', name: 'mistral:7b' }
  ];

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
            
            <div style={{ marginTop: '16px', padding: '12px', background: '#f0f8ff', borderRadius: '6px' }}>
              <p style={{ fontWeight: 600, marginBottom: '8px' }}>🚀 Quick Install Options:</p>
              
              <button 
                className="btn-primary" 
                onClick={handleAutoInstall}
                disabled={loading}
                style={{ width: '100%', marginBottom: '12px' }}
              >
                {loading ? '⏳ Installing Ollama...' : '🚀 Install Ollama Automatically'}
              </button>
              
              {installOutput && (
                <div style={{ 
                  marginTop: '8px', 
                  padding: '8px', 
                  background: '#fff', 
                  border: '1px solid #ddd', 
                  borderRadius: '4px',
                  maxHeight: '150px',
                  overflowY: 'auto',
                  fontSize: '0.85em',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap'
                }}>
                  {installOutput}
                </div>
              )}
              
              <details style={{ marginTop: '12px' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
                  📋 Manual Installation Instructions
                </summary>
                <div style={{ marginTop: '8px', paddingLeft: '8px' }}>
                  <p><strong>Windows:</strong></p>
                  <ol style={{ fontSize: '0.9em', margin: '4px 0 12px 20px' }}>
                    <li>Right-click <code>scripts\install-ollama-windows.ps1</code></li>
                    <li>Select "Run with PowerShell"</li>
                    <li>Or download from <a href="https://ollama.com/download" target="_blank" rel="noopener noreferrer">ollama.com/download</a></li>
                  </ol>
                  
                  <p><strong>Linux:</strong></p>
                  <ol style={{ fontSize: '0.9em', margin: '4px 0 12px 20px' }}>
                    <li>Run: <code>bash scripts/install-ollama-linux.sh</code></li>
                    <li>Or run: <code>curl -fsSL https://ollama.com/install.sh | sh</code></li>
                  </ol>
                  
                  <p><strong>macOS:</strong></p>
                  <ol style={{ fontSize: '0.9em', margin: '4px 0 12px 20px' }}>
                    <li>Download from <a href="https://ollama.com/download" target="_blank" rel="noopener noreferrer">ollama.com/download</a></li>
                    <li>Or use: <code>brew install ollama</code></li>
                  </ol>
                  
                  <p style={{ fontSize: '0.85em', color: '#666', marginTop: '12px' }}>
                    ⚠️ <strong>Note:</strong> After installation, restart your computer for Ollama to be detected properly.
                  </p>
                </div>
              </details>
            </div>
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
              <p><strong>Disk Used:</strong> {formatBytes(modelsSizeBytes)}</p>
              
              {!hasRecommendedModel && (
                <div className="warning-box" style={{ marginTop: '12px' }}>
                  <p><strong>⚠️ Recommended model not installed</strong></p>
                  <p>Model: <code>{status?.recommendedModel || 'Unknown'}</code> (~2GB)</p>
                  <button 
                    className="btn-primary" 
                    onClick={() => handleDownloadModel(status?.recommendedModel)}
                    disabled={downloading || !status?.recommendedModel}
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
              {hasRecommendedModel && (
                <button
                  className="btn-small"
                  onClick={() => setConfirmAction({
                    type: 'uninstall',
                    modelName: status.recommendedModel
                  })}
                  style={{ marginTop: '6px' }}
                >
                  🗑️ Uninstall recommended model
                </button>
              )}

              <div style={{ marginTop: '12px' }}>
                <p style={{ fontWeight: 600, marginBottom: '6px' }}>Extra pipeline models</p>
                {pipelineModels.map(model => {
                  const installed = installedNames.includes(model.name);
                  return (
                    <div key={model.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ minWidth: '120px' }}>{model.label}</span>
                      <code style={{ flex: 1 }}>{model.name}</code>
                      {installed ? (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span style={{ color: '#28a745', fontWeight: 600 }}>Installed</span>
                          <button
                            className="btn-small"
                            onClick={() => setConfirmAction({
                              type: 'uninstall',
                              modelName: model.name
                            })}
                            disabled={downloading}
                          >
                            🗑️ Uninstall
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn-small"
                          onClick={() => handleDownloadModel(model.name)}
                          disabled={downloading}
                        >
                          {downloading ? '⏳' : '⬇️ Download'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
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
                        <strong>CPU:</strong> {systemInfo.cpu?.usage ?? 'N/A'}%
                      </div>
                      <div style={{ padding: '6px', background: 'white', borderRadius: '4px' }}>
                        <strong>RAM:</strong> {systemInfo.memory?.usagePercent ?? systemInfo.memoryUsagePercent ?? 'N/A'}%
                      </div>
                      <div style={{ padding: '6px', background: 'white', borderRadius: '4px' }}>
                        <strong>Free RAM:</strong>{' '}
                        {systemInfo.memory?.free
                          ? (systemInfo.memory.free / (1024 * 1024 * 1024)).toFixed(1)
                          : systemInfo.freeMemory
                            ? (systemInfo.freeMemory / (1024 * 1024 * 1024)).toFixed(1)
                            : 'N/A'}{' '}
                        GB
                      </div>
                      <div style={{ padding: '6px', background: 'white', borderRadius: '4px' }}>
                        <strong>Used RAM:</strong>{' '}
                        {systemInfo.memory?.used
                          ? (systemInfo.memory.used / (1024 * 1024 * 1024)).toFixed(1)
                          : systemInfo.totalMemory && systemInfo.freeMemory
                            ? ((systemInfo.totalMemory - systemInfo.freeMemory) / (1024 * 1024 * 1024)).toFixed(1)
                            : 'N/A'}{' '}
                        GB
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

      <NotificationModal
        isOpen={notification.show}
        onClose={() => setNotification({ show: false, type: 'info', title: '', message: '' })}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />

      {modelAction && (
        <div className="modal-overlay" onClick={() => setModelAction(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setModelAction(null)} aria-label="Close">
              ×
            </button>
            <h3 style={{ marginTop: 0 }}>
              {modelAction.action === 'install' ? 'Installing model' : 'Uninstalling model'}
            </h3>
            <p><strong>Model:</strong> {modelAction.modelName}</p>
            <p><strong>Status:</strong> {modelAction.status}</p>
            <p>{modelAction.message}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button className="btn-secondary" onClick={() => setModelAction(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmAction && (
        <ConfirmModal
          isOpen={!!confirmAction}
          onClose={() => setConfirmAction(null)}
          onConfirm={() => handleDeleteModel(confirmAction.modelName)}
          title="Uninstall model?"
          message={`Are you sure you want to uninstall "${confirmAction.modelName}"?`}
          confirmText="Uninstall"
          cancelText="Cancel"
          type="danger"
        />
      )}
    </div>
  );
}

export default OllamaPanel;
