import { useState, useEffect } from 'react';
import axios from 'axios';
import { t } from '../utils/i18n.js';

const API_URL = import.meta.env.VITE_API_URL || '';

function HistoryTab({ settings, onTranslationReady }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryingJob, setRetryingJob] = useState(null);
  const [retryOptions, setRetryOptions] = useState({
    jobId: null,
    provider: '',
    apiKey: '',
    fromBeginning: false
  });
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [expandedJob, setExpandedJob] = useState(null);
  const [jobChunks, setJobChunks] = useState({});
  const [generatingDocument, setGeneratingDocument] = useState(null);
  const [filterFailedOnly, setFilterFailedOnly] = useState(false);
  const [chunkStatusFilter, setChunkStatusFilter] = useState('all');
  const [outputPaths, setOutputPaths] = useState({});
  const [storageInfo, setStorageInfo] = useState(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [showPauseSettingsModal, setShowPauseSettingsModal] = useState(false);
  const [pauseSettings, setPauseSettings] = useState({
    jobId: null,
    apiProvider: '',
    apiKey: '',
    openaiModel: '',
    chunkSize: 3000,
    deeplOptions: {
      formality: 'default',
      split_sentences: '1',
      preserve_formatting: '0',
      tag_handling: 'html',
      ignore_tags: 'code,pre,script,style'
    }
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [processingStats, setProcessingStats] = useState({}); // Track processing stats per job

  useEffect(() => {
    loadJobs();
    loadStorageInfo();
    // Refresh every 10 seconds
    const interval = setInterval(() => {
      loadJobs();
      loadStorageInfo();
    }, 10000);
    
    // Update retry countdown every second for real-time display
    const countdownInterval = setInterval(() => {
      // Only update currentTime to trigger re-render for countdown timers
      // Don't update jobs array unnecessarily as it causes re-renders
      setCurrentTime(new Date());
    }, 1000);
    
    return () => {
      clearInterval(interval);
      clearInterval(countdownInterval);
    };
  }, []);

  const loadJobs = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/translation/jobs`);
      setJobs(response.data);
      setError('');
      
      // Notify parent if there are ready translations
      if (onTranslationReady) {
        const hasCompleted = response.data.some(job => job.status === 'completed');
        if (hasCompleted) {
          onTranslationReady();
        }
      }
    } catch (err) {
      setError('Failed to load translation history');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadJobChunks = async (jobId) => {
    try {
      const response = await axios.get(`${API_URL}/api/translation/chunks/${jobId}`);
      setJobChunks(prev => {
        // Only update if data actually changed to avoid unnecessary re-renders
        const existingChunks = prev[jobId];
        if (existingChunks && existingChunks.length === response.data.length) {
          // Check if any chunk status or data changed
          const hasChanged = existingChunks.some((chunk, idx) => {
            const newChunk = response.data[idx];
            return !newChunk || 
                   chunk.status !== newChunk.status ||
                   chunk.updated_at !== newChunk.updated_at ||
                   chunk.next_retry_at !== newChunk.next_retry_at;
          });
          if (!hasChanged) {
            return prev; // No change, return same reference to prevent re-render
          }
        }
        return { ...prev, [jobId]: response.data };
      });
      
      // Update processing stats after chunks are loaded
      if (jobId === expandedJob) {
        setTimeout(() => updateProcessingStats(jobId), 100);
      }
    } catch (err) {
      console.error('Failed to load chunks:', err);
    }
  };

  // Update processing statistics for a job
  const updateProcessingStats = (jobId) => {
    const chunks = jobChunks[jobId];
    if (!chunks || chunks.length === 0) return;
    
    const translating = chunks.filter(c => c.status === 'translating');
    const completed = chunks.filter(c => c.status === 'completed');
    const pending = chunks.filter(c => c.status === 'pending');
    
    // Calculate processing rate (chunks per minute)
    if (completed.length > 1) {
      const sortedCompleted = [...completed].sort((a, b) => 
        new Date(a.updated_at) - new Date(b.updated_at)
      );
      const firstCompleted = new Date(sortedCompleted[0]?.updated_at || Date.now());
      const lastCompleted = new Date(sortedCompleted[sortedCompleted.length - 1]?.updated_at || Date.now());
      const timeDiff = (lastCompleted - firstCompleted) / 1000 / 60; // minutes
      const rate = timeDiff > 0 ? completed.length / timeDiff : 0;
      
      setProcessingStats(prev => ({
        ...prev,
        [jobId]: {
          currentChunk: translating[0]?.chunk_index + 1 || null,
          totalChunks: chunks.length,
          completed: completed.length,
          pending: pending.length,
          rate: rate.toFixed(1),
          queuePosition: pending.length
        }
      }));
    } else if (completed.length === 1) {
      // Just one completed chunk, set initial stats
      setProcessingStats(prev => ({
        ...prev,
        [jobId]: {
          currentChunk: translating[0]?.chunk_index + 1 || null,
          totalChunks: chunks.length,
          completed: completed.length,
          pending: pending.length,
          rate: '0.0',
          queuePosition: pending.length
        }
      }));
    }
  };

  // Reload chunks for expanded jobs to update countdown timers in real-time
  useEffect(() => {
    if (!expandedJob) return;
    
    // Load chunks immediately when job is expanded
    loadJobChunks(expandedJob);
    
    // Set up interval to refresh chunks every second
    const interval = setInterval(() => {
      loadJobChunks(expandedJob);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [expandedJob]); // Only depend on expandedJob, not jobChunks to avoid infinite loop

  // Update processing stats when expanded job changes
  // Note: Processing stats are updated in loadJobChunks callback to avoid dependency loops
  useEffect(() => {
    if (expandedJob && jobChunks[expandedJob] && jobChunks[expandedJob].length > 0) {
      updateProcessingStats(expandedJob);
    }
  }, [expandedJob]); // Only depend on expandedJob to avoid re-render loops

  // Calculate estimated time for pending chunks (including failed chunks that are pending retry)
  const calculateEstimatedTime = (chunk, allChunks, job) => {
    if (chunk.status !== 'pending') return null;
    
    // If chunk has a next_retry_at timestamp (failed chunk pending retry), use that
    if (chunk.next_retry_at) {
      const retryTime = new Date(chunk.next_retry_at);
      const now = new Date();
      const diffMs = retryTime - now;
      if (diffMs > 0) {
        return diffMs; // Return exact time until retry
      }
      // If retry time has passed, it should be processing now
      return 0;
    }
    
    // Find position in queue (how many chunks are ahead, including translating chunks)
    const pendingChunks = allChunks.filter(c => 
      (c.status === 'pending' || c.status === 'translating') && 
      c.chunk_index < chunk.chunk_index
    );
    const queuePosition = pendingChunks.length;
    
    // Calculate average processing time from completed chunks
    const completedChunks = allChunks
      .filter(c => c.status === 'completed' && c.updated_at)
      .sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at));
    
    if (completedChunks.length === 0) {
      // No completed chunks yet, estimate based on provider defaults
      const avgTimePerChunk = job.api_provider === 'deepl' ? 5000 : 8000; // 5-8 seconds per chunk
      const estimatedMs = queuePosition * avgTimePerChunk;
      return estimatedMs;
    }
    
    // Calculate average time between chunks (use recent chunks for better accuracy)
    const times = [];
    const recentChunks = completedChunks.slice(-10); // Use last 10 completed chunks
    for (let i = 1; i < recentChunks.length; i++) {
      const prev = new Date(recentChunks[i-1].updated_at);
      const curr = new Date(recentChunks[i].updated_at);
      const diff = curr - prev;
      if (diff > 0 && diff < 120000) { // Only count reasonable times (< 2 minutes)
        times.push(diff);
      }
    }
    
    if (times.length === 0) {
      // Fallback to default
      const avgTimePerChunk = job.api_provider === 'deepl' ? 5000 : 8000;
      return queuePosition * avgTimePerChunk;
    }
    
    // Use median for more accurate estimation (less affected by outliers)
    const sortedTimes = times.sort((a, b) => a - b);
    const medianTime = sortedTimes[Math.floor(sortedTimes.length / 2)];
    const estimatedMs = queuePosition * medianTime;
    
    return estimatedMs;
  };

  // Format estimated time with more precision
  const formatEstimatedTime = (ms) => {
    if (!ms || ms <= 0) return t('processingNow') || 'Processing now...';
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };


  const loadStorageInfo = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/translation/storage-info`);
      setStorageInfo(response.data);
    } catch (err) {
      console.error('Failed to load storage info:', err);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm(t('clearAllConfirm'))) {
      return;
    }
    
    try {
      await axios.delete(`${API_URL}/api/translation/clear-all`);
      setError('');
      alert(t('clearAllSuccess'));
      loadJobs();
      loadStorageInfo();
      setShowClearAllModal(false);
    } catch (err) {
      setError(t('clearAllFailed') + ': ' + (err.response?.data?.error || err.message));
    }
  };

  const toggleJobExpand = (jobId) => {
    if (expandedJob === jobId) {
      setExpandedJob(null);
    } else {
      setExpandedJob(jobId);
      if (!jobChunks[jobId]) {
        loadJobChunks(jobId);
      }
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    loadJobs();
  };

  const openRetryModal = (job, fromBeginning = false) => {
    setRetryOptions({
      jobId: job.id,
      provider: job.api_provider,
      apiKey: settings[`${job.api_provider}_api_key`] || '',
      fromBeginning
    });
    setShowRetryModal(true);
  };

  const handleRetry = async () => {
    if (!retryOptions.apiKey && retryOptions.provider !== 'google' && retryOptions.provider !== 'local') {
      setError('Please enter API key');
      return;
    }

    setRetryingJob(retryOptions.jobId);
    setShowRetryModal(false);

    try {
      const endpoint = retryOptions.fromBeginning 
        ? `/api/translation/retry-all/${retryOptions.jobId}`
        : `/api/translation/retry/${retryOptions.jobId}`;

      await axios.post(`${API_URL}${endpoint}`, {
        apiKey: retryOptions.apiKey,
        apiProvider: retryOptions.provider,
        apiOptions: settings[`${retryOptions.provider}_options`] || {}
      });

      setError('');
      setTimeout(loadJobs, 2000);
    } catch (err) {
      setError(`Retry failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setRetryingJob(null);
    }
  };

  const handleDownload = (jobId) => {
    window.open(`${API_URL}/api/translation/download/${jobId}`, '_blank');
  };

  const handlePause = async (jobId) => {
    try {
      await axios.post(`${API_URL}/api/translation/pause/${jobId}`);
      loadJobs();
    } catch (err) {
      setError(`Failed to pause: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleResume = async (jobId, apiKey, apiOptions, apiProvider) => {
    try {
      await axios.post(`${API_URL}/api/translation/resume/${jobId}`, {
        apiKey,
        apiOptions,
        apiProvider
      });
      loadJobs();
    } catch (err) {
      setError(`Failed to resume: ${err.response?.data?.error || err.message}`);
    }
  };

  const openPauseSettingsModal = (job) => {
    const deeplOpts = settings.deepl_options || {};
    setPauseSettings({
      jobId: job.id,
      apiProvider: job.api_provider,
      apiKey: settings[`${job.api_provider}_api_key`] || '',
      openaiModel: settings.openai_model || 'gpt-3.5-turbo',
      chunkSize: settings.chunkSize || 3000,
      deeplOptions: {
        formality: deeplOpts.formality || 'default',
        split_sentences: deeplOpts.split_sentences || '1',
        preserve_formatting: deeplOpts.preserve_formatting || '0',
        tag_handling: deeplOpts.tag_handling || 'html',
        ignore_tags: deeplOpts.ignore_tags || 'code,pre,script,style'
      }
    });
    setShowPauseSettingsModal(true);
  };

  const handleUpdatePauseSettings = async () => {
    try {
      const apiOptions = {};
      if (pauseSettings.apiProvider === 'openai' || pauseSettings.apiProvider === 'chatgpt') {
        apiOptions.model = pauseSettings.openaiModel;
      }
      // Add DeepL options if DeepL is selected
      if (pauseSettings.apiProvider === 'deepl') {
        apiOptions.formality = pauseSettings.deeplOptions.formality;
        apiOptions.split_sentences = pauseSettings.deeplOptions.split_sentences;
        apiOptions.preserve_formatting = pauseSettings.deeplOptions.preserve_formatting;
        apiOptions.tag_handling = pauseSettings.deeplOptions.tag_handling;
        apiOptions.ignore_tags = pauseSettings.deeplOptions.ignore_tags;
      }
      
      await axios.put(`${API_URL}/api/translation/settings/${pauseSettings.jobId}`, {
        apiProvider: pauseSettings.apiProvider,
        apiKey: pauseSettings.apiKey,
        apiOptions,
        chunkSize: pauseSettings.chunkSize
      });
      
      setShowPauseSettingsModal(false);
      loadJobs();
    } catch (err) {
      setError(`Failed to update settings: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleDelete = async (jobId) => {
    if (!confirm('Delete this translation job? This cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/api/translation/jobs/${jobId}`);
      loadJobs();
    } catch (err) {
      setError('Failed to delete job');
    }
  };

  const handleGeneratePartialDocument = async (jobId) => {
    setGeneratingDocument(jobId);
    try {
      const response = await axios.post(`${API_URL}/api/translation/generate-partial/${jobId}`);
      const { outputPath, completed, total, outputFilename } = response.data;
      setOutputPaths(prev => ({ ...prev, [jobId]: outputPath }));
      
      // Automatically download the partial document
      window.open(`${API_URL}/api/translation/download-partial/${jobId}`, '_blank');
      
      // Show success message
      setTimeout(() => {
        alert(`Partial document generated and downloaded!\n\nCompleted: ${completed}/${total} chunks\n\nFile: ${outputFilename}`);
      }, 500);
      
      loadJobs();
    } catch (err) {
      setError(`Failed to generate partial document: ${err.response?.data?.error || err.message}`);
    } finally {
      setGeneratingDocument(null);
    }
  };

  const handleGenerateDocument = async (jobId) => {
    setGeneratingDocument(jobId);
    try {
      const response = await axios.post(`${API_URL}/api/translation/generate/${jobId}`);
      setError('');
      // Store output path
      if (response.data.outputPath) {
        setOutputPaths(prev => ({ ...prev, [jobId]: response.data.outputPath }));
      }
      alert(`Document generated successfully!\n\nSaved to: ${response.data.outputPath || response.data.outputDirectory}/${response.data.outputFilename}`);
      loadJobs();
    } catch (err) {
      setError(`Failed to generate document: ${err.response?.data?.error || err.message}`);
    } finally {
      setGeneratingDocument(null);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#ffc107',
      translating: '#17a2b8',
      completed: '#28a745',
      failed: '#dc3545',
      partial: '#fd7e14'
    };
    return colors[status] || '#6c757d';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatRetryTime = (dateString) => {
    if (!dateString) return t('notScheduled');
    const retryDate = new Date(dateString);
    const now = new Date();
    const diffMs = retryDate - now;
    
    if (diffMs <= 0) {
      return t('retryNow');
    }
    
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    
    if (diffMins > 60) {
      const diffHours = Math.floor(diffMins / 60);
      const remainingMins = diffMins % 60;
      return `${diffHours}h ${remainingMins}${t('minutes')}`;
    } else if (diffMins > 0) {
      return `${diffMins}${t('minutes')} ${diffSecs}${t('seconds')}`;
    } else {
      return `${diffSecs}${t('seconds')}`;
    }
  };

  const formatStorageSize = (bytes) => {
    if (!bytes) return '0 B';
    const kb = bytes / 1024;
    const mb = kb / 1024;
    const gb = mb / 1024;
    
    if (gb >= 1) {
      return `${gb.toFixed(2)} GB`;
    } else if (mb >= 1) {
      return `${mb.toFixed(2)} MB`;
    } else if (kb >= 1) {
      return `${kb.toFixed(2)} KB`;
    } else {
      return `${bytes} B`;
    }
  };

  const openDirectory = (path) => {
    // Extract directory from file path
    const pathParts = path.split('/');
    pathParts.pop(); // Remove filename
    const directory = pathParts.join('/');
    
    // Use platform-specific commands to open directory
    if (navigator.platform.toLowerCase().includes('win')) {
      // Windows
      window.open(`file:///${directory.replace(/\//g, '\\')}`);
    } else {
      // Linux/Mac - try to open with file manager
      fetch(`${API_URL}/api/translation/open-directory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: directory })
      }).catch(err => {
        console.error('Failed to open directory:', err);
        alert(`Directory: ${directory}\n\nPlease open this directory manually.`);
      });
    }
  };

  const getOutputPath = (job) => {
    if (job.status !== 'completed') return null;
    // Use stored output path if available, otherwise construct from settings
    if (outputPaths[job.id]) {
      return outputPaths[job.id];
    }
    const outputDir = settings.outputDirectory || 'backend/outputs';
    const filename = job.filename.replace(/\.[^.]+$/, '');
    return `${outputDir}/translated_${filename}.${job.output_format}`;
  };

  const getChunkStatusColor = (status) => {
    const colors = {
      pending: '#ffc107',
      translating: '#17a2b8',
      completed: '#28a745',
      failed: '#dc3545'
    };
    return colors[status] || '#6c757d';
  };

  const getChunkStatusIcon = (status) => {
    const icons = {
      pending: '⏳',
      translating: '🔄',
      completed: '✅',
      failed: '❌'
    };
    return icons[status] || '●';
  };

  const canGenerateDocument = (job) => {
    return job.completed_chunks === job.total_chunks && job.failed_chunks === 0;
  };

  if (loading && jobs.length === 0) {
    return (
      <div className="history-tab">
        <h2>{t('translationHistory')}</h2>
        <div className="loading-message">
          <p>⏳ {t('loadingChunks')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="history-tab">
      <div className="history-header">
        <h2>{t('translationHistory')}</h2>
        <div className="header-actions">
          {storageInfo && (
            <div className="storage-info">
              <span className="storage-label">💾 {t('storageUsed')}:</span>
              <span className="storage-value">{formatStorageSize(storageInfo.totalSize)}</span>
            </div>
          )}
          <button 
            onClick={() => setShowClearAllModal(true)}
            className="btn-small btn-danger"
            title={t('clearAllData')}
          >
            🗑️ {t('clearAll')}
          </button>
          <button onClick={handleRefresh} className="btn-secondary" disabled={loading}>
            {loading ? `⏳ ${t('refreshing')}` : `🔄 ${t('refresh')}`}
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {jobs.length === 0 ? (
        <div className="no-history">
          <p>📭 {t('noHistory')}</p>
          <p className="help-text">{t('noHistoryHint')}</p>
        </div>
      ) : (
        <div className="jobs-table">
          {jobs.map(job => (
            <div key={job.id} className="job-row">
              <div className="job-main">
                <div className="job-info">
                  <div className="job-title">
                    <strong>📄 {job.filename}</strong>
                    <span 
                      className="job-status-badge" 
                      style={{ backgroundColor: getStatusColor(job.status) }}
                    >
                      {job.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="job-details-grid">
                    <div className="detail-item">
                      <span className="detail-label">{t('languages')}:</span>
                      <span>{job.source_language} → {job.target_language}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">{t('api')}:</span>
                      <span>{job.api_provider}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">{t('format')}:</span>
                      <span>{job.output_format.toUpperCase()}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">{t('started')}:</span>
                      <span>{formatDate(job.created_at)}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="job-progress">
                    <div className="progress-bar-small">
                      <div 
                        className="progress-fill-small"
                        style={{ 
                          width: `${(job.completed_chunks / job.total_chunks * 100) || 0}%`,
                          backgroundColor: getStatusColor(job.status)
                        }}
                      />
                    </div>
                    <span className="progress-text">
                      {job.completed_chunks} / {job.total_chunks} {t('chunks')} 
                      ({Math.round((job.completed_chunks / job.total_chunks) * 100) || 0}%)
                      {job.failed_chunks > 0 && (
                        <span className="failed-count"> • {job.failed_chunks} {t('failed')}</span>
                      )}
                    </span>
                  </div>

                  {/* Output Path */}
                  {job.status === 'completed' && getOutputPath(job) && (
                    <div className="output-path">
                      <span className="detail-label">📁 {t('output')}:</span>
                      <code>{getOutputPath(job)}</code>
                      <button 
                        onClick={() => openDirectory(getOutputPath(job))}
                        className="btn-small btn-info"
                        title={t('openDirectory')}
                      >
                        📂 {t('openDirectory')}
                      </button>
                    </div>
                  )}

                  {/* Error Message */}
                  {job.error_message && (
                    <div className="job-error">
                      <strong>❌ {t('error')}:</strong> {job.error_message}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="job-actions-vertical">
                  {canGenerateDocument(job) && job.status !== 'completed' && (
                    <button 
                      onClick={() => handleGenerateDocument(job.id)}
                      className="btn-small btn-success"
                      disabled={generatingDocument === job.id}
                      title={t('generateDocument')}
                    >
                      {generatingDocument === job.id ? `⏳ ${t('generating')}` : `📄 ${t('generateDocument')}`}
                    </button>
                  )}

                  {/* Partial document download - show when there are completed chunks but not all are done */}
                  {job.completed_chunks > 0 && job.completed_chunks < job.total_chunks && (
                    <button 
                      onClick={() => handleGeneratePartialDocument(job.id)}
                      className="btn-small btn-info"
                      disabled={generatingDocument === job.id}
                      title={t('downloadPartial') || `Download partial document (${job.completed_chunks}/${job.total_chunks} chunks completed)`}
                    >
                      {generatingDocument === job.id ? `⏳ ${t('generating')}` : `📄 ${t('downloadPartial') || 'Download Partial'} (${job.completed_chunks}/${job.total_chunks})`}
                    </button>
                  )}

                  {job.status === 'completed' && (
                    <button 
                      onClick={() => handleDownload(job.id)}
                      className="btn-small btn-success"
                      title={t('download')}
                    >
                      ⬇️ {t('download')}
                    </button>
                  )}

                  {(job.status === 'failed' || job.status === 'partial') && (
                    <>
                      <button 
                        onClick={() => openRetryModal(job, false)}
                        className="btn-small btn-warning"
                        disabled={retryingJob === job.id || job.failed_chunks === 0}
                        title={job.failed_chunks > 0 ? `${t('retryFailed')} (${job.failed_chunks} ${t('chunks')})` : t('noFailedChunks') || 'No failed chunks to retry'}
                      >
                        {retryingJob === job.id ? '⏳' : '🔄'} {t('retryFailed')} {job.failed_chunks > 0 && `(${job.failed_chunks})`}
                      </button>
                      <button 
                        onClick={() => openRetryModal(job, true)}
                        className="btn-small btn-info"
                        disabled={retryingJob === job.id}
                        title={t('retryAll')}
                      >
                        {retryingJob === job.id ? '⏳' : '🔁'} {t('retryAll')}
                      </button>
                    </>
                  )}

                  {job.status === 'translating' && (
                    <>
                      <button 
                        onClick={() => handlePause(job.id)}
                        className="btn-small btn-warning"
                        title={t('pauseTranslation') || 'Pause Translation'}
                      >
                        ⏸️ {t('pause') || 'Pause'}
                      </button>
                    </>
                  )}
                  
                  {job.status === 'paused' && (
                    <>
                      <button 
                        onClick={() => openPauseSettingsModal(job)}
                        className="btn-small btn-info"
                        title={t('changeSettings') || 'Change Settings'}
                      >
                        ⚙️ {t('settings') || 'Settings'}
                      </button>
                      <button 
                        onClick={() => {
                          const apiKey = settings[`${job.api_provider}_api_key`] || '';
                          const apiOptions = {};
                          if (job.api_provider === 'openai' || job.api_provider === 'chatgpt') {
                            apiOptions.model = settings.openai_model || 'gpt-3.5-turbo';
                          }
                          handleResume(job.id, apiKey, apiOptions, job.api_provider);
                        }}
                        className="btn-small btn-success"
                        title={t('resumeTranslation') || 'Resume Translation'}
                      >
                        ▶️ {t('resume') || 'Resume'}
                      </button>
                    </>
                  )}

                  <button 
                    onClick={() => toggleJobExpand(job.id)}
                    className="btn-small btn-info"
                    title={expandedJob === job.id ? t('hideDetails') : t('showDetails')}
                  >
                    {expandedJob === job.id ? `🔼 ${t('hideDetails')}` : `🔽 ${t('showDetails')}`}
                  </button>

                  <button 
                    onClick={() => handleDelete(job.id)}
                    className="btn-small btn-danger"
                    title={t('deleteJob')}
                  >
                    🗑️ {t('deleteJob')}
                  </button>
                </div>
              </div>

                  {/* Real-time Processing Info */}
                  {expandedJob === job.id && job.status === 'translating' && processingStats[job.id] && (
                    <div className="processing-info-card">
                      <div className="processing-header">
                        <span className="processing-icon">📊</span>
                        <strong>{t('liveProcessing') || 'Live Processing Status'}</strong>
                      </div>
                      <div className="processing-stats">
                        {processingStats[job.id].currentChunk && (
                          <div className="stat-item">
                            <span className="stat-label">🔄 {t('currentChunk') || 'Current'}:</span>
                            <span className="stat-value">#{processingStats[job.id].currentChunk}</span>
                          </div>
                        )}
                        <div className="stat-item">
                          <span className="stat-label">✅ {t('completed')}:</span>
                          <span className="stat-value">{processingStats[job.id].completed} / {processingStats[job.id].totalChunks}</span>
                        </div>
                        {processingStats[job.id].pending > 0 && (
                          <div className="stat-item">
                            <span className="stat-label">⏳ {t('pending')}:</span>
                            <span className="stat-value">{processingStats[job.id].pending}</span>
                          </div>
                        )}
                        {processingStats[job.id].rate > 0 && (
                          <div className="stat-item">
                            <span className="stat-label">⚡ {t('speed') || 'Speed'}:</span>
                            <span className="stat-value">{processingStats[job.id].rate} {t('chunksPerMinute') || 'chunks/min'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Chunk Details */}
              {expandedJob === job.id && (
                <div className="chunks-details">
                  <div className="chunks-header">
                    <h4>📦 {t('translationChunks')} ({job.total_chunks} {t('totalChunks')})</h4>
                    <div className="chunk-filters">
                      <label className="filter-checkbox">
                        <input
                          type="checkbox"
                          checked={filterFailedOnly && chunkStatusFilter === 'all'}
                          onChange={(e) => {
                            setFilterFailedOnly(e.target.checked);
                            if (e.target.checked) {
                              setChunkStatusFilter('failed');
                            } else {
                              setChunkStatusFilter('all');
                            }
                          }}
                        />
                        {t('showOnlyFailed')}
                      </label>
                      <select
                        value={chunkStatusFilter}
                        onChange={(e) => {
                          setChunkStatusFilter(e.target.value);
                          setFilterFailedOnly(e.target.value === 'failed');
                        }}
                        className="chunk-status-filter"
                      >
                        <option value="all">{t('allStatuses')}</option>
                        <option value="pending">{t('pending')}</option>
                        <option value="translating">{t('translating')}</option>
                        <option value="completed">{t('completed')}</option>
                        <option value="failed">{t('failed')}</option>
                      </select>
                    </div>
                  </div>
                  {!jobChunks[job.id] ? (
                    <p className="loading-message">{t('loadingChunks')}</p>
                  ) : (
                    <div className="chunks-grid">
                      {(chunkStatusFilter === 'all'
                        ? jobChunks[job.id]
                        : jobChunks[job.id].filter(chunk => chunk.status === chunkStatusFilter)
                      ).map(chunk => (
                        <div 
                          key={chunk.id} 
                          className="chunk-item"
                          style={{ borderLeftColor: getChunkStatusColor(chunk.status) }}
                        >
                          <div className="chunk-header">
                            <span 
                              className="chunk-status-icon"
                              style={{ color: getChunkStatusColor(chunk.status) }}
                            >
                              {getChunkStatusIcon(chunk.status)}
                            </span>
                            <strong>Chunk #{chunk.chunk_index + 1}</strong>
                            <span 
                              className="chunk-status-badge"
                              style={{ backgroundColor: getChunkStatusColor(chunk.status) }}
                            >
                              {chunk.status.toUpperCase()}
                            </span>
                          </div>
                          <div className="chunk-preview">
                            <div className="chunk-text">
                              <label>Source:</label>
                              <p>{chunk.source_text?.substring(0, 100)}...</p>
                            </div>
                            {chunk.translated_text && (
                              <div className="chunk-text">
                                <label>Translation:</label>
                                <p>{chunk.translated_text.substring(0, 100)}...</p>
                              </div>
                            )}
                            {chunk.error_message && (
                              <div className="chunk-error">
                                <strong>Error:</strong> {chunk.error_message}
                              </div>
                            )}
                          </div>
                          {chunk.retry_count > 0 && (
                            <div className="chunk-retry-count">
                              <span>Retries: {chunk.retry_count}</span>
                              {chunk.next_retry_at && job.status !== 'paused' && (
                                <span className="next-retry-time">
                                  • Next retry: {formatRetryTime(chunk.next_retry_at)}
                                </span>
                              )}
                              {chunk.next_retry_at && job.status === 'paused' && (
                                <span className="next-retry-time" style={{ color: '#6c757d' }}>
                                  • Retry paused
                                </span>
                              )}
                            </div>
                          )}
                          {chunk.status === 'failed' && chunk.next_retry_at && job.status !== 'paused' && (
                            <div className="chunk-retry-info">
                              ⏰ {t('nextRetry')}: <strong>{formatRetryTime(chunk.next_retry_at)}</strong>
                              {formatRetryTime(chunk.next_retry_at) === t('retryNow') && (
                                <span style={{ marginLeft: '0.5rem', color: '#28a745' }}>🔄 {t('retrying')}...</span>
                              )}
                            </div>
                          )}
                          {chunk.status === 'failed' && job.status === 'paused' && (
                            <div className="chunk-retry-info" style={{ color: '#6c757d' }}>
                              ⏸️ {t('paused')} - {t('retryPaused') || 'Retry paused while job is paused'}
                            </div>
                          )}
                          {chunk.status === 'pending' && (() => {
                            const estimatedMs = calculateEstimatedTime(chunk, jobChunks[job.id] || [], job);
                            const stats = processingStats[job.id];
                            const allChunks = jobChunks[job.id] || [];
                            const queuePosition = allChunks.filter(c => 
                              (c.status === 'pending' || c.status === 'translating') && 
                              c.chunk_index < chunk.chunk_index
                            ).length;
                            const isFailedRetry = chunk.retry_count > 0;
                            const hasRetryTime = chunk.next_retry_at;
                            
                            return (
                              <div className="chunk-pending-info">
                                <div className="pending-header">
                                  <span className="pending-icon">⏳</span>
                                  <strong>
                                    {isFailedRetry ? `${t('pending')} (${t('retry')} #${chunk.retry_count})` : t('pending')}
                                  </strong>
                                </div>
                                {estimatedMs && estimatedMs > 0 && (
                                  <div className="pending-details">
                                    <div className="pending-time-row">
                                      <span className="pending-time">
                                        ⏰ {hasRetryTime ? (t('scheduledRetry') || 'Scheduled retry') : (t('estimatedTime') || 'Estimated')}: 
                                        <strong style={{ marginLeft: '0.25rem' }}>{formatEstimatedTime(estimatedMs)}</strong>
                                      </span>
                                      {hasRetryTime && (
                                        <span className="pending-retry-time" style={{ fontSize: '0.85em', color: '#6c757d' }}>
                                          ({new Date(chunk.next_retry_at).toLocaleTimeString()})
                                        </span>
                                      )}
                                    </div>
                                    {queuePosition > 0 && (
                                      <div className="pending-queue-row">
                                        <span className="pending-queue">
                                          📋 {t('queuePosition') || 'Queue'}: <strong>{queuePosition}</strong> {t('chunksAhead') || 'chunks ahead'}
                                        </span>
                                        {stats && stats.rate > 0 && (
                                          <span className="pending-queue-calc" style={{ fontSize: '0.85em', color: '#6c757d' }}>
                                            (≈{Math.ceil(queuePosition / stats.rate)} {t('minutes') || 'min'})
                                          </span>
                                        )}
                                      </div>
                                    )}
                                    {stats && stats.rate > 0 && (
                                      <div className="pending-rate-row">
                                        <span className="pending-rate">
                                          ⚡ {t('processingSpeed') || 'Speed'}: <strong>{stats.rate.toFixed(1)}</strong> {t('chunksPerMinute') || 'chunks/min'}
                                        </span>
                                      </div>
                                    )}
                                    {isFailedRetry && chunk.error_message && (
                                      <div className="pending-error-info" style={{ fontSize: '0.85em', color: '#dc3545', marginTop: '0.25rem' }}>
                                        ⚠️ {t('lastError') || 'Last error'}: {chunk.error_message.substring(0, 80)}...
                                      </div>
                                    )}
                                  </div>
                                )}
                                {(!estimatedMs || estimatedMs <= 0) && (
                                  <div className="pending-details">
                                    <span className="pending-time" style={{ color: '#28a745' }}>
                                      🔄 {t('processingNow') || 'Processing now...'}
                                    </span>
                                    {isFailedRetry && (
                                      <span style={{ marginLeft: '0.5rem', fontSize: '0.85em', color: '#6c757d' }}>
                                        ({t('retryAttempt') || 'Retry attempt'} #{chunk.retry_count})
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Clear All Modal */}
      {showClearAllModal && (
        <div className="modal-overlay" onClick={() => setShowClearAllModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>⚠️ {t('clearAllData')}</h3>
            <p>{t('clearAllWarning')}</p>
            <div className="modal-actions">
              <button 
                onClick={handleClearAll}
                className="btn-danger"
              >
                🗑️ {t('clearAllConfirm')}
              </button>
              <button 
                onClick={() => setShowClearAllModal(false)}
                className="btn-secondary"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pause Settings Modal */}
      {showPauseSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowPauseSettingsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>⚙️ {t('changeTranslationSettings') || 'Change Translation Settings'}</h3>
            <p style={{ marginBottom: '20px', color: '#666' }}>
              {t('pauseSettingsNote') || 'Update translation settings. Changes will be applied when you resume the translation.'}
            </p>
            
            <div className="form-group">
              <label>{t('apiProvider') || 'API Provider'}</label>
              <select 
                value={pauseSettings.apiProvider}
                onChange={(e) => setPauseSettings({...pauseSettings, apiProvider: e.target.value, apiKey: ''})}
              >
                <option value="local">Local (LibreTranslate)</option>
                <option value="google">Google Translate (Free)</option>
                <option value="deepl">DeepL</option>
                <option value="openai">OpenAI</option>
                <option value="chatgpt">ChatGPT</option>
              </select>
            </div>

            {pauseSettings.apiProvider !== 'google' && pauseSettings.apiProvider !== 'local' && (
              <div className="form-group">
                <label>{t('apiKey') || 'API Key'}</label>
                <input
                  type="password"
                  value={pauseSettings.apiKey}
                  onChange={(e) => setPauseSettings({...pauseSettings, apiKey: e.target.value})}
                  placeholder={t('enterApiKey') || 'Enter API key'}
                />
              </div>
            )}

            {(pauseSettings.apiProvider === 'openai' || pauseSettings.apiProvider === 'chatgpt') && (
              <div className="form-group">
                <label>{t('openaiModel') || 'OpenAI Model'}</label>
                <select
                  value={pauseSettings.openaiModel}
                  onChange={(e) => setPauseSettings({...pauseSettings, openaiModel: e.target.value})}
                >
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="gpt-4o">GPT-4o</option>
                </select>
              </div>
            )}

            {/* DeepL API Options */}
            {pauseSettings.apiProvider === 'deepl' && (
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
                  <label><strong>{t('formality') || 'Translation Formality'}</strong></label>
                  <select 
                    value={pauseSettings.deeplOptions.formality} 
                    onChange={(e) => setPauseSettings({
                      ...pauseSettings, 
                      deeplOptions: {...pauseSettings.deeplOptions, formality: e.target.value}
                    })}
                  >
                    <option value="default">Default - Standard formality (recommended)</option>
                    <option value="less">Less Formal - Casual, natural tone</option>
                    <option value="more">More Formal - Professional, business tone</option>
                    <option value="prefer_less">Prefer Less Formal - Mostly casual</option>
                    <option value="prefer_more">Prefer More Formal - Mostly formal</option>
                  </select>
                </div>

                <div className="form-group">
                  <label><strong>{t('splitSentences') || 'Sentence Splitting'}</strong></label>
                  <select 
                    value={pauseSettings.deeplOptions.split_sentences} 
                    onChange={(e) => setPauseSettings({
                      ...pauseSettings, 
                      deeplOptions: {...pauseSettings.deeplOptions, split_sentences: e.target.value}
                    })}
                  >
                    <option value="1">Split on punctuation and newlines (Default)</option>
                    <option value="nonewlines">Split on punctuation only - Keep line breaks</option>
                    <option value="0">Don't split sentences - Keep as written</option>
                  </select>
                </div>

                <div className="form-group">
                  <label><strong>{t('preserveFormatting') || 'Preserve Original Formatting'}</strong></label>
                  <select 
                    value={pauseSettings.deeplOptions.preserve_formatting} 
                    onChange={(e) => setPauseSettings({
                      ...pauseSettings, 
                      deeplOptions: {...pauseSettings.deeplOptions, preserve_formatting: e.target.value}
                    })}
                  >
                    <option value="0">No - Normalize formatting (Default - Better quality)</option>
                    <option value="1">Yes - Keep original spacing and line breaks</option>
                  </select>
                </div>

                <div className="form-group">
                  <label><strong>{t('tagHandling') || 'HTML/XML Tag Handling'}</strong></label>
                  <select 
                    value={pauseSettings.deeplOptions.tag_handling} 
                    onChange={(e) => setPauseSettings({
                      ...pauseSettings, 
                      deeplOptions: {...pauseSettings.deeplOptions, tag_handling: e.target.value}
                    })}
                  >
                    <option value="html">HTML - For EPUB, DOCX, web content (Default)</option>
                    <option value="xml">XML - For XML documents only</option>
                  </select>
                </div>

                <div className="form-group">
                  <label><strong>{t('ignoreTags') || 'Tags to Skip (Don\'t Translate)'}</strong></label>
                  <input
                    type="text"
                    value={pauseSettings.deeplOptions.ignore_tags}
                    onChange={(e) => setPauseSettings({
                      ...pauseSettings, 
                      deeplOptions: {...pauseSettings.deeplOptions, ignore_tags: e.target.value}
                    })}
                    placeholder="code,pre,script,style"
                    style={{ width: '100%' }}
                  />
                  <small style={{ color: '#666', display: 'block', marginTop: '5px' }}>
                    Comma-separated tag names (e.g., code,pre,script,style)
                  </small>
                </div>
              </div>
            )}

            <div className="form-group">
              <label>{t('chunkSize') || 'Chunk Size'} ({t('characters') || 'characters'})</label>
              <input
                type="number"
                value={pauseSettings.chunkSize}
                onChange={(e) => setPauseSettings({...pauseSettings, chunkSize: parseInt(e.target.value) || 3000})}
                min="1000"
                max="10000"
                step="500"
              />
              <small style={{ color: '#666', display: 'block', marginTop: '5px' }}>
                {t('chunkSizeNote') || 'Note: Changing chunk size will not affect already processed chunks'}
              </small>
            </div>

            <div className="modal-actions">
              <button onClick={handleUpdatePauseSettings} className="btn-primary">
                💾 {t('saveSettings') || 'Save Settings'}
              </button>
              <button onClick={() => setShowPauseSettingsModal(false)} className="btn-secondary">
                {t('cancel') || 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Retry Modal */}
      {showRetryModal && (
        <div className="modal-overlay" onClick={() => setShowRetryModal(false)}>
          <div className="modal-content retry-modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              {retryOptions.fromBeginning ? '🔁 Retry Translation from Beginning' : '🔄 Retry Failed Chunks'}
            </h3>
            
            <p className="retry-info">
              {retryOptions.fromBeginning 
                ? 'This will re-translate the entire document from scratch.' 
                : 'This will only retry the chunks that failed.'}
            </p>

            <div className="retry-form">
              <div className="form-group">
                <label>Translation API</label>
                <select 
                  value={retryOptions.provider} 
                  onChange={(e) => setRetryOptions({...retryOptions, provider: e.target.value, apiKey: ''})}
                >
                <option value="local">Local (LibreTranslate)</option>
                  <option value="google">Google Translate (Free)</option>
                  <option value="deepl">DeepL</option>
                  <option value="openai">OpenAI</option>
                  <option value="chatgpt">ChatGPT</option>
                </select>
                <p className="help-text">
                  💡 Change API if the previous one hit rate limits
                </p>
              </div>

              {retryOptions.provider !== 'google' && retryOptions.provider !== 'local' && (
                <div className="form-group">
                  <label>API Key</label>
                  <input
                    type="password"
                    value={retryOptions.apiKey}
                    onChange={(e) => setRetryOptions({...retryOptions, apiKey: e.target.value})}
                    placeholder="Enter API key"
                  />
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button onClick={handleRetry} className="btn-primary">
                {retryOptions.fromBeginning ? '🔁 Retry All' : '🔄 Retry Failed'}
              </button>
              <button onClick={() => setShowRetryModal(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HistoryTab;


