import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { t } from '../utils/i18n.js';
import DocumentInfoBox from './DocumentInfoBox.jsx';
import LocalTranslationPanel from './LocalTranslationPanel.jsx';
import OllamaPanel from './OllamaPanel.jsx';
import ChunkProgressBar from './ChunkProgressBar.jsx';
import ChunkModal from './ChunkModal.jsx';

const API_URL = import.meta.env.VITE_API_URL || '';

function TranslationTab({ settings }) {
  const [file, setFile] = useState(null);
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('pt');
  const [apiProvider, setApiProvider] = useState('local'); // Default to Local (FREE)
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
  // Provider and LLM-aware default chunk size
  // LLM-enhanced: 1800 for maximum reliability (prevents truncation)
  // Local without LLM: 6000 for efficiency
  // Cloud APIs: 2000 for reliability
  const getDefaultChunkSize = (provider, llmEnabled = false) => {
    if (provider === 'local') {
      return llmEnabled ? 1800 : 6000;
    }
    return 2000;
  };
  const [chunkSize, setChunkSize] = useState(settings.chunkSize || getDefaultChunkSize('local'));
  const [openaiModel, setOpenaiModel] = useState(settings.openai_model || 'gpt-3.5-turbo');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [availableGlossaries, setAvailableGlossaries] = useState([]);
  const [selectedGlossaryIds, setSelectedGlossaryIds] = useState([]);
  const [useAllGlossaries, setUseAllGlossaries] = useState(true);
  // LLM Layer options (Ollama)
  const [useLLM, setUseLLM] = useState(false);
  const [llmFormality, setLlmFormality] = useState('neutral'); // 'informal', 'neutral', 'formal'
  const [llmImproveStructure, setLlmImproveStructure] = useState(true);
  const [llmVerifyGlossary, setLlmVerifyGlossary] = useState(false);
  const [llmSkipIfNoIssues, setLlmSkipIfNoIssues] = useState(false);
  const [llmPipeline, setLlmPipeline] = useState({
    validation: { enabled: false, model: '' },
    rewrite: { enabled: false, model: '' },
    technical: { enabled: false, model: '' }
  });
  const [llmGenerationOptions, setLlmGenerationOptions] = useState({
    num_ctx: '',
    num_batch: '',
    num_thread: '',
    num_gpu: ''
  });
  const [recommendedChunkSize, setRecommendedChunkSize] = useState(null);
  const [modelLimits, setModelLimits] = useState(null);
  const [showChunkModal, setShowChunkModal] = useState(false);
  const [selectedChunks, setSelectedChunks] = useState(null);
  const [ollamaSystemInfo, setOllamaSystemInfo] = useState(null);
  const [ollamaModels, setOllamaModels] = useState([]);
  
  // HTML formatting option
  const [htmlMode, setHtmlMode] = useState(false);
  
  // DeepL API options
  const [deeplOptions, setDeeplOptions] = useState({
    formality: settings.deepl_options?.formality || 'default',
    split_sentences: settings.deepl_options?.split_sentences || '1',
    preserve_formatting: settings.deepl_options?.preserve_formatting || '0',
    tag_handling: settings.deepl_options?.tag_handling || 'html',
    ignore_tags: settings.deepl_options?.ignore_tags || 'code,pre,script,style'
  });

  const isLocalProvider = apiProvider === 'local';

  const updatePipelineStage = (stage, updates) => {
    setLlmPipeline(prev => ({
      ...prev,
      [stage]: {
        ...prev[stage],
        ...updates
      }
    }));
  };

  const handleChunkClick = (square) => {
    if (square && square.chunks) {
      setSelectedChunks(square.chunks);
      setShowChunkModal(true);
    }
  };

  const getRecommendedGenOptions = () => {
    const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
    const hasGpu = !!ollamaSystemInfo?.gpu?.name;
    return {
      num_ctx: 4096,
      num_batch: 128,
      num_thread: Math.min(8, Math.max(2, Math.floor(cores / 2))),
      num_gpu: hasGpu ? 35 : 0
    };
  };

  const loadOllamaSystemInfo = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/ollama/system-info`);
      setOllamaSystemInfo(response.data);
    } catch (error) {
      setOllamaSystemInfo(null);
    }
  };

  const loadOllamaModels = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/ollama/models`);
      setOllamaModels(response.data?.models || []);
    } catch (error) {
      setOllamaModels([]);
    }
  };

  // Update chunk size when provider or LLM changes (unless user has manually set it)
  useEffect(() => {
    // Only auto-update if chunk size is at a default value
    const isDefaultChunkSize = chunkSize === 1800 || chunkSize === 2000 || chunkSize === 6000;
    if (isDefaultChunkSize) {
      const hasLLMStages = llmPipeline?.validation?.enabled || llmPipeline?.rewrite?.enabled || llmPipeline?.technical?.enabled;
      const isLLMEnabled = useLLM || hasLLMStages;
      setChunkSize(getDefaultChunkSize(apiProvider, isLLMEnabled));
    }
  }, [apiProvider, useLLM, llmPipeline?.validation?.enabled, llmPipeline?.rewrite?.enabled, llmPipeline?.technical?.enabled]);

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese (Brazilian)' },
    { code: 'ru', name: 'Russian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ar', name: 'Arabic' }
  ];

  useEffect(() => {
    // Load saved API credentials from settings
    const savedApiKey = settings[`${apiProvider}_api_key`];
    if (savedApiKey) {
      setApiKey(savedApiKey);
    } else {
      // Clear API key if provider changed and no key exists for new provider
      setApiKey('');
    }
    loadJobs();
    loadGlossaries();
  }, [apiProvider, settings, sourceLanguage, targetLanguage]);

  useEffect(() => {
    if (apiProvider === 'local' && useLLM) {
      loadOllamaSystemInfo();
      loadOllamaModels();
    }
  }, [apiProvider, useLLM]);

  // Fetch recommended chunk size based on pipeline configuration
  useEffect(() => {
    const fetchRecommendedChunkSize = async () => {
      try {
        // Only fetch if any pipeline stage is enabled
        const hasEnabledStages = Object.values(llmPipeline).some(stage => stage.enabled && stage.model);
        if (!hasEnabledStages) {
          setRecommendedChunkSize(null);
          return;
        }

        const response = await axios.post(`${API_URL}/api/model-limits/recommend-chunk-size`, {
          pipeline: llmPipeline
        });

        if (response.data.success) {
          setRecommendedChunkSize(response.data.recommendedChunkSize);
        }
      } catch (error) {
        console.error('Error fetching recommended chunk size:', error);
      }
    };

    fetchRecommendedChunkSize();
  }, [llmPipeline]);

  // Load model limits on mount
  useEffect(() => {
    const fetchModelLimits = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/model-limits`);
        if (response.data.success) {
          setModelLimits(response.data.models);
        }
      } catch (error) {
        console.error('Error fetching model limits:', error);
      }
    };

    fetchModelLimits();
  }, []);
  
  // Also update API key when settings change (e.g., after saving in Settings tab)
  useEffect(() => {
    const savedApiKey = settings[`${apiProvider}_api_key`];
    if (savedApiKey && savedApiKey !== apiKey) {
      setApiKey(savedApiKey);
    }
  }, [settings]);

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
    if (isLocalProvider) {
      // Local (LibreTranslate) doesn't have external API limits
      return;
    }
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
    // Local LibreTranslate test (no API key)
    if (apiProvider === 'local') {
      setTestingConnection(true);
      setConnectionTestResult(null);
      try {
        const response = await axios.post(`${API_URL}/api/local-translation/test`, {
          text: 'Hello',
          sourceLang: sourceLanguage,
          targetLang: targetLanguage
        });
        setConnectionTestResult({
          success: true,
          message: '✓ LibreTranslate is available',
          testTranslation: response.data?.result?.translatedText || response.data?.result?.translated_text || ''
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
      // Add DeepL options if DeepL is selected
      if (apiProvider === 'deepl') {
        apiOptions.formality = deeplOptions.formality;
        apiOptions.split_sentences = deeplOptions.split_sentences;
        apiOptions.preserve_formatting = deeplOptions.preserve_formatting;
        apiOptions.tag_handling = deeplOptions.tag_handling;
        apiOptions.ignore_tags = deeplOptions.ignore_tags;
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
    
    // Local and Google don't need API keys
    if (apiProvider !== 'google' && apiProvider !== 'local' && !apiKey) {
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
      // Add DeepL options if DeepL is selected
      if (apiProvider === 'deepl') {
        apiOptions.formality = deeplOptions.formality;
        apiOptions.split_sentences = deeplOptions.split_sentences;
        apiOptions.preserve_formatting = deeplOptions.preserve_formatting;
        apiOptions.tag_handling = deeplOptions.tag_handling;
        apiOptions.ignore_tags = deeplOptions.ignore_tags;
      }
      // Add local translation options (HTML mode, LLM layer)
      if (apiProvider === 'local') {
        apiOptions.htmlMode = htmlMode;
        apiOptions.useLLM = useLLM;
        apiOptions.formality = llmFormality;
        apiOptions.improveStructure = llmImproveStructure;
        apiOptions.verifyGlossary = llmVerifyGlossary;
        apiOptions.skipLLMIfNoIssues = llmSkipIfNoIssues;
        const normalizedPipeline = {};
        Object.entries(llmPipeline).forEach(([key, value]) => {
          if (value?.model?.startsWith(`__${key}_custom__`)) {
            normalizedPipeline[key] = {
              enabled: value.enabled,
              model: value.custom || ''
            };
          } else {
            normalizedPipeline[key] = {
              enabled: value.enabled,
              model: value.model || ''
            };
          }
        });
        apiOptions.llmPipeline = normalizedPipeline;

        const generationOptions = {};
        ['num_ctx', 'num_batch', 'num_thread', 'num_gpu'].forEach((key) => {
          const value = Number(llmGenerationOptions[key]);
          if (Number.isFinite(value) && value > 0) {
            generationOptions[key] = value;
          }
        });
        if (Object.keys(generationOptions).length === 0) {
          apiOptions.llmGenerationOptions = getRecommendedGenOptions();
        } else {
          apiOptions.llmGenerationOptions = generationOptions;
        }
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
      // Add DeepL options if DeepL is selected
      if (apiProvider === 'deepl') {
        apiOptions.formality = deeplOptions.formality;
        apiOptions.split_sentences = deeplOptions.split_sentences;
        apiOptions.preserve_formatting = deeplOptions.preserve_formatting;
        apiOptions.tag_handling = deeplOptions.tag_handling;
        apiOptions.ignore_tags = deeplOptions.ignore_tags;
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
            <label>
              {t('translationAPI')}
              {apiProvider === 'local' && <span className="recommended-badge" title="Recommended for privacy and unlimited usage">⭐ RECOMMENDED</span>}
            </label>
            <div className="input-with-help">
              <select value={apiProvider} onChange={(e) => setApiProvider(e.target.value)} className="api-provider-select">
                <option value="local">⭐ Local (LibreTranslate) - FREE & PRIVATE</option>
                <option value="google">{t('providerGoogle')} - Free (No API Key)</option>
                <option value="deepl">{t('providerDeepL')} - Best Quality (Paid)</option>
                <option value="openai">{t('providerOpenAI')} - AI-Powered (Paid)</option>
                <option value="chatgpt">{t('providerChatGPT')} - AI-Powered (Paid)</option>
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

          {/* DeepL API Options */}
          {apiProvider === 'deepl' && (
            <div className="deepl-options-section" style={{ 
              border: '1px solid #e0e0e0', 
              borderRadius: '8px', 
              padding: '16px', 
              marginTop: '8px',
              backgroundColor: '#f9f9f9'
            }}>
              <h4 style={{ marginTop: 0, marginBottom: '12px', fontSize: '1em', color: '#333' }}>
                ⚙️ {t('deeplApiOptions') || 'DeepL API Options'}
              </h4>
              
              <div className="form-group">
                <label>
                  <strong>{t('formality') || 'Translation Formality'}</strong>
                  <span style={{ fontSize: '0.85em', color: '#666', marginLeft: '8px', fontWeight: 'normal' }}>
                    ({t('formalityHelp') || 'How formal should the translation be?'})
                  </span>
                </label>
                <select 
                  value={deeplOptions.formality} 
                  onChange={(e) => setDeeplOptions({...deeplOptions, formality: e.target.value})}
                >
                  <option value="default">Default - Use standard formality level (recommended)</option>
                  <option value="less">Less Formal - More casual, natural, conversational tone</option>
                  <option value="more">More Formal - Professional, formal, business tone</option>
                  <option value="prefer_less">Prefer Less Formal - Mostly casual, formal only when necessary</option>
                  <option value="prefer_more">Prefer More Formal - Mostly formal, casual only when necessary</option>
                </select>
                <p className="help-text" style={{ fontSize: '0.85em', marginTop: '4px', opacity: 0.8 }}>
                  💡 <strong>Tip:</strong> Use "Less Formal" for books, stories, and casual content. Use "More Formal" for business documents. Works with: German, French, Italian, Japanese, Spanish, Dutch, Polish, Portuguese, Russian, Chinese.
                </p>
              </div>

              <div className="form-group">
                <label>
                  <strong>{t('splitSentences') || 'Sentence Splitting'}</strong>
                  <span style={{ fontSize: '0.85em', color: '#666', marginLeft: '8px', fontWeight: 'normal' }}>
                    ({t('splitSentencesHelp') || 'How should DeepL break up your text?'})
                  </span>
                </label>
                <select 
                  value={deeplOptions.split_sentences} 
                  onChange={(e) => setDeeplOptions({...deeplOptions, split_sentences: e.target.value})}
                >
                  <option value="1">Split on punctuation and newlines (Default - Best for most documents)</option>
                  <option value="nonewlines">Split on punctuation only - Keep line breaks as they are (Good for poetry, code, structured text)</option>
                  <option value="0">Don't split sentences - Keep everything exactly as written (Use for special formatting needs)</option>
                </select>
                <p className="help-text" style={{ fontSize: '0.85em', marginTop: '4px', opacity: 0.8 }}>
                  💡 <strong>Tip:</strong> "Split on punctuation only" is recommended for EPUB/DOCX files to preserve paragraph structure. "Don't split" is rarely needed.
                </p>
              </div>

              <div className="form-group">
                <label>
                  <strong>{t('preserveFormatting') || 'Preserve Original Formatting'}</strong>
                  <span style={{ fontSize: '0.85em', color: '#666', marginLeft: '8px', fontWeight: 'normal' }}>
                    ({t('preserveFormattingHelp') || 'Keep spacing and line breaks exactly as in original?'})
                  </span>
                </label>
                <select 
                  value={deeplOptions.preserve_formatting} 
                  onChange={(e) => setDeeplOptions({...deeplOptions, preserve_formatting: e.target.value})}
                >
                  <option value="0">No - Let DeepL normalize formatting (Default - Usually better quality)</option>
                  <option value="1">Yes - Keep original spacing and line breaks exactly as they are</option>
                </select>
                <p className="help-text" style={{ fontSize: '0.85em', marginTop: '4px', opacity: 0.8 }}>
                  💡 <strong>Tip:</strong> Use "Yes" only if your document has special formatting that must be preserved exactly. For most books and documents, "No" gives better translation quality.
                </p>
              </div>

              <div className="form-group">
                <label>
                  <strong>{t('tagHandling') || 'HTML/XML Tag Handling'}</strong>
                  <span style={{ fontSize: '0.85em', color: '#666', marginLeft: '8px', fontWeight: 'normal' }}>
                    ({t('tagHandlingHelp') || 'How should DeepL process HTML/XML tags in your document?'})
                  </span>
                </label>
                <select 
                  value={deeplOptions.tag_handling} 
                  onChange={(e) => setDeeplOptions({...deeplOptions, tag_handling: e.target.value})}
                >
                  <option value="html">HTML - For EPUB, DOCX, and web content (Default - Recommended)</option>
                  <option value="xml">XML - For XML documents only (Rarely needed)</option>
                </select>
                <p className="help-text" style={{ fontSize: '0.85em', marginTop: '4px', opacity: 0.8 }}>
                  💡 <strong>Tip:</strong> EPUB and DOCX files are automatically detected and use HTML mode. You usually don't need to change this.
                </p>
              </div>

              <div className="form-group">
                <label>
                  <strong>{t('ignoreTags') || 'Tags to Skip (Don\'t Translate)'}</strong>
                  <span style={{ fontSize: '0.85em', color: '#666', marginLeft: '8px', fontWeight: 'normal' }}>
                    ({t('ignoreTagsHelp') || 'Which HTML tags should DeepL leave untranslated?'})
                  </span>
                </label>
                <input
                  type="text"
                  value={deeplOptions.ignore_tags}
                  onChange={(e) => setDeeplOptions({...deeplOptions, ignore_tags: e.target.value})}
                  placeholder="code,pre,script,style"
                  style={{ width: '100%' }}
                />
                <p className="help-text" style={{ fontSize: '0.85em', marginTop: '4px', opacity: 0.8 }}>
                  💡 <strong>Tip:</strong> Enter tag names separated by commas (e.g., <code>code,pre,script,style</code>). This is useful if your document contains code blocks, scripts, or CSS that shouldn't be translated. Default: <code>code,pre,script,style</code>
                </p>
              </div>
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
            <label>{t('chunkSizeTokens') || 'Chunk Size (tokens)'}</label>
            <input
              type="number"
              value={chunkSize}
              onChange={(e) => setChunkSize(parseInt(e.target.value) || (apiProvider === 'local' ? 1800 : 2000))}
              min={500}
              max={8000}
              step={100}
            />
            <p className="help-text" style={{ fontSize: '0.85em', marginTop: '4px', opacity: 0.8 }}>
              {documentInfo && recommendations && recommendations[0] ? (
                <>📄 Document-based: {recommendations[0].recommendedChunkSize.toLocaleString()} tokens (from {recommendations[0].model})</>
              ) : recommendedChunkSize ? (
                <>🤖 Model-based: {recommendedChunkSize.toLocaleString()} tokens 
                  {chunkSize > recommendedChunkSize * 1.5 && (
                    <span style={{ color: '#ff6b6b', fontWeight: 'bold' }}> ⚠️ Current size may cause timeouts!</span>
                  )}
                  {chunkSize > recommendedChunkSize * 2 && (
                    <span style={{ color: '#ff0000', fontWeight: 'bold' }}> 🚨 CRITICAL: Reduce chunk size to avoid failures!</span>
                  )}
                </>
              ) : apiProvider === 'local' && (useLLM || llmPipeline?.validation?.enabled || llmPipeline?.rewrite?.enabled || llmPipeline?.technical?.enabled) ? (
                <>💡 Recommended: 1800 tokens for LLM pipeline. Smaller chunks prevent truncation and timeouts. ~1800 tokens ≈ 7,200 characters.</>
              ) : apiProvider === 'local' ? (
                <>💡 Recommended: 6000 tokens (LibreTranslate only). Larger chunks are efficient without LLM. ~6000 tokens ≈ 24,000 characters.</>
              ) : (
                <>💡 Recommended: 3000 tokens. Balances API cost and quality. ~3000 tokens ≈ 12,000 characters.</>
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
                  <span>{t('useAllGlossaries') || 'Apply all glossary terms to translation'}</span>
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

          {/* Render Local Translation Panel */}
          {apiProvider === 'local' && (
            <div className="form-group full-width">
              <LocalTranslationPanel />
            </div>
          )}

          {/* HTML Formatting Option (Local only) */}
          {apiProvider === 'local' && (
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={htmlMode}
                  onChange={(e) => setHtmlMode(e.target.checked)}
                />
                <span>📄 Preserve Formatting (HTML Mode)</span>
              </label>
              <p className="help-text" style={{ fontSize: '0.85em', marginTop: '4px', opacity: 0.8 }}>
                Uses HTML mode to preserve text formatting like bold, italic, etc. Useful for EPUB and DOCX files.
              </p>
            </div>
          )}

          {/* LLM Enhancement Layer (Local only) */}
          {apiProvider === 'local' && (
            <div className="form-group full-width">
              <div style={{ 
                border: '2px solid #667eea', 
                borderRadius: '12px', 
                padding: '16px', 
                backgroundColor: '#f8f9ff'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={useLLM}
                      onChange={(e) => setUseLLM(e.target.checked)}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span style={{ fontSize: '1.1em', fontWeight: 600 }}>🤖 Use LLM Enhancement Layer</span>
                  </label>
                  <span style={{ 
                    padding: '4px 8px', 
                    background: '#667eea', 
                    color: 'white', 
                    borderRadius: '4px', 
                    fontSize: '0.75em',
                    fontWeight: 600
                  }}>
                    BETA
                  </span>
                </div>

                <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '12px' }}>
                  Enhance translations with AI-powered post-processing: formality adjustment, text structure improvements, and glossary verification.
                </p>

                {useLLM && (
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '12px',
                    padding: '12px',
                    background: 'white',
                    borderRadius: '8px'
                  }}>
                    {/* Formality Control */}
                    <div>
                      <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>
                        📊 Translation Formality
                      </label>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {['informal', 'neutral', 'formal'].map(level => (
                          <button
                            key={level}
                            type="button"
                            onClick={() => setLlmFormality(level)}
                            style={{
                              padding: '8px 16px',
                              border: llmFormality === level ? '2px solid #667eea' : '1px solid #ddd',
                              background: llmFormality === level ? '#e8eaff' : 'white',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontWeight: llmFormality === level ? 600 : 400,
                              transition: 'all 0.2s'
                            }}
                          >
                            {level === 'informal' && '😊 Informal'}
                            {level === 'neutral' && '⚖️ Neutral'}
                            {level === 'formal' && '🎩 Formal'}
                          </button>
                        ))}
                      </div>
                      <p style={{ fontSize: '0.8em', color: '#666', marginTop: '4px' }}>
                        {llmFormality === 'informal' && 'Casual, conversational tone'}
                        {llmFormality === 'neutral' && 'Balanced, standard tone (recommended)'}
                        {llmFormality === 'formal' && 'Professional, formal tone'}
                      </p>
                    </div>

                    {/* Text Structure Improvements */}
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={llmImproveStructure}
                          onChange={(e) => setLlmImproveStructure(e.target.checked)}
                        />
                        <span style={{ fontWeight: 600 }}>✨ Improve Text Structure</span>
                      </label>
                      <p style={{ fontSize: '0.8em', color: '#666', marginLeft: '28px', marginTop: '4px' }}>
                        Enhance cohesion, coherence, grammar, and natural language flow
                      </p>
                    </div>

                    {/* Glossary Verification */}
                    {availableGlossaries.length > 0 && (
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={llmVerifyGlossary}
                            onChange={(e) => setLlmVerifyGlossary(e.target.checked)}
                          />
                          <span style={{ fontWeight: 600 }}>📚 Verify Glossary Terms</span>
                        </label>
                        <p style={{ fontSize: '0.8em', color: '#666', marginLeft: '28px', marginTop: '4px' }}>
                          Double-check that glossary terms are correctly translated ({availableGlossaries.length} terms)
                        </p>
                      </div>
                    )}

                    {/* Smart Pipeline Toggle - NEW */}
                    <div style={{ borderTop: '1px solid #eef0f5', paddingTop: '12px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={llmSkipIfNoIssues}
                          onChange={(e) => setLlmSkipIfNoIssues(e.target.checked)}
                        />
                        <span style={{ fontWeight: 600 }}>🧠 Smart Pipeline (Recommended)</span>
                      </label>
                      <p style={{ fontSize: '0.8em', color: '#666', marginLeft: '28px', marginTop: '4px' }}>
                        Automatically skips unnecessary LLM stages based on quality score:
                      </p>
                      <ul style={{ fontSize: '0.75em', color: '#666', marginLeft: '48px', marginTop: '4px' }}>
                        <li>Score ≥85: Skip all LLM stages</li>
                        <li>Score 70-85: Run validation only</li>
                        <li>Score &lt;70: Run full pipeline</li>
                      </ul>
                    </div>

                    {/* Extra LLM Pipeline */}
                    <div style={{ borderTop: '1px solid #eef0f5', paddingTop: '8px' }}>
                      <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
                        🔄 LLM Pipeline Stages
                      </label>
                      <p style={{ fontSize: '0.8em', color: '#666', marginBottom: '12px' }}>
                        <strong>NEW:</strong> Optimized pipeline that runs stages in order. Validation can skip rewrite if translation is already good.
                      </p>
                      <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '6px', marginBottom: '12px' }}>
                        <p style={{ fontSize: '0.75em', margin: 0 }}>
                          <strong>Pipeline Flow:</strong><br/>
                          1️⃣ LibreTranslate → 2️⃣ Text Analyzer (fast) → 3️⃣ Validation (Qwen) → 4️⃣ Rewrite (LLaMA, if needed) → 5️⃣ Technical Check (Mistral, optional)
                        </p>
                      </div>
                      {[
                        { 
                          key: 'validation', 
                          label: '🔍 Validation', 
                          hint: 'Recommended: qwen2.5:7b', 
                          recommended: 'qwen2.5:7b',
                          description: 'Detects translation issues (grammar, meaning). Returns "OK" or list of issues.',
                          chunkSize: '2000 tokens max',
                          alwaysEnabled: false
                        },
                        { 
                          key: 'rewrite', 
                          label: '✏️ Rewrite', 
                          hint: 'Recommended: llama3.1:8b (3B model fails with HTML)', 
                          recommended: 'llama3.1:8b',
                          description: 'Rewrites text ONLY if validation found issues. Fixes grammar/semantic problems.',
                          chunkSize: 'llama3.2:3b → 1200 tokens (plain text only) | llama3.1:8b → 1800 tokens',
                          warning: '⚠️ llama3.2:3b NOT recommended for HTML content - use llama3.1:8b instead',
                          alwaysEnabled: false
                        },
                        { 
                          key: 'technical', 
                          label: '🔧 Technical Check', 
                          hint: 'Recommended: mistral:7b', 
                          recommended: 'mistral:7b',
                          description: 'Optional final review for technical accuracy, terminology, and formatting.',
                          chunkSize: '1800 tokens max',
                          alwaysEnabled: false
                        }
                      ].map(stage => (
                        <div key={stage.key} style={{ marginBottom: '12px', padding: '10px', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '6px' }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '6px' }}>
                            <input
                              type="checkbox"
                              checked={llmPipeline[stage.key].enabled}
                              onChange={(e) => updatePipelineStage(stage.key, { enabled: e.target.checked })}
                              style={{ marginTop: '2px' }}
                            />
                            <div style={{ flex: 1 }}>
                              <span style={{ fontWeight: 600, fontSize: '0.9em' }}>
                                {stage.label}
                              </span>
                              <p style={{ fontSize: '0.75em', color: '#666', margin: '4px 0 4px 0' }}>
                                {stage.description}
                              </p>
                              <p style={{ fontSize: '0.7em', color: '#1a73e8', margin: '0 0 8px 0', fontWeight: 500 }}>
                                📊 {stage.chunkSize}
                              </p>
                              <select
                                value={llmPipeline[stage.key].model}
                                onChange={(e) => updatePipelineStage(stage.key, { model: e.target.value })}
                                style={{ width: '100%', fontSize: '0.85em', padding: '6px' }}
                                disabled={!llmPipeline[stage.key].enabled}
                              >
                                <option value="">Use main LLM model (default)</option>
                                {ollamaModels.map(model => (
                                  <option key={model.name} value={model.name}>{model.name}</option>
                                ))}
                                <option value={`__${stage.key}_custom__`}>Custom...</option>
                              </select>
                              {llmPipeline[stage.key].model?.startsWith(`__${stage.key}_custom__`) && (
                                <input
                                  type="text"
                                  value={llmPipeline[stage.key].custom || ''}
                                  onChange={(e) => updatePipelineStage(stage.key, { custom: e.target.value })}
                                  placeholder={stage.hint}
                                  style={{ width: '100%', marginTop: '6px', fontSize: '0.85em', padding: '6px' }}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      <p style={{ fontSize: '0.75em', color: '#666', marginTop: '8px', padding: '8px', background: '#fff9e6', borderRadius: '4px' }}>
                        💡 <strong>Tip:</strong> Validation stage can skip rewrite if it finds no issues, saving time and reducing timeouts with 7B-8B models.
                      </p>
                    </div>

                    {/* Generation Options */}
                    <div style={{ borderTop: '1px solid #eef0f5', paddingTop: '8px' }}>
                      <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
                        🧰 Generation Options (advanced)
                      </label>
                      <p style={{ fontSize: '0.8em', color: '#666', marginBottom: '8px' }}>
                        Recommended defaults for your machine will be used if you leave fields empty.
                      </p>
                      <button
                        type="button"
                        className="btn-small"
                        onClick={() => {
                          const recommended = getRecommendedGenOptions();
                          setLlmGenerationOptions({
                            num_ctx: String(recommended.num_ctx),
                            num_batch: String(recommended.num_batch),
                            num_thread: String(recommended.num_thread),
                            num_gpu: String(recommended.num_gpu)
                          });
                        }}
                        style={{ marginBottom: '10px' }}
                      >
                        Apply recommended values
                      </button>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                        {[
                          { key: 'num_ctx', label: 'Context' },
                          { key: 'num_batch', label: 'Batch' },
                          { key: 'num_thread', label: 'Threads' },
                          { key: 'num_gpu', label: 'GPU layers' }
                        ].map(option => (
                          <label key={option.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8em' }}>
                            {option.label}
                            <input
                              type="number"
                              min="0"
                              value={llmGenerationOptions[option.key]}
                              onChange={(e) => setLlmGenerationOptions(prev => ({ ...prev, [option.key]: e.target.value }))}
                              placeholder={String(getRecommendedGenOptions()[option.key])}
                            />
                          </label>
                        ))}
                      </div>
                      <p style={{ fontSize: '0.75em', color: '#666', marginTop: '8px' }}>
                        Tips: Context 2048–8192, Batch 32–256, Threads 2–8, GPU layers 0+
                        {ollamaSystemInfo?.gpu?.name ? ' (recommended 35 with GPU)' : ' (set to 0 if no GPU)'}.
                      </p>
                    </div>

                    {/* Warning about processing time */}
                    <div style={{ 
                      padding: '8px 12px', 
                      background: '#fff3cd', 
                      border: '1px solid #ffc107',
                      borderRadius: '6px',
                      fontSize: '0.85em'
                    }}>
                      <strong>⚠️ Note:</strong> LLM enhancement adds processing time (~2-20 seconds per page depending on your hardware).
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ollama Panel (Local only, shown when LLM is enabled) */}
          {apiProvider === 'local' && useLLM && (
            <div className="form-group full-width">
              <OllamaPanel />
            </div>
          )}

          {!isLocalProvider && (
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
          )}
        </div>

        <div className="action-buttons">
          <button onClick={handleUpload} className="btn-primary" disabled={!file || (apiProvider !== 'google' && apiProvider !== 'local' && !apiKey)}>
            🚀 {t('startTranslation')}
          </button>
          {!isLocalProvider && (
            <button 
              onClick={checkApiLimits} 
              className="btn-secondary btn-check-limits" 
              disabled={(apiProvider !== 'google' && !apiKey) || refreshingLimits}
            >
              {refreshingLimits ? `⏳ ${t('checking')}...` : `📊 ${t('refreshLimits')}`}
            </button>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}

        {!isLocalProvider && apiLimits && (
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
        {!isLocalProvider && (() => {
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

        {progress && progress.chunks && (
          <div className="progress-section">
            <h3>Translation Progress</h3>
            <ChunkProgressBar 
              chunks={progress.chunks}
              totalChunks={progress.total}
              onChunkClick={handleChunkClick}
            />
          </div>
        )}

        {showChunkModal && selectedChunks && (
          <ChunkModal
            chunks={selectedChunks}
            onClose={() => {
              setShowChunkModal(false);
              setSelectedChunks(null);
            }}
          />
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
              <h4>🏠 Local (LibreTranslate) - FREE ⭐ RECOMMENDED</h4>
              <p className="free-option">
                ✨ <strong>No API key needed!</strong> LibreTranslate runs on your computer for complete privacy and unlimited translations.
              </p>
              <p>
                <strong>Perfect for:</strong>
                <ul>
                  <li>✅ <strong>100% Free</strong> - No API costs, unlimited translations</li>
                  <li>✅ <strong>Complete Privacy</strong> - Your texts never leave your computer</li>
                  <li>✅ <strong>No Rate Limits</strong> - Translate as much as you want</li>
                  <li>✅ <strong>Offline Capable</strong> - Works without internet (after initial setup)</li>
                </ul>
              </p>
              <p>
                <strong>Setup:</strong>
                <ol>
                  <li>Install Docker Desktop from <a href="https://www.docker.com/get-started" target="_blank" rel="noopener noreferrer">docker.com</a></li>
                  <li>The app will auto-start LibreTranslate when you launch it</li>
                  <li>Or click "Start" in the Settings tab → Local Translation panel</li>
                </ol>
              </p>
              <p className="warning-note">
                ℹ️ <strong>Note:</strong> Translation quality is ~70% of DeepL, but constantly improving. Great for most use cases!
              </p>

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

              <h4>DeepL API (Paid)</h4>
              <ol>
                <li>Go to <a href="https://www.deepl.com/pro-api" target="_blank" rel="noopener noreferrer">deepl.com/pro-api</a></li>
                <li>Sign up for a free or paid account</li>
                <li>Navigate to your account settings</li>
                <li>Copy your API authentication key</li>
                <li>Paste it in the API Key field above</li>
              </ol>

              <h4>OpenAI API (Paid)</h4>
              <ol>
                <li>Go to <a href="https://platform.openai.com" target="_blank" rel="noopener noreferrer">platform.openai.com</a></li>
                <li>Sign in or create an account</li>
                <li>Navigate to API Keys section</li>
                <li>Click "Create new secret key"</li>
                <li>Copy and save your API key securely</li>
                <li>Paste it in the API Key field above</li>
              </ol>

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
                  <li><strong>🏠 Local (LibreTranslate) - RECOMMENDED:</strong> 100% free, unlimited, private. Runs on your computer. Quality ~70% of DeepL. No API key needed. Requires Docker.</li>
                  <li><strong>Google Translate:</strong> Free, no API key needed. May be rate-limited for heavy usage.</li>
                  <li><strong>DeepL:</strong> Best quality for European languages. Free tier: 500k chars/month. Paid plans available.</li>
                  <li><strong>OpenAI/ChatGPT:</strong> Great for context-aware translations. Pay per token used.</li>
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

