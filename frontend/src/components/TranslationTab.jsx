import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { t } from '../utils/i18n.js';
import DocumentInfoBox from './DocumentInfoBox.jsx';

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
  const [documentInfo, setDocumentInfo] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [analyzingDocument, setAnalyzingDocument] = useState(false);
  const [chunkSize, setChunkSize] = useState(settings.chunkSize || 3000);
  const [openaiModel, setOpenaiModel] = useState(settings.openai_model || 'gpt-3.5-turbo');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [availableGlossaries, setAvailableGlossaries] = useState([]);
  const [selectedGlossaryIds, setSelectedGlossaryIds] = useState([]);
  const [useAllGlossaries, setUseAllGlossaries] = useState(true);

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
    loadGlossaries();
  }, [apiProvider, settings, sourceLanguage, targetLanguage]);

  const loadGlossaries = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/glossary`, {
        params: {
          sourceLanguage,
          targetLanguage
        }
      });
      setAvailableGlossaries(response.data || []);
      // If using all glossaries, select all by default
      if (useAllGlossaries) {
        setSelectedGlossaryIds(response.data.map(g => g.id));
      }
    } catch (err) {
      console.error('Error loading glossaries:', err);
      setAvailableGlossaries([]);
    }
  };

  useEffect(() => {
    // Setup WebSocket connection
    // In development, connect to backend directly for WebSocket
    const wsURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const newSocket = io(wsURL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });
    
    newSocket.on('connect', () => {
      console.log('✅ WebSocket connected');
    });
    
    newSocket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
    });
    
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

  const analyzeDocument = async (selectedFile) => {
    setAnalyzingDocument(true);
    setDocumentInfo(null);
    setRecommendations(null);
    
    try {
      const formData = new FormData();
      formData.append('document', selectedFile);
      
      const response = await axios.post(`${API_URL}/api/document/analyze`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setDocumentInfo(response.data);
      setRecommendations(response.data.recommendations);
    } catch (err) {
      console.error('Failed to analyze document:', err);
      // Don't show error - analysis is optional
    } finally {
      setAnalyzingDocument(false);
    }
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Auto-detect output format
      const ext = selectedFile.name.split('.').pop().toLowerCase();
      if (!outputFormat) {
        setOutputFormat(ext);
      }
      // Analyze document
      await analyzeDocument(selectedFile);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      const ext = droppedFile.name.split('.').pop().toLowerCase();
      if (!outputFormat) {
        setOutputFormat(ext);
      }
      // Analyze document
      await analyzeDocument(droppedFile);
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
      const options = {};
      if (apiProvider === 'openai' || apiProvider === 'chatgpt') {
        options.model = openaiModel || settings.openai_model || 'gpt-3.5-turbo';
      }
      
      const response = await axios.post(`${API_URL}/api/settings/check-limits`, {
        provider: apiProvider,
        apiKey: apiKey || 'not-needed-for-google',
        options
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
    checkAllApiLimits().catch(err => {
      console.error('Error loading API limits:', err);
    });
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
      const apiOptions = { ...(settings[`${apiProvider}_options`] || {}) };
      if (apiProvider === 'openai' || apiProvider === 'chatgpt') {
        apiOptions.model = openaiModel || settings.openai_model || 'gpt-3.5-turbo';
      }
      
      const response = await axios.post(`${API_URL}/api/settings/test-api`, {
        provider: apiProvider,
        apiKey,
        options: apiOptions
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
    formData.append('chunkSize', chunkSize.toString());

    try {
      const response = await axios.post(`${API_URL}/api/translation/upload`, formData);
      const jobId = response.data.jobId;
      setCurrentJob(jobId);
      
      // Start translation
      const apiOptions = { ...(settings[`${apiProvider}_options`] || {}) };
      // Override model if OpenAI/ChatGPT and model is set in translation tab
      if ((apiProvider === 'openai' || apiProvider === 'chatgpt') && openaiModel) {
        apiOptions.model = openaiModel;
      }
      
      await axios.post(`${API_URL}/api/translation/translate/${jobId}`, {
        apiKey,
        apiOptions,
        glossaryIds: useAllGlossaries ? null : selectedGlossaryIds // null = use all, array = use selected
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
      const apiOptions = { ...(settings[`${apiProvider}_options`] || {}) };
      if (apiProvider === 'openai' || apiProvider === 'chatgpt') {
        apiOptions.model = openaiModel || settings.openai_model || 'gpt-3.5-turbo';
      }
      
      await axios.post(`${API_URL}/api/translation/retry/${jobId}`, {
        apiKey,
        apiOptions
      });
      setCurrentJob(jobId);
      pollProgress(jobId);
    } catch (err) {
      setError('Retry failed');
    }
  };

  const handleSelectRecommendation = (rec) => {
    setApiProvider(rec.provider);
    // Set chunk size from recommendation
    if (rec.recommendedChunkSize) {
      setChunkSize(rec.recommendedChunkSize);
    }
    // Set model if it's an OpenAI recommendation
    if (rec.provider === 'openai' || rec.provider === 'chatgpt') {
      if (rec.plan) {
        // Map plan to model ID
        const modelMap = {
          'gpt-5': 'gpt-5',
          'gpt-4o': 'gpt-4o',
          'gpt-4-turbo': 'gpt-4-turbo',
          'gpt-4': 'gpt-4',
          'gpt-3.5-turbo': 'gpt-3.5-turbo'
        };
        const modelId = modelMap[rec.plan] || rec.plan;
        setOpenaiModel(modelId);
      }
    }
    console.log('Selected recommendation:', rec);
  };

  return (
    <div className="translation-tab">
      {/* Help Icon */}
      <button 
        className="help-icon-button"
        onClick={() => setShowHelpModal(true)}
        title={t('help') || 'Help & Information'}
        aria-label={t('help') || 'Help & Information'}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" fill="none"/>
          <path d="M8 11V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="8" cy="5" r="0.75" fill="currentColor"/>
        </svg>
      </button>
      
      <div className="upload-section">
        <h2>{t('uploadDocument')}</h2>
        
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
                <p>📁 {t('dragDropHint')}</p>
                <p className="file-types">{t('supportedFormats')}</p>
              </div>
            )}
          </label>
        </div>

        {analyzingDocument && (
          <div className="analyzing-message" style={{ textAlign: 'center', padding: '10px', color: '#667eea' }}>
            🔍 {t('analyzingDocument')}
          </div>
        )}

        {documentInfo && (
          <DocumentInfoBox 
            documentInfo={documentInfo}
            recommendations={recommendations}
            onSelectRecommendation={handleSelectRecommendation}
            selectedProvider={apiProvider}
            selectedModel={openaiModel}
          />
        )}

        <div className="form-grid">
          <div className="form-group">
            <label>{t('sourceLanguage')}</label>
            <select value={sourceLanguage} onChange={(e) => setSourceLanguage(e.target.value)}>
              {languages.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>{t('targetLanguage')}</label>
            <select value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value)}>
              {languages.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>{t('translationAPI')}</label>
            <div className="input-with-help">
              <select value={apiProvider} onChange={(e) => setApiProvider(e.target.value)}>
                <option value="google">{t('providerGoogle')}</option>
                <option value="deepl">{t('providerDeepL')}</option>
                <option value="openai">{t('providerOpenAI')}</option>
                <option value="chatgpt">{t('providerChatGPT')}</option>
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

          {(apiProvider === 'openai' || apiProvider === 'chatgpt') && (
            <div className="form-group">
              <label>{t('openaiModel') || 'OpenAI Model'}</label>
              <select 
                value={openaiModel} 
                onChange={(e) => setOpenaiModel(e.target.value)}
              >
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster, Cheaper)</option>
                <option value="gpt-4">GPT-4 (Better Quality)</option>
                <option value="gpt-4-turbo">GPT-4 Turbo (Large Context)</option>
                <option value="gpt-4o">GPT-4o (Best Quality)</option>
                <option value="gpt-5">GPT-5 (Latest)</option>
              </select>
              <p className="help-text" style={{ fontSize: '0.85em', marginTop: '4px', opacity: 0.8 }}>
                {documentInfo && recommendations && recommendations.find(r => (r.provider === 'openai' || r.provider === 'chatgpt') && r.plan === openaiModel) ? (
                  <>✓ Recommended for this document</>
                ) : (
                  <>Default: {settings.openai_model || 'gpt-3.5-turbo'}</>
                )}
              </p>
            </div>
          )}

          <div className="form-group">
            <label>{t('outputFormat')}</label>
            <select value={outputFormat} onChange={(e) => setOutputFormat(e.target.value)}>
              <option value="">{t('sameAsInput')}</option>
              <option value="txt">{t('plainText')}</option>
              <option value="docx">{t('wordDocument')}</option>
              <option value="epub">{t('epubFormat')}</option>
            </select>
          </div>

          <div className="form-group">
            <label>{t('chunkSizeCharacters') || 'Chunk Size (characters)'}</label>
            <input
              type="number"
              value={chunkSize}
              onChange={(e) => setChunkSize(parseInt(e.target.value) || 3000)}
              min={1000}
              max={50000}
              step={500}
            />
            <p className="help-text" style={{ fontSize: '0.85em', marginTop: '4px', opacity: 0.8 }}>
              {documentInfo && recommendations && recommendations[0] ? (
                <>Recommended: {recommendations[0].recommendedChunkSize.toLocaleString()} chars (from {recommendations[0].model})</>
              ) : (
                <>Default: 3000 chars. Larger chunks = fewer API calls but may hit limits.</>
              )}
            </p>
          </div>

          {/* Glossary Selection */}
          {availableGlossaries.length > 0 && (
            <div className="form-group">
              <label>
                📚 {t('glossary') || 'Glossary'} ({availableGlossaries.length} {t('entries') || 'entries'})
              </label>
              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={useAllGlossaries}
                    onChange={(e) => {
                      setUseAllGlossaries(e.target.checked);
                      if (e.target.checked) {
                        setSelectedGlossaryIds(availableGlossaries.map(g => g.id));
                      }
                    }}
                  />
                  <span>{t('useAllGlossaries') || 'Use all glossary entries'}</span>
                </label>
              </div>
              {!useAllGlossaries && (
                <div style={{ 
                  maxHeight: '200px', 
                  overflowY: 'auto', 
                  border: '1px solid #ddd', 
                  borderRadius: '4px', 
                  padding: '8px',
                  backgroundColor: '#f9f9f9'
                }}>
                  {availableGlossaries.map(glossary => (
                    <label 
                      key={glossary.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        padding: '4px 0',
                        cursor: 'pointer'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedGlossaryIds.includes(glossary.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedGlossaryIds([...selectedGlossaryIds, glossary.id]);
                          } else {
                            setSelectedGlossaryIds(selectedGlossaryIds.filter(id => id !== glossary.id));
                          }
                        }}
                      />
                      <span style={{ fontSize: '0.9em' }}>
                        <strong>{glossary.source_term}</strong> → {glossary.target_term}
                        {glossary.category && (
                          <span style={{ color: '#666', marginLeft: '8px' }}>
                            ({glossary.category})
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              <p className="help-text" style={{ fontSize: '0.85em', marginTop: '4px', opacity: 0.8 }}>
                {useAllGlossaries 
                  ? `✓ All ${availableGlossaries.length} glossary entries will be used`
                  : `${selectedGlossaryIds.length} of ${availableGlossaries.length} entries selected`
                }
              </p>
            </div>
          )}

          <div className="form-group full-width">
            <label>{t('apiKey')} 🔐 {apiProvider === 'google' && <span className="free-badge">{t('noApiKey')}</span>}</label>
            <div className="input-with-test">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setConnectionTestResult(null);
                }}
                placeholder={apiProvider === 'google' ? t('noApiKey') : t('apiKeyPlaceholder')}
                disabled={apiProvider === 'google'}
              />
              <button 
                onClick={testApiConnection}
                className="btn-small btn-test"
                disabled={(apiProvider !== 'google' && !apiKey) || testingConnection}
              >
                {testingConnection ? `⏳ ${t('testing')}...` : `🔌 ${t('testConnection')}`}
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
            🚀 {t('startTranslation')}
          </button>
          <button 
            onClick={checkApiLimits} 
            className="btn-secondary btn-check-limits" 
            disabled={(apiProvider !== 'google' && !apiKey) || refreshingLimits}
          >
            {refreshingLimits ? `⏳ ${t('checking')}...` : `📊 ${t('refreshLimits')}`}
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
              <p><strong>Characters Used:</strong> {apiLimits.localUsageToday?.characters_used?.toLocaleString() || 0}</p>
              <p><strong>Requests Made:</strong> {apiLimits.localUsageToday?.requests_count || 0}</p>
              
              {apiLimits.apiLimits && (
                <div className="limits-info">
                  <h5>Current Limits:</h5>
                  {Object.entries(apiLimits.apiLimits).map(([key, value]) => (
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

        {/* All API Limits Section - Only show if there's actual content */}
        {(() => {
          // Filter and count valid API limit cards
          const validCards = Object.entries(allApiLimits)
            .filter(([provider, limits]) => {
              // Skip invalid provider names
              const validProviders = ['google', 'deepl', 'openai', 'chatgpt'];
              const normalizedProvider = provider.toLowerCase();
              if (!validProviders.includes(normalizedProvider) && normalizedProvider !== 'google-translate') {
                return false;
              }
              
              if (!limits || limits.error) return false;
              const usage = limits.localUsageToday || { characters_used: 0, requests_count: 0 };
              const apiLimitsData = limits.apiLimits || {};
              
              // Only include if there's meaningful data
              return !!(usage.characters_used || usage.requests_count || 
                       apiLimitsData.charactersLimit || apiLimitsData.requestsPerMinute ||
                       apiLimitsData.note || apiLimitsData.warning);
            });
          
          // Only render section if there are valid cards
          if (validCards.length === 0) return null;
          
          return (
            <div className="api-limits-section">
              <div className="limits-section-header">
                <h4>📊 API Limits & Usage</h4>
                <button 
                  onClick={checkAllApiLimits} 
                  className="btn-small"
                  disabled={refreshingAllLimits}
                  title="Refresh all API limits"
                >
                  {refreshingAllLimits ? '⏳ Refreshing...' : '🔄 Refresh All'}
                </button>
              </div>
              
              <div className="all-limits-grid">
                {validCards.map(([provider, limits]) => {
                  const usage = limits.localUsageToday || { characters_used: 0, requests_count: 0 };
                  const apiLimitsData = limits.apiLimits || {};
                  
                  // Use proper provider name for display
                  let displayName = provider.toLowerCase();
                  if (displayName === 'google-translate') displayName = 'google';
                  if (displayName === 'chatgpt') displayName = 'openai';
                  
                  return (
                    <div key={provider} className="api-limit-card">
                      <h5>{displayName.toUpperCase()}</h5>
                      <div className="limit-details">
                        <p><strong>Characters Used Today:</strong> {usage.characters_used.toLocaleString()}</p>
                        <p><strong>Requests Today:</strong> {usage.requests_count}</p>
                        
                        {apiLimitsData.charactersLimit && (
                          <p>
                            <strong>Monthly Limit:</strong> {apiLimitsData.charactersUsed?.toLocaleString() || 0} / {apiLimitsData.charactersLimit.toLocaleString()} 
                            {apiLimitsData.percentageUsed && ` (${apiLimitsData.percentageUsed}%)`}
                          </p>
                        )}
                        
                        {apiLimitsData.requestsPerMinute && (
                          <p><strong>Requests/Min:</strong> {apiLimitsData.requestsPerMinute}</p>
                        )}
                        
                        {apiLimitsData.note && (
                          <p className="limit-note">{apiLimitsData.note}</p>
                        )}
                        
                        {apiLimitsData.warning && (
                          <p className="limit-warning">⚠️ {apiLimitsData.warning}</p>
                        )}
                        
                        {limits.isNearLimit && (
                          <p className="warning">⚠️ Approaching limit!</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

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

      {/* Help & Information Modal */}
      {showHelpModal && (
        <div className="modal-overlay" onClick={() => setShowHelpModal(false)}>
          <div className="modal-content help-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2>📚 {t('help') || 'Help & Information'}</h2>
            
            <div className="help-content">
              <section>
                <h3>🔐 Privacy & Local Storage</h3>
                <p><strong>Your data stays on your computer:</strong></p>
                <ul>
                  <li>✅ <strong>100% Local Storage:</strong> All translations, settings, and API keys are stored in an SQLite database on your device</li>
                  <li>✅ <strong>No Cloud Sync:</strong> Your documents never leave your computer (except when sent to translation APIs you configure)</li>
                  <li>✅ <strong>No Telemetry:</strong> We don't track usage, collect analytics, or send any data to external servers</li>
                  <li>✅ <strong>Encrypted Keys:</strong> API keys are encrypted with AES-256 before storage</li>
                  <li>✅ <strong>Full Control:</strong> You can delete all data by removing the database file at any time</li>
                </ul>
                <p><strong>Data Location:</strong></p>
                <ul>
                  <li>Database: <code>backend/database/translations.db</code></li>
                  <li>Uploads: <code>backend/uploads/</code></li>
                  <li>Outputs: <code>backend/outputs/</code></li>
                </ul>
              </section>

              <section>
                <h3>⚠️ Personal Use Only</h3>
                <p><strong>THIS SOFTWARE IS FOR PERSONAL USE ONLY</strong></p>
                <ul>
                  <li>✅ <strong>Allowed:</strong> Translating documents you own or have permission to translate for personal use</li>
                  <li>❌ <strong>Not Allowed:</strong>
                    <ul>
                      <li>Commercial use or redistribution</li>
                      <li>Translating copyrighted material without permission</li>
                      <li>Violating intellectual property rights</li>
                      <li>Circumventing DRM or access controls</li>
                    </ul>
                  </li>
                </ul>
                <p><strong>You are responsible for complying with all applicable laws and respecting copyright holders' rights.</strong></p>
              </section>

              <section>
                <h3>📋 Field Explanations</h3>
                
                <h4>Source Language & Target Language</h4>
                <p>Select the language of your document and the language you want it translated to. The app supports major world languages including English, Spanish, French, German, Italian, Portuguese, Russian, Japanese, Chinese, and Arabic.</p>

                <h4>API Provider</h4>
                <ul>
                  <li><strong>DeepL:</strong> Best quality for European languages. Free tier: 500k chars/month. Paid plans available.</li>
                  <li><strong>OpenAI/ChatGPT:</strong> Great for context-aware translations. Pay per token used.</li>
                  <li><strong>Google Translate:</strong> Free, no API key needed. May be rate-limited for heavy usage.</li>
                </ul>

                <h4>API Key</h4>
                <p>Your authentication key for the selected translation service. Required for DeepL and OpenAI. Not needed for Google Translate.</p>
                <p><strong>Security:</strong> Your API key is encrypted with AES-256 before being stored locally. It's never shared or transmitted except to the translation service you choose.</p>

                <h4>Chunk Size</h4>
                <p>The maximum number of characters per translation request. Smaller chunks = more API calls but better error handling. Larger chunks = fewer calls but risk hitting limits. Recommended: 3000-5000 characters.</p>
                <p>The app automatically recommends optimal chunk sizes based on your selected API plan and document size.</p>

                <h4>OpenAI Model (when using OpenAI/ChatGPT)</h4>
                <ul>
                  <li><strong>GPT-3.5 Turbo:</strong> Fast and cost-effective (~$0.002/1K tokens)</li>
                  <li><strong>GPT-4:</strong> Higher quality, more expensive (~$0.06/1K tokens)</li>
                  <li><strong>GPT-4 Turbo:</strong> Balanced quality and speed (~$0.01/1K tokens)</li>
                  <li><strong>GPT-4o:</strong> Latest model with improved performance</li>
                </ul>

                <h4>Output Format</h4>
                <p>Choose the format for your translated document. Options include:</p>
                <ul>
                  <li><strong>Same as Input:</strong> Keep the original format (EPUB, DOCX, or PDF)</li>
                  <li><strong>Plain Text:</strong> Simple .txt file</li>
                  <li><strong>Word Document:</strong> .docx format</li>
                  <li><strong>EPUB Format:</strong> .epub format for e-readers</li>
                </ul>
              </section>

              <section>
                <h3>💡 Tips & Best Practices</h3>
                <ul>
                  <li><strong>Start Small:</strong> Test with a short document first to verify everything works</li>
                  <li><strong>Check Limits:</strong> Monitor API usage regularly to avoid exceeding limits</li>
                  <li><strong>Use Glossaries:</strong> Define technical or domain-specific terms in the Glossary tab for better consistency</li>
                  <li><strong>Review Translations:</strong> AI isn't perfect, always review output for accuracy</li>
                  <li><strong>Respect Copyright:</strong> Only translate documents you have rights to</li>
                  <li><strong>Save API Keys:</strong> Use the Settings tab to save credentials securely</li>
                </ul>
              </section>

              <section>
                <h3>🎓 About This Project</h3>
                <p>This project is primarily for <strong>educational purposes and study</strong>. It was developed as a learning project to explore document processing, AI translation APIs, real-time progress tracking, and modern web technologies.</p>
                <p><strong>AI-Assisted Development:</strong> This project was developed with the assistance of AI tools to help with code generation, debugging, and implementation.</p>
              </section>
            </div>

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button onClick={() => setShowHelpModal(false)} className="btn-primary">
                ✓ {t('close') || 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TranslationTab;

