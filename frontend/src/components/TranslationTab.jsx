import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || '';

function TranslationTab({ settings }) {
  const [file, setFile] = useState(null);
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [apiProvider, setApiProvider] = useState('deepl');
  const [outputFormat, setOutputFormat] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [currentJob, setCurrentJob] = useState(null);
  const [progress, setProgress] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [showApiHelp, setShowApiHelp] = useState(false);
  const [apiLimits, setApiLimits] = useState(null);
  const [allApiLimits, setAllApiLimits] = useState({});
  const [error, setError] = useState('');
  const [socket, setSocket] = useState(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState(null);
  const [refreshingLimits, setRefreshingLimits] = useState(false);
  const [refreshingAllLimits, setRefreshingAllLimits] = useState(false);

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ar', name: 'Arabic' }
  ];

  useEffect(() => {
    // Load saved API credentials from settings
    if (settings[`${apiProvider}_api_key`]) {
      setApiKey(settings[`${apiProvider}_api_key`]);
    }
    loadJobs();
  }, [apiProvider, settings]);

  useEffect(() => {
    // Setup WebSocket connection
    // In development, connect to backend directly for WebSocket
    const wsURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const newSocket = io(wsURL);
    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  useEffect(() => {
    if (socket && currentJob) {
      socket.emit('subscribe-job', currentJob);
      
      socket.on('job-progress', (data) => {
        if (data.jobId === currentJob) {
          setProgress(data.progress);
        }
      });

      return () => {
        socket.emit('unsubscribe-job', currentJob);
        socket.off('job-progress');
      };
    }
  }, [socket, currentJob]);

  const loadJobs = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/translation/jobs`);
      setJobs(response.data);
    } catch (err) {
      console.error('Error loading jobs:', err);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Auto-detect output format
      const ext = selectedFile.name.split('.').pop().toLowerCase();
      if (!outputFormat) {
        setOutputFormat(ext);
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      const ext = droppedFile.name.split('.').pop().toLowerCase();
      if (!outputFormat) {
        setOutputFormat(ext);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const checkApiLimits = async () => {
    if (apiProvider !== 'google' && !apiKey) {
      setError('Please enter API key to check limits');
      return;
    }
    
    setRefreshingLimits(true);
    setError('');
    
    try {
      const response = await axios.post(`${API_URL}/api/settings/check-limits`, {
        provider: apiProvider,
        apiKey: apiKey || 'not-needed-for-google',
        options: apiProvider === 'openai' || apiProvider === 'chatgpt' ? { model: settings.openai_model || 'gpt-3.5-turbo' } : {}
      });
      setApiLimits(response.data);
    } catch (err) {
      setError('Failed to check API limits: ' + (err.response?.data?.error || err.message));
    } finally {
      setRefreshingLimits(false);
    }
  };

  const checkAllApiLimits = async () => {
    setRefreshingAllLimits(true);
    setError('');
    
    try {
      const response = await axios.get(`${API_URL}/api/settings/all-limits`);
      setAllApiLimits(response.data);
    } catch (err) {
      setError('Failed to check API limits: ' + (err.response?.data?.error || err.message));
    } finally {
      setRefreshingAllLimits(false);
    }
  };

  useEffect(() => {
    // Load all API limits on mount
    checkAllApiLimits();
  }, []);

  const testApiConnection = async () => {
    // Google doesn't need an API key
    if (apiProvider === 'google' || apiProvider === 'google-translate') {
      setTestingConnection(true);
      setConnectionTestResult(null);
      try {
        const response = await axios.post(`${API_URL}/api/settings/test-api`, {
          provider: 'google',
          apiKey: ''
        });
        setConnectionTestResult({
          success: true,
          message: '✓ Google Translate is available (no API key needed)',
          testTranslation: response.data.testTranslation || 'Hola'
        });
      } catch (err) {
        setConnectionTestResult({
          success: false,
          message: `✗ ${err.response?.data?.error || err.message}`
        });
      } finally {
        setTestingConnection(false);
      }
      return;
    }

    if (!apiKey) {
      setConnectionTestResult({ success: false, message: 'Please enter an API key first' });
      return;
    }

    setTestingConnection(true);
    setConnectionTestResult(null);

    try {
      const response = await axios.post(`${API_URL}/api/settings/test-api`, {
        provider: apiProvider,
        apiKey,
        options: settings[`${apiProvider}_options`] || {}
      });

      setConnectionTestResult({
        success: true,
        message: '✓ Connection successful! API key is valid.',
        testTranslation: response.data.testTranslation
      });
    } catch (err) {
      setConnectionTestResult({
        success: false,
        message: `✗ Connection failed: ${err.response?.data?.error || err.message}`
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }
    
    if (apiProvider !== 'google' && !apiKey) {
      setError('Please enter API key');
      return;
    }

    setError('');
    const formData = new FormData();
    formData.append('document', file);
    formData.append('sourceLanguage', sourceLanguage);
    formData.append('targetLanguage', targetLanguage);
    formData.append('apiProvider', apiProvider);
    formData.append('outputFormat', outputFormat);
    formData.append('apiKey', apiKey);

    try {
      const response = await axios.post(`${API_URL}/api/translation/upload`, formData);
      const jobId = response.data.jobId;
      setCurrentJob(jobId);
      
      // Start translation
      await axios.post(`${API_URL}/api/translation/translate/${jobId}`, {
        apiKey,
        apiOptions: settings[`${apiProvider}_options`] || {}
      });

      // Start polling for progress
      pollProgress(jobId);
      loadJobs();
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    }
  };

  const pollProgress = async (jobId) => {
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`${API_URL}/api/translation/status/${jobId}`);
        setProgress(response.data.progress);
        
        if (response.data.job.status === 'completed' || response.data.job.status === 'failed') {
          clearInterval(interval);
          loadJobs();
        }
      } catch (err) {
        console.error('Error polling progress:', err);
        clearInterval(interval);
      }
    }, 2000);
  };

  const handleDownload = async (jobId) => {
    try {
      window.open(`${API_URL}/api/translation/download/${jobId}`, '_blank');
    } catch (err) {
      setError('Download failed');
    }
  };

  const handleRetry = async (jobId) => {
    try {
      await axios.post(`${API_URL}/api/translation/retry/${jobId}`, {
        apiKey,
        apiOptions: settings[`${apiProvider}_options`] || {}
      });
      setCurrentJob(jobId);
      pollProgress(jobId);
    } catch (err) {
      setError('Retry failed');
    }
  };

  return (
    <div className="translation-tab">
      <div className="upload-section">
        <h2>Translate Document</h2>
        
        <div 
          className="drop-zone"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <input
            type="file"
            accept=".pdf,.docx,.epub"
            onChange={handleFileChange}
            id="file-input"
            style={{ display: 'none' }}
          />
          <label htmlFor="file-input" className="file-label">
            {file ? (
              <div>
                <p>✓ {file.name}</p>
                <p className="file-size">{(file.size / 1024).toFixed(2)} KB</p>
              </div>
            ) : (
              <div>
                <p>📁 Drop file here or click to browse</p>
                <p className="file-types">Supports: PDF, DOCX, EPUB</p>
              </div>
            )}
          </label>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label>Source Language</label>
            <select value={sourceLanguage} onChange={(e) => setSourceLanguage(e.target.value)}>
              {languages.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Target Language</label>
            <select value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value)}>
              {languages.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Translation API</label>
            <div className="input-with-help">
              <select value={apiProvider} onChange={(e) => setApiProvider(e.target.value)}>
                <option value="google">Google Translate (Free - No Key Needed!)</option>
                <option value="deepl">DeepL</option>
                <option value="openai">OpenAI</option>
                <option value="chatgpt">ChatGPT</option>
              </select>
              <button 
                className="help-btn"
                onClick={() => setShowApiHelp(!showApiHelp)}
                title="API Help"
              >
                ℹ️
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Output Format</label>
            <select value={outputFormat} onChange={(e) => setOutputFormat(e.target.value)}>
              <option value="">Same as input</option>
              <option value="txt">Plain Text (.txt)</option>
              <option value="docx">Word Document (.docx)</option>
              <option value="epub">EPUB (.epub)</option>
            </select>
          </div>

          <div className="form-group full-width">
            <label>API Key 🔐 {apiProvider === 'google' && <span className="free-badge">FREE - No Key Required!</span>}</label>
            <div className="input-with-test">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setConnectionTestResult(null);
                }}
                placeholder={apiProvider === 'google' ? 'No API key needed for Google Translate' : 'Enter your API key (encrypted locally)'}
                disabled={apiProvider === 'google'}
              />
              <button 
                onClick={testApiConnection}
                className="btn-test"
                disabled={(apiProvider !== 'google' && !apiKey) || testingConnection}
              >
                {testingConnection ? '⏳ Testing...' : '🔌 Test'}
              </button>
            </div>
            {connectionTestResult && (
              <div className={`connection-test-result ${connectionTestResult.success ? 'success' : 'error'}`}>
                {connectionTestResult.message}
                {connectionTestResult.testTranslation && (
                  <p className="test-translation">Test: "Hello" → "{connectionTestResult.testTranslation}"</p>
                )}
              </div>
            )}
            {apiProvider === 'google' ? (
              <p className="security-note">🆓 Google Translate is free but may be rate-limited for heavy usage</p>
            ) : (
              <p className="security-note">🔒 Your API key is encrypted before storage and never shared</p>
            )}
          </div>
        </div>

        <div className="action-buttons">
          <button onClick={handleUpload} className="btn-primary" disabled={!file || (apiProvider !== 'google' && !apiKey)}>
            🚀 Start Translation
          </button>
          <button 
            onClick={checkApiLimits} 
            className="btn-secondary" 
            disabled={(apiProvider !== 'google' && !apiKey) || refreshingLimits}
          >
            {refreshingLimits ? '⏳ Checking...' : '📊 Check API Limits'}
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {apiLimits && (
          <div className="api-limits">
            <div className="limits-header">
              <h4>API Usage Today - {apiLimits.provider}</h4>
              <button 
                onClick={checkApiLimits} 
                className="btn-small"
                disabled={refreshingLimits}
                title="Refresh usage stats"
              >
                {refreshingLimits ? '⏳' : '🔄'}
              </button>
            </div>
            <div className="limits-content">
              <p><strong>Characters Used:</strong> {apiLimits.usage.characters_used.toLocaleString()}</p>
              <p><strong>Requests Made:</strong> {apiLimits.usage.requests_count}</p>
              
              {apiLimits.limits && (
                <div className="limits-info">
                  <h5>Current Limits:</h5>
                  {Object.entries(apiLimits.limits).map(([key, value]) => (
                    <p key={key}>
                      <strong>{key.replace(/([A-Z])/g, ' $1').trim()}:</strong> {value}
                    </p>
                  ))}
                </div>
              )}
              
              {apiLimits.isNearLimit && (
                <p className="warning">⚠️ Warning: Approaching API limit</p>
              )}
            </div>
          </div>
        )}

        {progress && (
          <div className="progress-section">
            <h3>Translation Progress</h3>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <p>{progress.completed} / {progress.total} chunks completed ({progress.percentage}%)</p>
            {progress.failed > 0 && (
              <p className="warning">⚠️ {progress.failed} chunks failed</p>
            )}
          </div>
        )}
      </div>

      <div className="jobs-section">
        <h3>Recent Translations</h3>
        <div className="jobs-list">
          {jobs.map(job => (
            <div key={job.id} className="job-card">
              <div className="job-header">
                <strong>{job.filename}</strong>
                <span className={`status-badge status-${job.status}`}>{job.status}</span>
              </div>
              <div className="job-details">
                <p>{job.source_language} → {job.target_language}</p>
                <p>API: {job.api_provider}</p>
                <p>Progress: {job.completed_chunks}/{job.total_chunks}</p>
              </div>
              <div className="job-actions">
                {job.status === 'completed' && (
                  <button onClick={() => handleDownload(job.id)} className="btn-small">
                    ⬇️ Download
                  </button>
                )}
                {(job.status === 'failed' || job.status === 'partial') && (
                  <button onClick={() => handleRetry(job.id)} className="btn-small">
                    🔄 Retry
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showApiHelp && (
        <div className="modal-overlay" onClick={() => setShowApiHelp(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>API Authentication Guide</h3>
            
            <div className="api-guide">
              <h4>DeepL API</h4>
              <ol>
                <li>Go to <a href="https://www.deepl.com/pro-api" target="_blank" rel="noopener noreferrer">deepl.com/pro-api</a></li>
                <li>Sign up for a free or paid account</li>
                <li>Navigate to your account settings</li>
                <li>Copy your API authentication key</li>
                <li>Paste it in the API Key field above</li>
              </ol>

              <h4>OpenAI API</h4>
              <ol>
                <li>Go to <a href="https://platform.openai.com" target="_blank" rel="noopener noreferrer">platform.openai.com</a></li>
                <li>Sign in or create an account</li>
                <li>Navigate to API Keys section</li>
                <li>Click "Create new secret key"</li>
                <li>Copy and save your API key securely</li>
                <li>Paste it in the API Key field above</li>
              </ol>

              <h4>Google Translate (Free)</h4>
              <p className="free-option">
                ✨ <strong>No API key needed!</strong> Google Translate is available for free without registration.
              </p>
              <p>
                <strong>Perfect for:</strong>
                <ul>
                  <li>Testing the application</li>
                  <li>Occasional translations</li>
                  <li>Users without API access</li>
                </ul>
              </p>
              <p className="warning-note">
                ⚠️ <strong>Limitations:</strong> Google may rate-limit heavy usage. 
                For large documents or frequent translations, consider paid APIs for better reliability.
              </p>

              <p className="note">
                <strong>Note:</strong> Your API keys are stored locally and never shared.
                Each service has different pricing and rate limits.
              </p>
            </div>

            <button onClick={() => setShowApiHelp(false)} className="btn-primary">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TranslationTab;

