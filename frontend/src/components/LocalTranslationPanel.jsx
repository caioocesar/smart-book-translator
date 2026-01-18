import { useState, useEffect } from 'react';
import './LocalTranslationPanel.css';
import { t } from '../utils/i18n.js';
import NotificationModal from './NotificationModal.jsx';

const API_URL = import.meta.env.VITE_API_URL || '';

function LocalTranslationPanel() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [config, setConfig] = useState({
    url: 'http://localhost:5001',
    timeout: 30000,
    sentenceBatchSize: 1000
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [autoStart, setAutoStart] = useState(true);
  const [autoStarting, setAutoStarting] = useState(false);
  const [resources, setResources] = useState(null);
  const [showResources, setShowResources] = useState(false);
  const [notification, setNotification] = useState({ show: false, type: 'info', title: '', message: '' });

  useEffect(() => {
    checkStatus();
    loadConfig();
    loadResources();
    
    // Quick polling for first 60 seconds (detect auto-start)
    const quickInterval = setInterval(checkStatus, 3000); // Every 3s (reduced from 2s)
    const quickTimeout = setTimeout(() => {
      clearInterval(quickInterval);
      setAutoStarting(false);
    }, 60000); // Stop after 60s
    
    // Regular polling after that
    const regularInterval = setInterval(checkStatus, 30000); // Every 30s (reduced from 10s)
    
    // Resource monitoring (every 15 seconds - reduced from 5s)
    const resourceInterval = setInterval(loadResources, 15000);
    
    return () => {
      clearInterval(quickInterval);
      clearInterval(regularInterval);
      clearInterval(resourceInterval);
      clearTimeout(quickTimeout);
    };
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch(`${API_URL}/api/settings`);
      if (!response.ok) return;
      const data = await response.json();
      setConfig(prev => ({
        ...prev,
        url: data.localTranslationUrl || prev.url,
        timeout: data.localTranslationTimeout || prev.timeout,
        sentenceBatchSize: data.localTranslationSentenceBatchSize || prev.sentenceBatchSize
      }));
      // Load auto-start setting (default: true)
      setAutoStart(data.autoStartLibreTranslate !== false);
    } catch (error) {
      // Non-fatal
      console.warn('Failed to load local translation config:', error);
    }
  };

  const saveConfigToBackend = async () => {
    setSavingConfig(true);
    setSaveMessage(null);
    try {
      const updates = [
        { key: 'localTranslationUrl', value: config.url },
        { key: 'localTranslationTimeout', value: Number(config.timeout) || 30000 },
        { key: 'localTranslationSentenceBatchSize', value: Number(config.sentenceBatchSize) || 1000 },
        { key: 'autoStartLibreTranslate', value: autoStart }
      ];

      for (const item of updates) {
        await fetch(`${API_URL}/api/settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        });
      }

      setSaveMessage({ success: true, text: t('saved') || 'Saved' });
      // Re-check status using new URL (backend uses settings)
      setTimeout(checkStatus, 500);
    } catch (error) {
      setSaveMessage({ success: false, text: error.message || 'Failed to save' });
    } finally {
      setSavingConfig(false);
    }
  };

  const checkStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/local-translation/status`);
      const data = await response.json();
      setStatus(data);
      
      // If it just started running, stop showing auto-starting indicator
      if (data.running && autoStarting) {
        setAutoStarting(false);
      }
      
      // Detect if backend is auto-starting (status is 'starting')
      if (data.status === 'starting' && !starting) {
        setAutoStarting(true);
      }
    } catch (error) {
      console.error('Failed to check LibreTranslate status:', error);
      setStatus({ running: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const loadResources = async () => {
    try {
      const response = await fetch(`${API_URL}/api/local-translation/resources`);
      const data = await response.json();
      setResources(data);
    } catch (error) {
      // Non-fatal
      console.warn('Failed to load resources:', error);
    }
  };

  const handleStart = async () => {
    setStarting(true);
    try {
      const response = await fetch(`${API_URL}/api/local-translation/start`, {
        method: 'POST'
      });
      const result = await response.json();
      
      if (result.success) {
        setNotification({
          show: true,
          type: 'success',
          title: 'Success',
          message: '✓ LibreTranslate started successfully! Checking status...'
        });
        setTimeout(checkStatus, 3000);
      } else {
        setNotification({
          show: true,
          type: 'error',
          title: 'Failed to Start',
          message: `Failed to start: ${result.message}`
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
      setStarting(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const response = await fetch(`${API_URL}/api/local-translation/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Hello, world!',
          sourceLang: 'en',
          targetLang: 'pt'
        })
      });
      const data = await response.json();
      setTestResult(data);
    } catch (error) {
      setTestResult({ success: false, error: error.message });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <div className="local-translation-panel loading">Checking LibreTranslate status...</div>;
  }

  const isRunning = status?.running;
  const hasDocker = status?.dockerAvailable;

  return (
    <div className="local-translation-panel">
      <div className="panel-header">
        <h3>🏠 {t('localTranslationTitle') || 'Local Translation (LibreTranslate)'}</h3>
        <span className={`status-badge ${isRunning ? 'running' : 'stopped'}`}>
          {isRunning ? '🟢 Running' : '🔴 Stopped'}
        </span>
      </div>

      <div className="panel-body">
        {/* Auto-starting indicator */}
        {autoStarting && !isRunning && (
          <div className="auto-start-notice" style={{
            padding: '12px',
            marginBottom: '12px',
            backgroundColor: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '4px',
            color: '#856404'
          }}>
            <strong>⏳ Auto-starting LibreTranslate...</strong>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.9em' }}>
              This may take 10-30 seconds. The container is being downloaded and initialized.
            </p>
          </div>
        )}

        {/* Configuration */}
        <div className="status-card" style={{ marginBottom: '12px' }}>
          <div className="status-info">
            <p><strong>{t('libreTranslateUrl') || 'LibreTranslate URL'}:</strong></p>
            <input
              type="text"
              value={config.url}
              onChange={(e) => setConfig(prev => ({ ...prev, url: e.target.value }))}
              placeholder="http://localhost:5001"
              style={{ width: '100%', marginTop: '6px' }}
            />

            {/* Auto-start toggle */}
            <div style={{ marginTop: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={autoStart}
                  onChange={(e) => setAutoStart(e.target.checked)}
                  style={{ marginRight: '8px' }}
                />
                <span>Auto-start LibreTranslate on app launch</span>
              </label>
              <p style={{ margin: '4px 0 0 24px', fontSize: '0.85em', color: '#666' }}>
                Automatically start LibreTranslate when the backend starts (requires Docker)
              </p>
            </div>

            <div style={{ marginTop: '10px' }}>
              <button
                className="btn-secondary"
                onClick={() => setShowAdvanced(!showAdvanced)}
                type="button"
              >
                {showAdvanced ? (t('hideAdvanced') || 'Hide advanced') : (t('showAdvanced') || 'Show advanced')}
              </button>
            </div>

            {showAdvanced && (
              <div style={{ marginTop: '10px' }}>
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px' }}>
                    {t('timeoutMs') || 'Timeout (ms)'}
                  </label>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    value={config.timeout}
                    onChange={(e) => setConfig(prev => ({ ...prev, timeout: e.target.value }))}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px' }}>
                    {t('sentenceBatchSize') || 'Sentence batch size'}
                  </label>
                  <input
                    type="number"
                    min="50"
                    step="50"
                    value={config.sentenceBatchSize}
                    onChange={(e) => setConfig(prev => ({ ...prev, sentenceBatchSize: e.target.value }))}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            )}

            {saveMessage && (
              <p style={{ marginTop: '10px', color: saveMessage.success ? '#28a745' : '#dc3545' }}>
                {saveMessage.text}
              </p>
            )}
          </div>

          <div className="status-actions">
            <button
              className="btn-primary"
              onClick={saveConfigToBackend}
              disabled={savingConfig}
              type="button"
            >
              {savingConfig ? (t('saving') || 'Saving...') : `💾 ${t('save') || 'Save'}`}
            </button>
          </div>
        </div>

        {/* Status Card */}
        <div className="status-card">
          <div className="status-info">
            <p><strong>URL:</strong> {status?.url || 'http://localhost:5001'}</p>
            {isRunning && (
              <>
                <p><strong>Languages:</strong> {status?.languageCount || 0} language pairs</p>
                <p><strong>Last Check:</strong> {status?.lastCheck ? new Date(status.lastCheck).toLocaleTimeString() : 'Never'}</p>
                
                {/* Resource Usage */}
                {resources && (
                  <div style={{ marginTop: '12px', padding: '8px', background: '#f0f8ff', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong>💻 Resource Usage</strong>
                      <button 
                        className="btn-small"
                        onClick={() => setShowResources(!showResources)}
                        style={{ padding: '2px 8px', fontSize: '0.8em' }}
                      >
                        {showResources ? '▼ Hide' : '▶ Show'}
                      </button>
                    </div>
                    
                    {showResources && (
                      <div style={{ fontSize: '0.9em', marginTop: '8px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <div>
                            <strong>CPU:</strong> {resources.system.cpu.usage}%
                          </div>
                          <div>
                            <strong>RAM:</strong> {resources.system.memory.usagePercent}%
                          </div>
                          <div>
                            <strong>Cores:</strong> {resources.system.cpu.cores}
                          </div>
                          <div>
                            <strong>Memory:</strong> {(resources.system.memory.total / (1024 * 1024 * 1024)).toFixed(1)} GB
                          </div>
                        </div>
                        
                        {resources.container && (
                          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #ddd' }}>
                            <strong>LibreTranslate Container:</strong>
                            <div style={{ marginTop: '4px' }}>
                              <div>CPU: {resources.container.cpu}</div>
                              <div>Memory: {resources.container.memory}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            {!isRunning && (
              <p className="warning-text">
                ⚠️ LibreTranslate is not running. {hasDocker ? 'Click "Start" to launch it.' : 'Docker is required.'}
              </p>
            )}
          </div>

          <div className="status-actions">
            {!isRunning && hasDocker && (
              <button 
                className="btn-primary" 
                onClick={handleStart}
                disabled={starting}
              >
                {starting ? '⏳ Starting...' : '▶️ Start LibreTranslate'}
              </button>
            )}
            
            {!isRunning && !hasDocker && (
              <div className="docker-warning">
                <p>🐳 Docker is required to start LibreTranslate automatically.</p>
                <a 
                  href="https://www.docker.com/get-started" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-secondary"
                >
                  Install Docker
                </a>
              </div>
            )}

            {isRunning && (
              <button 
                className="btn-secondary" 
                onClick={handleTest}
                disabled={testing}
              >
                {testing ? '⏳ Testing...' : '🧪 Test Translation'}
              </button>
            )}

            <button className="btn-secondary" onClick={checkStatus}>
              🔄 Refresh Status
            </button>
          </div>
        </div>

        {/* Test Result */}
        {testResult && (
          <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
            <h4>{testResult.success ? '✓ Test Successful!' : '❌ Test Failed'}</h4>
            {testResult.success && (
              <div>
                <p><strong>Original:</strong> Hello, world!</p>
                <p><strong>Translated:</strong> {testResult.result?.translatedText}</p>
                <p><strong>Duration:</strong> {testResult.result?.duration}ms</p>
              </div>
            )}
            {!testResult.success && (
              <p className="error-message">{testResult.error}</p>
            )}
          </div>
        )}

        {/* Benefits Card */}
        <div className="benefits-card">
          <h4>💰 Why Use Local Translation?</h4>
          <ul>
            <li>✅ <strong>100% Free</strong> - No API costs, unlimited translations</li>
            <li>✅ <strong>Privacy</strong> - Your texts never leave your computer</li>
            <li>✅ <strong>No Rate Limits</strong> - Translate as much as you want</li>
            <li>✅ <strong>Offline Capable</strong> - Works without internet</li>
            <li>⚠️ <strong>Note:</strong> Quality is ~70% of DeepL, but improving</li>
          </ul>
        </div>

        {/* Setup Instructions */}
        {!isRunning && (
          <div className="setup-instructions">
            <h4>📝 Manual Setup (if auto-start fails)</h4>
            <div className="code-block">
              <code>docker run -d -p 5001:5000 libretranslate/libretranslate</code>
              <button 
                className="copy-btn"
                onClick={() => {
                  navigator.clipboard.writeText('docker run -d -p 5001:5000 libretranslate/libretranslate');
                  setNotification({
                    show: true,
                    type: 'info',
                    title: 'Copied',
                    message: 'Command copied to clipboard!'
                  });
                }}
              >
                📋 Copy
              </button>
            </div>
            <p className="help-text">
              Run this command in your terminal to start LibreTranslate manually.
              <br />
              <a href="#" onClick={(e) => { e.preventDefault(); /* Open docs */ }}>
                📚 Read full setup guide
              </a>
            </p>
          </div>
        )}
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

export default LocalTranslationPanel;
