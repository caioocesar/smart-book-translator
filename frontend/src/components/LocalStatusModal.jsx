import { useState, useEffect } from 'react';
import axios from 'axios';
import { t } from '../utils/i18n.js';
import NotificationModal from './NotificationModal.jsx';

const API_URL = import.meta.env.VITE_API_URL || '';

function LocalStatusModal({ isOpen, onClose }) {
  const [libreTranslateStatus, setLibreTranslateStatus] = useState(null);
  const [libreTranslateResources, setLibreTranslateResources] = useState(null);
  const [libreTranslateLogs, setLibreTranslateLogs] = useState('');
  const [ollamaStatus, setOllamaStatus] = useState(null);
  const [ollamaSystemInfo, setOllamaSystemInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startingLibreTranslate, setStartingLibreTranslate] = useState(false);
  const [startingOllama, setStartingOllama] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [notification, setNotification] = useState({ show: false, type: 'info', title: '', message: '' });

  useEffect(() => {
    if (isOpen) {
      loadAllStatus();
      // Poll every 5 seconds while modal is open
      const interval = setInterval(loadAllStatus, 15000); // Every 15s (reduced from 5s)
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const loadAllStatus = async () => {
    setLoading(true);
    try {
      // Load LibreTranslate status
      const ltStatusResponse = await axios.get(`${API_URL}/api/local-translation/status`);
      setLibreTranslateStatus(ltStatusResponse.data);

      // Load LibreTranslate resources
      try {
        const ltResourcesResponse = await axios.get(`${API_URL}/api/local-translation/resources`);
        setLibreTranslateResources(ltResourcesResponse.data);
      } catch (err) {
        // Non-fatal
      }

      // Load LibreTranslate logs if booting
      if (ltStatusResponse.data.status === 'booting' || ltStatusResponse.data.status === 'starting') {
        try {
          const logsResponse = await axios.get(`${API_URL}/api/local-translation/logs`);
          if (logsResponse.data.success) {
            setLibreTranslateLogs(logsResponse.data.logs);
          }
        } catch (err) {
          // Non-fatal
        }
      }

      // Load Ollama status
      try {
        const ollamaStatusResponse = await axios.get(`${API_URL}/api/ollama/status`);
        setOllamaStatus(ollamaStatusResponse.data);

        // Load Ollama system info if running
        if (ollamaStatusResponse.data.running) {
          try {
            const ollamaInfoResponse = await axios.get(`${API_URL}/api/ollama/system-info`);
            setOllamaSystemInfo(ollamaInfoResponse.data);
          } catch (err) {
            // Non-fatal
          }
        }
      } catch (err) {
        // Ollama might not be installed, that's OK
        setOllamaStatus({ installed: false, running: false });
      }
    } catch (error) {
      console.error('Failed to load status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartLibreTranslate = async () => {
    setStartingLibreTranslate(true);
    try {
      const response = await axios.post(`${API_URL}/api/local-translation/start`);
      if (response.data.success) {
        setTimeout(loadAllStatus, 2000);
      }
    } catch (error) {
      setNotification({
        show: true,
        type: 'error',
        title: 'Failed to Start',
        message: `Failed to start: ${error.response?.data?.message || error.message}`
      });
    } finally {
      setStartingLibreTranslate(false);
    }
  };

  const handleStartOllama = async () => {
    setStartingOllama(true);
    try {
      const response = await axios.post(`${API_URL}/api/ollama/start`);
      if (response.data.success) {
        setTimeout(loadAllStatus, 2000);
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
        message: `Error: ${error.response?.data?.message || error.message}`
      });
    } finally {
      setStartingOllama(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content local-status-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🏠 Local Translation & LLM Status</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {loading && !libreTranslateStatus ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p>⏳ Loading status...</p>
            </div>
          ) : (
            <>
              {/* LibreTranslate Status */}
              <div className="status-section">
                <h3>
                  🏠 LibreTranslate
                  <span className={`status-indicator-inline ${
                    libreTranslateStatus?.running ? 'running' : 
                    libreTranslateStatus?.status === 'booting' || libreTranslateStatus?.status === 'starting' ? 'booting' : 
                    'stopped'
                  }`}>
                    {libreTranslateStatus?.running ? '🟢 Running' : 
                     libreTranslateStatus?.status === 'booting' ? '🟡 Booting...' :
                     libreTranslateStatus?.status === 'starting' ? '🟡 Starting...' :
                     '🔴 Stopped'}
                  </span>
                </h3>

                <div className="status-details">
                  <div className="detail-row">
                    <strong>URL:</strong>
                    <span>{libreTranslateStatus?.url || 'http://localhost:5001'}</span>
                  </div>
                  
                  {libreTranslateStatus?.statusMessage && (
                    <div className="detail-row">
                      <strong>Status:</strong>
                      <span className={libreTranslateStatus?.status === 'booting' || libreTranslateStatus?.status === 'starting' ? 'text-warning' : ''}>
                        {libreTranslateStatus.statusMessage}
                      </span>
                    </div>
                  )}
                  
                  {/* Show booting progress section */}
                  {(libreTranslateStatus?.status === 'booting' || libreTranslateStatus?.status === 'starting') && (
                    <div className="booting-section">
                      <div className="booting-header">
                        <strong>⏳ Startup Progress</strong>
                        <button 
                          className="btn-link" 
                          onClick={() => setShowLogs(!showLogs)}
                          style={{ fontSize: '0.9em', padding: '0.25rem 0.5rem' }}
                        >
                          {showLogs ? '▼ Hide Logs' : '▶ Show Logs'}
                        </button>
                      </div>
                      {showLogs && libreTranslateLogs && (
                        <div className="container-logs">
                          <pre>{libreTranslateLogs}</pre>
                        </div>
                      )}
                      <div className="booting-info">
                        <p style={{ fontSize: '0.9em', color: '#666', marginTop: '0.5rem' }}>
                          📥 Downloading and loading language models... This typically takes 1-3 minutes on first run.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {libreTranslateStatus?.running ? (
                    <>
                      <div className="detail-row">
                        <strong>Languages:</strong>
                        <span>{libreTranslateStatus?.languageCount || 0} language pairs</span>
                      </div>
                      
                      {libreTranslateResources && (
                        <div className="resource-usage">
                          <strong>💻 Resource Usage:</strong>
                          <div className="resource-grid">
                            {libreTranslateResources.system && (
                              <>
                                <div className="resource-item">
                                  <span>CPU:</span>
                                  <strong>{libreTranslateResources.system.cpu?.usage || 'N/A'}%</strong>
                                </div>
                                <div className="resource-item">
                                  <span>RAM:</span>
                                  <strong>{libreTranslateResources.system.memory?.usagePercent || 'N/A'}%</strong>
                                </div>
                                <div className="resource-item">
                                  <span>Cores:</span>
                                  <strong>{libreTranslateResources.system.cpu?.cores || 'N/A'}</strong>
                                </div>
                                <div className="resource-item">
                                  <span>Free RAM:</span>
                                  <strong>{libreTranslateResources.system.memory?.freeGB || 'N/A'} GB</strong>
                                </div>
                                <div className="resource-item">
                                  <span>Total RAM:</span>
                                  <strong>{libreTranslateResources.system.memory?.totalGB || 'N/A'} GB</strong>
                                </div>
                              </>
                            )}
                            {libreTranslateResources.container && (
                              <>
                                <div className="resource-item">
                                  <span>Container CPU:</span>
                                  <strong>{libreTranslateResources.container.cpu || 'N/A'}</strong>
                                </div>
                                <div className="resource-item">
                                  <span>Container Memory:</span>
                                  <strong>{libreTranslateResources.container.memory || 'N/A'}</strong>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="warning-box">
                      <p>⚠️ LibreTranslate is not running</p>
                      {libreTranslateStatus?.dockerAvailable ? (
                        <button 
                          className="btn-primary btn-small"
                          onClick={handleStartLibreTranslate}
                          disabled={startingLibreTranslate}
                        >
                          {startingLibreTranslate ? '⏳ Starting...' : '▶️ Start LibreTranslate'}
                        </button>
                      ) : (
                        <p style={{ fontSize: '0.9em', color: '#666' }}>
                          Docker is required. Install from <a href="https://www.docker.com/get-started" target="_blank" rel="noopener noreferrer">docker.com</a>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Ollama/LLM Status */}
              {ollamaStatus && (
                <div className="status-section">
                  <h3>
                    🤖 LLM Enhancement (Ollama)
                    <span className={`status-indicator-inline ${
                      ollamaStatus.running ? 'running' : 
                      ollamaStatus.installed ? 'stopped' : 'not-installed'
                    }`}>
                      {ollamaStatus.running ? '🟢 Running' : 
                       ollamaStatus.installed ? '🟡 Stopped' : '🔴 Not Installed'}
                    </span>
                  </h3>

                  <div className="status-details">
                    {ollamaStatus.installed ? (
                      <>
                        {ollamaStatus.running ? (
                          <>
                            <div className="detail-row">
                              <strong>Version:</strong>
                              <span>{ollamaStatus.version || 'Unknown'}</span>
                            </div>
                            <div className="detail-row">
                              <strong>Models Installed:</strong>
                              <span>{ollamaStatus.modelCount || 0}</span>
                            </div>
                            {ollamaStatus.recommendedInstalled && (
                              <div className="detail-row">
                                <strong>Recommended Model:</strong>
                                <span style={{ color: '#28a745' }}>✓ {ollamaStatus.recommendedModel}</span>
                              </div>
                            )}
                            
                            {ollamaSystemInfo && (
                              <div className="resource-usage">
                                <strong>💻 Resource Usage:</strong>
                                <div className="resource-grid">
                                  <div className="resource-item">
                                    <span>CPU:</span>
                                    <strong>{ollamaSystemInfo.cpu?.usage || 'N/A'}%</strong>
                                  </div>
                                  <div className="resource-item">
                                    <span>RAM:</span>
                                    <strong>{ollamaSystemInfo.memory?.usagePercent || 'N/A'}%</strong>
                                  </div>
                                  <div className="resource-item">
                                    <span>Free RAM:</span>
                                    <strong>{(ollamaSystemInfo.memory?.free / (1024 * 1024 * 1024)).toFixed(1) || 'N/A'} GB</strong>
                                  </div>
                                  {ollamaSystemInfo.gpu?.detected && (
                                    <>
                                      <div className="resource-item">
                                        <span>GPU:</span>
                                        <strong>{ollamaSystemInfo.gpu.name}</strong>
                                      </div>
                                      <div className="resource-item">
                                        <span>VRAM:</span>
                                        <strong>{ollamaSystemInfo.gpu.vram}</strong>
                                      </div>
                                    </>
                                  )}
                                </div>
                                
                                {ollamaSystemInfo.performanceEstimate && (
                                  <div className="performance-info" style={{ marginTop: '12px', padding: '8px', background: '#e3f2fd', borderRadius: '6px' }}>
                                    <strong>⚡ Performance:</strong> {ollamaSystemInfo.performanceEstimate.icon} {ollamaSystemInfo.performanceEstimate.description}
                                    <br />
                                    <span style={{ fontSize: '0.9em' }}>
                                      ~{ollamaSystemInfo.performanceEstimate.estimatedSecondsPerPage}s per page
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="warning-box">
                            <p>⚠️ Ollama service is not running</p>
                            <button 
                              className="btn-primary btn-small"
                              onClick={handleStartOllama}
                              disabled={startingOllama}
                            >
                              {startingOllama ? '⏳ Starting...' : '▶️ Start Ollama'}
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="info-box">
                        <p>ℹ️ Ollama is not installed</p>
                        <p style={{ fontSize: '0.9em', color: '#666' }}>
                          Install from <a href="https://ollama.com" target="_blank" rel="noopener noreferrer">ollama.com</a> or use the installation scripts in the <code>scripts/</code> folder.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="modal-actions" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #ddd' }}>
                <button className="btn-secondary" onClick={loadAllStatus}>
                  🔄 Refresh Status
                </button>
                <button className="btn-primary" onClick={onClose}>
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <NotificationModal
        isOpen={notification.show}
        onClose={() => setNotification({ show: false, type: 'info', title: '', message: '' })}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />
    </div>
  );
}

export default LocalStatusModal;
